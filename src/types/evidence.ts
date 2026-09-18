import { FailureReason } from './delivery';

export interface RawGPSPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy: number; // in meters (GPS horizontal accuracy)
  timestamp: number; // Unix epoch ms
  speed?: number | null; // meters per second
  heading?: number | null;
}

export type CallStatus = 'completed' | 'no_answer' | 'busy' | 'failed' | 'not_attempted';

export interface CallEvidence {
  attempted: boolean;
  timestamp?: string;
  durationSeconds: number;
  status: CallStatus;
  recipientPhone: string;
  simulated: boolean;
  telephonyCallId?: string;
}

export type VideoConsentStatus = 
  | 'not_requested'
  | 'requested'
  | 'granted'
  | 'denied'
  | 'timed_out';

export interface VideoEvidence {
  consentRequested: boolean;
  consentGiven: boolean;
  consentStatus: VideoConsentStatus;
  consentTimestamp?: string;
  videoUri?: string;
  durationSeconds?: number;
  silent: boolean;
}

export interface AttemptSubmissionPayload {
  deliveryId: string;
  driverId: string;
  failureReason: FailureReason;
  failureNotes?: string;
  submissionTimestamp: string;
  rawGpsBreadcrumbs: RawGPSPoint[];
  currentGpsPoint: RawGPSPoint;
  callEvidence: CallEvidence;
  videoEvidence: VideoEvidence;
  isSimulatedDemo: boolean;
  simulationPresetId?: string;
}
