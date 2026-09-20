import { useState, useEffect, useRef, useCallback } from 'react';
import { Delivery, FailureReason } from '../types/delivery';
import { RawGPSPoint, CallEvidence, VideoEvidence, AttemptSubmissionPayload } from '../types/evidence';
import { VerificationResult } from '../types/policy';
import { submitDeliveryAttemptToBackend } from '../services/apiService';
import { EvidenceService } from '../services/evidenceService';
import { DemoScenarioPreset } from '../constants/demoData';
import { DWELL_POLICY_CONFIG, PROXIMITY_POLICY, getDwellRule } from '../constants/dwellPolicy';

interface UseAttestationProps {
  delivery: Delivery;
  currentLocation: RawGPSPoint | null;
  distanceMeters: number | null;
  breadcrumbs: RawGPSPoint[];
  isSimulationMode: boolean;
  activePreset: DemoScenarioPreset | null;
}

export function useAttestation({
  delivery,
  currentLocation,
  distanceMeters,
  breadcrumbs,
  isSimulationMode,
  activePreset,
}: UseAttestationProps) {
  // Dwell time accumulator
  const [dwellSeconds, setDwellSeconds] = useState<number>(0);
  const [isInsideGeofence, setIsInsideGeofence] = useState<boolean>(false);

  // Call evidence
  const [callEvidence, setCallEvidence] = useState<CallEvidence>(
    EvidenceService.createEmptyCallEvidence(delivery.customer.phone)
  );
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);

  // Video evidence & consent
  const [videoEvidence, setVideoEvidence] = useState<VideoEvidence>(
    EvidenceService.createEmptyVideoEvidence()
  );
  const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);

  // Failure submission
  const [failureReason, setFailureReason] = useState<FailureReason>('customer_unavailable');
  const [failureNotes, setFailureNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dwellIntervalRef = useRef<any>(null);
  const callIntervalRef = useRef<any>(null);

  const requiredDwellSeconds = getDwellRule(delivery.address?.residenceCategory).requiredDwellSeconds;

  // Sync preset if present
  useEffect(() => {
    if (isSimulationMode && activePreset) {
      setDwellSeconds(activePreset.dwellSeconds);
      if (activePreset.callAttempted) {
        setCallEvidence({
          attempted: true,
          durationSeconds: activePreset.callDurationSeconds,
          status: 'completed',
          recipientPhone: delivery.customer.phone,
          simulated: true,
          timestamp: new Date().toISOString(),
        });
      } else {
        setCallEvidence(EvidenceService.createEmptyCallEvidence(delivery.customer.phone));
      }

      if (activePreset.videoConsentStatus === 'granted') {
        setVideoEvidence({
          consentRequested: true,
          consentGiven: true,
          consentStatus: 'granted',
          consentTimestamp: new Date().toISOString(),
          videoUri: 'file:///simulated/evidence_clip_01.mp4',
          durationSeconds: 8,
          silent: true,
        });
      } else if (activePreset.videoConsentStatus === 'timed_out') {
        setVideoEvidence({
          consentRequested: true,
          consentGiven: false,
          consentStatus: 'timed_out',
          consentTimestamp: new Date().toISOString(),
          silent: true,
        });
      } else {
        setVideoEvidence(EvidenceService.createEmptyVideoEvidence());
      }
    }
  }, [isSimulationMode, activePreset, delivery.customer.phone]);

  // Real-time Dwell accumulator when in geofence
  useEffect(() => {
    if (isSimulationMode) return; // Handled by preset or simulator

    const inGeofence = distanceMeters !== null && distanceMeters <= PROXIMITY_POLICY.maxAllowedDistanceMeters;
    setIsInsideGeofence(inGeofence);

    if (inGeofence) {
      dwellIntervalRef.current = setInterval(() => {
        setDwellSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (dwellIntervalRef.current) {
        clearInterval(dwellIntervalRef.current);
        dwellIntervalRef.current = null;
      }
    }

    return () => {
      if (dwellIntervalRef.current) {
        clearInterval(dwellIntervalRef.current);
      }
    };
  }, [distanceMeters, isSimulationMode]);

  // Active call timer
  useEffect(() => {
    if (isCalling) {
      callIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
        callIntervalRef.current = null;
      }
    }

    return () => {
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
      }
    };
  }, [isCalling]);

  // Call triggers
  const startCall = useCallback(() => {
    setIsCalling(true);
    setCallDuration(0);
  }, []);

  const endCall = useCallback(() => {
    setIsCalling(false);
    const finalDuration = Math.max(callDuration, 15);
    setCallEvidence({
      attempted: true,
      timestamp: new Date().toISOString(),
      durationSeconds: finalDuration,
      status: 'completed',
      recipientPhone: delivery.customer.phone,
      simulated: true,
      telephonyCallId: `CALL-${Date.now().toString(36).toUpperCase()}`,
    });
  }, [callDuration, delivery.customer.phone]);

  // Video consent triggers
  const requestConsent = useCallback(() => {
    setVideoEvidence(EvidenceService.requestVideoConsent());
  }, []);

  const simulateCustomerConsentResponse = useCallback((status: 'granted' | 'denied' | 'timed_out') => {
    setVideoEvidence(EvidenceService.resolveConsent(status, status === 'granted' ? 'file:///evidence/clip_101.mp4' : undefined, 6));
  }, []);

  const recordVideoClip = useCallback((uri: string, durationSec: number = 6) => {
    setVideoEvidence((prev) => ({
      ...prev,
      videoUri: uri,
      durationSeconds: durationSec,
      silent: true,
    }));
  }, []);

  // Submit attempt to backend
  const submitAttempt = useCallback(async () => {
    if (!currentLocation) {
      setError('Waiting for GPS lock before submission...');
      return null;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: AttemptSubmissionPayload = {
      deliveryId: delivery.id,
      driverId: delivery.assignedDriverId,
      failureReason,
      failureNotes,
      submissionTimestamp: new Date().toISOString(),
      rawGpsBreadcrumbs: breadcrumbs.length > 0 ? breadcrumbs : [currentLocation],
      currentGpsPoint: currentLocation,
      callEvidence,
      videoEvidence,
      isSimulatedDemo: isSimulationMode,
      simulationPresetId: isSimulationMode && activePreset ? activePreset.id : undefined,
    };

    try {
      const result = await submitDeliveryAttemptToBackend(payload);
      setVerificationResult(result);
      setIsSubmitting(false);
      return result;
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || 'Failed to communicate with verification backend');
      return null;
    }
  }, [
    currentLocation,
    delivery.id,
    delivery.assignedDriverId,
    failureReason,
    failureNotes,
    breadcrumbs,
    callEvidence,
    videoEvidence,
    isSimulationMode,
    activePreset,
  ]);

  const resetAttestation = useCallback(() => {
    setDwellSeconds(0);
    setCallEvidence(EvidenceService.createEmptyCallEvidence(delivery.customer.phone));
    setVideoEvidence(EvidenceService.createEmptyVideoEvidence());
    setVerificationResult(null);
    setError(null);
    setIsSubmitting(false);
  }, [delivery.customer.phone]);

  return {
    dwellSeconds,
    requiredDwellSeconds,
    isInsideGeofence,
    callEvidence,
    isCalling,
    callDuration,
    videoEvidence,
    isConsentModalOpen,
    isRecordingVideo,
    failureReason,
    failureNotes,
    isSubmitting,
    verificationResult,
    error,
    setCallEvidence,
    setFailureReason,
    setFailureNotes,
    setIsConsentModalOpen,
    setIsRecordingVideo,
    startCall,
    endCall,
    requestConsent,
    simulateCustomerConsentResponse,
    recordVideoClip,
    submitAttempt,
    resetAttestation,
  };
}
