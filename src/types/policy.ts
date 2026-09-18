import { ResidenceCategory } from './delivery';

export type VerificationDecisionType = 'VERIFIED' | 'REJECTED' | 'REVIEW';

export interface VerificationFacts {
  deliveryId: string;
  residenceCategory: ResidenceCategory;
  distanceMeters: number;
  requiredDistanceMeters: number; // default 50
  dwellSeconds: number;
  requiredDwellSeconds: number; // 90 | 120 | 150
  callAttempted: boolean;
  callDurationSeconds: number;
  videoConsentRequested: boolean;
  videoConsentGiven: boolean;
  videoEvidence: boolean;
  gpsAccuracyMeters: number;
  anomalyFlags: string[];
}

export interface VerificationRuleCheck {
  id: string;
  name: string;
  category: 'PROXIMITY' | 'DWELL' | 'TELEPHONY' | 'VIDEO' | 'TELEMETRY_INTEGRITY';
  passed: boolean;
  actualValue: string | number | boolean;
  expectedValue: string | number | boolean;
  isHardRequirement: boolean;
  explanation: string;
}

export interface VerificationResult {
  decision: VerificationDecisionType;
  deliveryId: string;
  timestamp: string;
  facts: VerificationFacts;
  ruleChecks: VerificationRuleCheck[];
  primaryReason: string;
  detailedExplanation: string;
  auditRecordId: string;
  evaluationEngine: string; // e.g. 'Saboot-ZeroTrust-PolicyEngine-v1.0 (AWS Lambda/Cedar-equiv)'
}

export interface AuditRecord {
  auditId: string;
  deliveryId: string;
  driverId: string;
  event: 'ATTEMPT_VERIFIED' | 'ATTEMPT_REJECTED' | 'ATTEMPT_SENT_TO_REVIEW';
  factsSnapshot: VerificationFacts;
  decision: VerificationDecisionType;
  primaryReason: string;
  timestamp: string;
  tamperProofHash: string;
}
