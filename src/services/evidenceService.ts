import { CallEvidence, VideoEvidence, VideoConsentStatus } from '../types/evidence';

export class EvidenceService {
  /**
   * Simulates a telephony call attempt to customer
   */
  static simulateCall(
    recipientPhone: string,
    durationSeconds: number = 20,
    status: 'completed' | 'no_answer' = 'completed'
  ): CallEvidence {
    return {
      attempted: true,
      timestamp: new Date().toISOString(),
      durationSeconds,
      status,
      recipientPhone,
      simulated: true,
      telephonyCallId: `CALL-TW-${Date.now().toString(36).toUpperCase()}`,
    };
  }

  /**
   * Initial blank call evidence
   */
  static createEmptyCallEvidence(recipientPhone: string = ''): CallEvidence {
    return {
      attempted: false,
      durationSeconds: 0,
      status: 'not_attempted',
      recipientPhone,
      simulated: true,
    };
  }

  /**
   * Initial blank video evidence
   */
  static createEmptyVideoEvidence(): VideoEvidence {
    return {
      consentRequested: false,
      consentGiven: false,
      consentStatus: 'not_requested',
      silent: true,
    };
  }

  /**
   * Creates a requested consent record
   */
  static requestVideoConsent(): VideoEvidence {
    return {
      consentRequested: true,
      consentGiven: false,
      consentStatus: 'requested',
      consentTimestamp: new Date().toISOString(),
      silent: true,
    };
  }

  /**
   * Resolves consent status
   */
  static resolveConsent(
    status: 'granted' | 'denied' | 'timed_out',
    videoUri?: string,
    durationSeconds?: number
  ): VideoEvidence {
    return {
      consentRequested: true,
      consentGiven: status === 'granted',
      consentStatus: status,
      consentTimestamp: new Date().toISOString(),
      videoUri,
      durationSeconds,
      silent: true,
    };
  }
}
