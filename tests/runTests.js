/**
 * Saboot Zero-Trust Verification Engine & Anti-Tampering Test Suite
 */

function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const DWELL_POLICY = {
  individual_house: 90,
  apartment: 120,
  gated_society: 150,
};

function serverEvaluateZeroTrustAttempt({
  deliveryAddress,
  rawGpsBreadcrumbs,
  currentGpsPoint,
  callEvidence,
  videoEvidence,
  clientAssertedDistance,
  clientAssertedDwell,
  clientAssertedDecision,
}) {
  // CRITICAL SECURITY RULE: Ignore any client-asserted metrics
  // 1. Calculate true server distance
  const serverDistanceMeters = calculateHaversineDistanceMeters(
    currentGpsPoint.latitude,
    currentGpsPoint.longitude,
    deliveryAddress.latitude,
    deliveryAddress.longitude
  );

  // 2. Calculate true server dwell from raw breadcrumbs inside 50m
  const pointsInGeofence = (rawGpsBreadcrumbs || []).filter((pt) => {
    const d = calculateHaversineDistanceMeters(
      pt.latitude,
      pt.longitude,
      deliveryAddress.latitude,
      deliveryAddress.longitude
    );
    return d <= 50;
  });

  let serverDwellSeconds = 0;
  if (pointsInGeofence.length >= 2) {
    const first = pointsInGeofence[0].timestamp;
    const last = pointsInGeofence[pointsInGeofence.length - 1].timestamp;
    serverDwellSeconds = Math.max(0, Math.round((last - first) / 1000));
  }

  const requiredDwell = DWELL_POLICY[deliveryAddress.residenceCategory] || 90;
  const proximityPassed = serverDistanceMeters <= 50;
  const dwellPassed = serverDwellSeconds >= requiredDwell;
  const callPassed = Boolean(callEvidence?.attempted);
  const accuracyPassed = (currentGpsPoint.accuracy || 10) <= 30;

  let decision;
  if (proximityPassed && dwellPassed && callPassed && accuracyPassed) {
    decision = 'VERIFIED';
  } else if (!proximityPassed && serverDistanceMeters > 500) {
    decision = 'REJECTED';
  } else if (!callPassed && !dwellPassed) {
    decision = 'REJECTED';
  } else {
    decision = 'REVIEW';
  }

  return {
    decision,
    serverDistanceMeters,
    serverDwellSeconds,
    requiredDwell,
    proximityPassed,
    dwellPassed,
    callPassed,
    accuracyPassed,
    clientTamperAttemptDetected:
      (clientAssertedDistance !== undefined && Math.abs(clientAssertedDistance - serverDistanceMeters) > 20) ||
      (clientAssertedDwell !== undefined && clientAssertedDwell !== serverDwellSeconds) ||
      (clientAssertedDecision !== undefined && clientAssertedDecision !== decision),
  };
}

// -------------------------------------------------------------
// Test Execution
// -------------------------------------------------------------
let passedCount = 0;
let totalCount = 0;

function assert(description, condition) {
  totalCount++;
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
  }
}

console.log('\n======================================================');
console.log('🛡️  SABOOT ZERO-TRUST VERIFICATION TEST SUITE');
console.log('======================================================\n');

// 1. Haversine Calculation Tests
console.log('📌 1. Telemetry Math & Proximity Calculations');
const dist1 = calculateHaversineDistanceMeters(12.8715, 77.6534, 12.8717, 77.6536);
assert('Haversine computes close proximity (~31m)', dist1 >= 25 && dist1 <= 40);

const dist2 = calculateHaversineDistanceMeters(12.8715, 77.6534, 12.9000, 77.6534);
assert('Haversine computes remote distance (~3168m)', dist2 >= 3000 && dist2 <= 3300);

// 2. Hackathon Scenario A: Genuine Attempt in Gated Society
console.log('\n📌 2. Hackathon Scenario A: Genuine Attempt (Gated Society)');
const targetAddrA = { latitude: 12.8715, longitude: 77.6534, residenceCategory: 'gated_society' };
const breadcrumbsA = [
  { latitude: 12.8716, longitude: 77.6535, accuracy: 6, timestamp: 1000000 },
  { latitude: 12.8716, longitude: 77.6535, accuracy: 6, timestamp: 1000000 + 158 * 1000 },
];
const resultA = serverEvaluateZeroTrustAttempt({
  deliveryAddress: targetAddrA,
  rawGpsBreadcrumbs: breadcrumbsA,
  currentGpsPoint: { latitude: 12.8716, longitude: 77.6535, accuracy: 6, timestamp: 1000000 + 158 * 1000 },
  callEvidence: { attempted: true, durationSeconds: 24 },
  videoEvidence: { consentGiven: true },
});
assert('Scenario A resolves to VERIFIED', resultA.decision === 'VERIFIED');
assert('Scenario A satisfies 150s dwell for gated society', resultA.serverDwellSeconds >= 150);

// 3. Hackathon Scenario B: Falsified Remote Claim
console.log('\n📌 3. Hackathon Scenario B: Insufficient / Remote Attempt');
const resultB = serverEvaluateZeroTrustAttempt({
  deliveryAddress: targetAddrA,
  rawGpsBreadcrumbs: [{ latitude: 12.9000, longitude: 77.6534, accuracy: 8, timestamp: 1000000 }],
  currentGpsPoint: { latitude: 12.9000, longitude: 77.6534, accuracy: 8, timestamp: 1000000 + 8 * 1000 },
  callEvidence: { attempted: false },
  videoEvidence: { consentGiven: false },
});
assert('Scenario B resolves to REJECTED', resultB.decision === 'REJECTED');
assert('Scenario B detects distance > 500m (3.1km+)', resultB.serverDistanceMeters > 3000);

// 4. Hackathon Scenario C: Degraded GPS Uncertainty
console.log('\n📌 4. Hackathon Scenario C: Ambiguous Telemetry');
const resultC = serverEvaluateZeroTrustAttempt({
  deliveryAddress: targetAddrA,
  rawGpsBreadcrumbs: [
    { latitude: 12.8716, longitude: 77.6535, accuracy: 68, timestamp: 1000000 },
    { latitude: 12.8716, longitude: 77.6535, accuracy: 68, timestamp: 1000000 + 152 * 1000 },
  ],
  currentGpsPoint: { latitude: 12.8716, longitude: 77.6535, accuracy: 68, timestamp: 1000000 + 152 * 1000 },
  callEvidence: { attempted: true, durationSeconds: 3 },
  videoEvidence: { consentGiven: false },
});
assert('Scenario C resolves to REVIEW due to GPS accuracy uncertainty (68m)', resultC.decision === 'REVIEW');

// 5. Anti-Tampering & Security Property Verification
console.log('\n📌 5. Security Property: Client Cannot Manipulate Verification Result');

// Test 5.1: Client asserts distance = 20m, but actual GPS is 3.2km away
const tamper1 = serverEvaluateZeroTrustAttempt({
  deliveryAddress: targetAddrA,
  rawGpsBreadcrumbs: [{ latitude: 12.9000, longitude: 77.6534, accuracy: 8, timestamp: 1000000 }],
  currentGpsPoint: { latitude: 12.9000, longitude: 77.6534, accuracy: 8, timestamp: 1000000 + 8 * 1000 },
  callEvidence: { attempted: false },
  clientAssertedDistance: 20, // SPOOF ATTEMPT
});
assert('Client says distance=20m, actual GPS=3.2km -> Server evaluates REJECTED', tamper1.decision === 'REJECTED');
assert('Tamper attempt detected on distance spoofing', tamper1.clientTamperAttemptDetected === true);

// Test 5.2: Client asserts dwell = 150s, but actual timestamps indicate 8s
const tamper2 = serverEvaluateZeroTrustAttempt({
  deliveryAddress: targetAddrA,
  rawGpsBreadcrumbs: [
    { latitude: 12.8716, longitude: 77.6535, accuracy: 8, timestamp: 1000000 },
    { latitude: 12.8716, longitude: 77.6535, accuracy: 8, timestamp: 1000000 + 8 * 1000 },
  ],
  currentGpsPoint: { latitude: 12.8716, longitude: 77.6535, accuracy: 8, timestamp: 1000000 + 8 * 1000 },
  callEvidence: { attempted: true },
  clientAssertedDwell: 150, // SPOOF ATTEMPT
});
assert('Client says dwell=150s, actual GPS history=8s -> Server computes 8s and pushes to REVIEW', tamper2.serverDwellSeconds === 8 && tamper2.decision === 'REVIEW');
assert('Tamper attempt detected on dwell spoofing', tamper2.clientTamperAttemptDetected === true);

// Test 5.3: Client asserts decision = VERIFIED, but call evidence is missing
const tamper3 = serverEvaluateZeroTrustAttempt({
  deliveryAddress: targetAddrA,
  rawGpsBreadcrumbs: [
    { latitude: 12.8716, longitude: 77.6535, accuracy: 8, timestamp: 1000000 },
    { latitude: 12.8716, longitude: 77.6535, accuracy: 8, timestamp: 1000000 + 160 * 1000 },
  ],
  currentGpsPoint: { latitude: 12.8716, longitude: 77.6535, accuracy: 8, timestamp: 1000000 + 160 * 1000 },
  callEvidence: { attempted: false },
  clientAssertedDecision: 'VERIFIED', // SPOOF ATTEMPT
});
assert('Client claims VERIFIED, but no call made -> Server forces REVIEW/REJECTED', tamper3.decision !== 'VERIFIED');
assert('Tamper attempt detected on decision spoofing', tamper3.clientTamperAttemptDetected === true);

// Summary
console.log('\n------------------------------------------------------');
console.log(`Results: ${passedCount} / ${totalCount} tests passed.`);
console.log('------------------------------------------------------\n');

if (passedCount === totalCount) {
  process.exit(0);
} else {
  process.exit(1);
}
