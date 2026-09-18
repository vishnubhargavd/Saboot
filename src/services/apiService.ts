import { AttemptSubmissionPayload } from '../types/evidence';
import { VerificationResult, VerificationFacts, VerificationRuleCheck, AuditRecord } from '../types/policy';
import { DWELL_POLICY_CONFIG, PROXIMITY_POLICY } from '../constants/dwellPolicy';
import { calculateHaversineDistanceMeters } from './locationService';
import { INITIAL_DELIVERIES, DEMO_SCENARIO_PRESETS } from '../constants/demoData';

/**
 * Saboot Zero-Trust Verification API Service
 * 
 * NOTE: In production, this sends the raw payload to AWS API Gateway / Lambda.
 * The server computes distance, dwell, and evaluates policy. The mobile app NEVER
 * asserts the authoritative decision.
 */
export async function submitDeliveryAttemptToBackend(
  payload: AttemptSubmissionPayload
): Promise<VerificationResult> {
  // Simulate network latency (400ms - 800ms)
  await new Promise((resolve) => setTimeout(resolve, 600));

  // 1. Fetch official delivery record from DB
  const delivery = INITIAL_DELIVERIES.find((d) => d.id === payload.deliveryId) || INITIAL_DELIVERIES[0];
  const residenceCategory = delivery.address.residenceCategory;
  const requiredDwell = DWELL_POLICY_CONFIG[residenceCategory].requiredDwellSeconds;

  // 2. Server-side computation of distance
  let computedDistanceMeters: number;
  let computedDwellSeconds: number;
  let computedGpsAccuracy: number = payload.currentGpsPoint.accuracy;
  const anomalyFlags: string[] = [];

  if (payload.isSimulatedDemo && payload.simulationPresetId) {
    const preset = DEMO_SCENARIO_PRESETS.find((p) => p.id === payload.simulationPresetId);
    if (preset) {
      computedDistanceMeters = preset.simulatedGps.distanceMeters;
      computedDwellSeconds = preset.dwellSeconds;
      computedGpsAccuracy = preset.simulatedGps.accuracy;
      anomalyFlags.push(...preset.anomalyFlags);
    } else {
      computedDistanceMeters = calculateHaversineDistanceMeters(
        payload.currentGpsPoint.latitude,
        payload.currentGpsPoint.longitude,
        delivery.address.latitude,
        delivery.address.longitude
      );
      computedDwellSeconds = 120;
    }
  } else {
    // Real server calculation from raw GPS breadcrumbs
    computedDistanceMeters = calculateHaversineDistanceMeters(
      payload.currentGpsPoint.latitude,
      payload.currentGpsPoint.longitude,
      delivery.address.latitude,
      delivery.address.longitude
    );

    // Calculate dwell within 50m geofence from raw breadcrumbs
    const pointsInsideGeofence = (payload.rawGpsBreadcrumbs || []).filter((pt) => {
      const dist = calculateHaversineDistanceMeters(
        pt.latitude,
        pt.longitude,
        delivery.address.latitude,
        delivery.address.longitude
      );
      return dist <= PROXIMITY_POLICY.maxAllowedDistanceMeters + PROXIMITY_POLICY.gpsJitterToleranceMeters;
    });

    if (pointsInsideGeofence.length >= 2) {
      const firstTime = pointsInsideGeofence[0].timestamp;
      const lastTime = pointsInsideGeofence[pointsInsideGeofence.length - 1].timestamp;
      computedDwellSeconds = Math.max(0, Math.round((lastTime - firstTime) / 1000));
    } else {
      computedDwellSeconds = computedDistanceMeters <= 50 ? 45 : 0;
    }

    if (computedGpsAccuracy > PROXIMITY_POLICY.maxAcceptableGpsAccuracyMeters) {
      anomalyFlags.push('POOR_GPS_ACCURACY_UNCERTAINTY');
    }
  }

  // 3. Build Server Facts Object (Immutable)
  const isCustomerUnavailable = payload.failureReason === 'customer_unavailable';
  const hasVideoProof = Boolean(payload.videoEvidence?.videoUri || payload.videoEvidence?.consentGiven);

  const facts: VerificationFacts = {
    deliveryId: payload.deliveryId,
    residenceCategory,
    distanceMeters: computedDistanceMeters,
    requiredDistanceMeters: PROXIMITY_POLICY.maxAllowedDistanceMeters,
    dwellSeconds: computedDwellSeconds,
    requiredDwellSeconds: requiredDwell,
    callAttempted: payload.callEvidence.attempted,
    callDurationSeconds: payload.callEvidence.durationSeconds,
    videoConsentRequested: payload.videoEvidence.consentRequested,
    videoConsentGiven: payload.videoEvidence.consentGiven,
    videoEvidence: hasVideoProof,
    videoUri: payload.videoEvidence?.videoUri,
    gpsAccuracyMeters: computedGpsAccuracy,
    anomalyFlags,
    requiresAdminApproval: isCustomerUnavailable && hasVideoProof,
  };

  // 4. Deterministic Rule Evaluation
  const ruleChecks: VerificationRuleCheck[] = [
    {
      id: 'RULE_PROXIMITY_50M',
      name: 'Geofence Proximity Check',
      category: 'PROXIMITY',
      passed: facts.distanceMeters <= facts.requiredDistanceMeters,
      actualValue: `${facts.distanceMeters}m`,
      expectedValue: `≤ ${facts.requiredDistanceMeters}m`,
      isHardRequirement: true,
      explanation:
        facts.distanceMeters <= facts.requiredDistanceMeters
          ? `Driver location verified within ${facts.distanceMeters}m of customer door.`
          : `Driver is ${facts.distanceMeters}m away (exceeds ${facts.requiredDistanceMeters}m geofence limit).`,
    },
    {
      id: 'RULE_CATEGORY_DWELL',
      name: `${DWELL_POLICY_CONFIG[residenceCategory].displayName} Dwell Threshold`,
      category: 'DWELL',
      passed: facts.dwellSeconds >= facts.requiredDwellSeconds,
      actualValue: `${facts.dwellSeconds}s`,
      expectedValue: `≥ ${facts.requiredDwellSeconds}s`,
      isHardRequirement: true,
      explanation:
        facts.dwellSeconds >= facts.requiredDwellSeconds
          ? `Dwell time of ${facts.dwellSeconds}s satisfies the ${facts.requiredDwellSeconds}s requirement for ${DWELL_POLICY_CONFIG[residenceCategory].displayName}.`
          : `Recorded dwell time (${facts.dwellSeconds}s) is below required ${facts.requiredDwellSeconds}s for ${DWELL_POLICY_CONFIG[residenceCategory].displayName}.`,
    },
    {
      id: 'RULE_TELEPHONY_ATTEMPT',
      name: 'Customer Call Attempt Evidence',
      category: 'TELEPHONY',
      passed: facts.callAttempted,
      actualValue: facts.callAttempted ? `Attempted (${facts.callDurationSeconds}s)` : 'No Call Made',
      expectedValue: 'Call Attempted',
      isHardRequirement: true,
      explanation: facts.callAttempted
        ? `Telephony attempt logged with duration of ${facts.callDurationSeconds}s.`
        : 'Zero telephony attempt logged to customer contact number.',
    },
    {
      id: 'RULE_TELEMETRY_ACCURACY',
      name: 'GPS Telemetry Signal Quality',
      category: 'TELEMETRY_INTEGRITY',
      passed: facts.gpsAccuracyMeters <= PROXIMITY_POLICY.maxAcceptableGpsAccuracyMeters,
      actualValue: `±${facts.gpsAccuracyMeters}m`,
      expectedValue: `≤ ±${PROXIMITY_POLICY.maxAcceptableGpsAccuracyMeters}m`,
      isHardRequirement: false, // Ambiguity pushes to REVIEW
      explanation:
        facts.gpsAccuracyMeters <= PROXIMITY_POLICY.maxAcceptableGpsAccuracyMeters
          ? 'High-confidence GPS horizontal accuracy.'
          : `GPS horizontal uncertainty (±${facts.gpsAccuracyMeters}m) introduces location ambiguity.`,
    },
    {
      id: 'RULE_VIDEO_CORROBORATION',
      name: isCustomerUnavailable ? 'Customer Absence Video Proof' : 'Consented Video Corroboration',
      category: 'VIDEO',
      passed: facts.videoEvidence,
      actualValue: hasVideoProof ? 'Video Proof Attached (6s Doorstep)' : facts.videoConsentRequested ? 'Consent Pending' : 'Not Provided',
      expectedValue: isCustomerUnavailable ? 'Required for Unavailable Claim' : 'Optional Corroboration',
      isHardRequirement: isCustomerUnavailable,
      explanation: hasVideoProof
        ? 'Doorstep absence video proof captured. Dispatched to customer transparency portal and dispatch supervisor queue.'
        : 'No video evidence provided to substantiate customer absence claim.',
    },
  ];

  // 5. Decision Resolution Engine
  let decision: 'VERIFIED' | 'REJECTED' | 'REVIEW';
  let primaryReason: string;
  let detailedExplanation: string;
  let requiresAdminApproval = false;
  let adminApprovalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;

  const proximityPassed = ruleChecks.find((r) => r.id === 'RULE_PROXIMITY_50M')?.passed;
  const dwellPassed = ruleChecks.find((r) => r.id === 'RULE_CATEGORY_DWELL')?.passed;
  const callPassed = ruleChecks.find((r) => r.id === 'RULE_TELEPHONY_ATTEMPT')?.passed;
  const accuracyPassed = ruleChecks.find((r) => r.id === 'RULE_TELEMETRY_ACCURACY')?.passed;

  if (isCustomerUnavailable && hasVideoProof) {
    decision = 'REVIEW';
    requiresAdminApproval = true;
    adminApprovalStatus = 'PENDING';
    primaryReason = 'Customer Unavailable claim with video evidence pending admin approval';
    detailedExplanation = `Driver uploaded doorstep video proof demonstrating customer was unreachable after calling (${facts.callDurationSeconds}s) and dwelling ${facts.dwellSeconds}s. Dispatched to customer view and supervisor queue for approval.`;
  } else if (proximityPassed && dwellPassed && callPassed && accuracyPassed) {
    decision = 'VERIFIED';
    primaryReason = 'All mandatory physical and telephony attempt criteria verified';
    detailedExplanation = `Driver location (${facts.distanceMeters}m), residence dwell duration (${facts.dwellSeconds}s / ${facts.requiredDwellSeconds}s for ${DWELL_POLICY_CONFIG[residenceCategory].displayName}), and customer call attempt (${facts.callDurationSeconds}s) were independently validated.`;
  } else if (!proximityPassed && facts.distanceMeters > 500) {
    decision = 'REJECTED';
    primaryReason = `Attempt location rejected: Driver was ${facts.distanceMeters}m away from delivery address`;
    detailedExplanation = `Zero-trust evaluation failed. The driver reported failure from ${facts.distanceMeters}m away (limit: ${facts.requiredDistanceMeters}m). Insufficient physical presence detected.`;
  } else if (!callPassed && !dwellPassed) {
    decision = 'REJECTED';
    primaryReason = 'Attempt rejected: Insufficient dwell time and zero call attempts made';
    detailedExplanation = `Neither physical dwell requirement (${facts.dwellSeconds}s vs ${facts.requiredDwellSeconds}s required) nor telephony contact criteria were met.`;
  } else {
    decision = 'REVIEW';
    if (!accuracyPassed) {
      primaryReason = `Sent to Review: GPS horizontal uncertainty (±${facts.gpsAccuracyMeters}m) requires ops inspection`;
      detailedExplanation = 'Telemetry accuracy was degraded during the attempt window, creating boundary ambiguity.';
    } else if (!dwellPassed) {
      primaryReason = `Sent to Review: Borderline dwell time (${facts.dwellSeconds}s vs ${facts.requiredDwellSeconds}s required)`;
      detailedExplanation = `Driver reached geofence (${facts.distanceMeters}m) and called customer, but departed before the mandatory ${facts.requiredDwellSeconds}s dwell window for ${DWELL_POLICY_CONFIG[residenceCategory].displayName}.`;
    } else {
      primaryReason = 'Sent to Review: Borderline evidence profile requires supervisor confirmation';
      detailedExplanation = 'One or more corroborating verification parameters were inconclusive.';
    }
  }

  // 6. Generate Immutable Audit Record
  const auditId = `AUD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const timestamp = new Date().toISOString();

  return {
    decision,
    deliveryId: payload.deliveryId,
    timestamp,
    facts,
    ruleChecks,
    primaryReason,
    detailedExplanation,
    auditRecordId: auditId,
    evaluationEngine: 'Saboot-Deterministic-PolicyEngine-v1.0 (AWS Lambda/Cedar-equiv)',
    requiresAdminApproval,
    adminApprovalStatus,
    videoProofUri: payload.videoEvidence?.videoUri,
  };
}
