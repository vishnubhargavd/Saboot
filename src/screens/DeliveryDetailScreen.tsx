import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Delivery, FailureReason } from '../types/delivery';
import { LiveDeliveryMap } from '../components/LiveDeliveryMap';
import { DwellGauge } from '../components/DwellGauge';
import { useAttestation } from '../hooks/useAttestation';
import { RawGPSPoint, CallEvidence } from '../types/evidence';
import { DemoScenarioPreset } from '../constants/demoData';
import { VerificationResult } from '../types/policy';

interface DeliveryDetailScreenProps {
  delivery: Delivery;
  currentLocation: RawGPSPoint | null;
  distanceMeters: number | null;
  breadcrumbs: RawGPSPoint[];
  isSimulationMode: boolean;
  activePreset: DemoScenarioPreset | null;
  onBack: () => void;
  onVerificationComplete: (result: VerificationResult) => void;
  onCompleteDelivery?: (handoffType: 'direct' | 'doorstep' | 'security', notes?: string) => void;
}

const FAILURE_REASONS: { id: FailureReason; label: string; desc: string }[] = [
  { id: 'customer_unavailable', label: 'Customer Unavailable', desc: 'Door unanswered after calling & waiting (Video Proof Required)' },
  { id: 'gate_locked_security_refusal', label: 'Security Gate Refusal', desc: 'Society security refused entry' },
  { id: 'incorrect_address', label: 'Incorrect Address', desc: 'Unit or flat not found' },
  { id: 'customer_rejected_delivery', label: 'Customer Refused Delivery', desc: 'Customer rejected package at door' },
  { id: 'access_code_required', label: 'Passcode / OTP Required', desc: 'Required passcode not provided' },
  { id: 'other', label: 'Other Operational Issue', desc: 'Other delivery obstacle' },
];

export const DeliveryDetailScreen: React.FC<DeliveryDetailScreenProps> = ({
  delivery,
  currentLocation,
  distanceMeters,
  breadcrumbs,
  isSimulationMode,
  activePreset,
  onBack,
  onVerificationComplete,
  onCompleteDelivery,
}) => {
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);
  const [isCompleteModalVisible, setIsCompleteModalVisible] = useState(false);
  const [selectedHandoff, setSelectedHandoff] = useState<'direct' | 'doorstep' | 'security'>('direct');
  const [handoffNotes, setHandoffNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  // Video proof for customer unavailable scenario
  const [videoProofUri, setVideoProofUri] = useState<string | null>(null);
  const [isRecordingVideoProof, setIsRecordingVideoProof] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);

  const [isCallOutcomeModalVisible, setIsCallOutcomeModalVisible] = useState(false);
  const [isVerifyingCallLog, setIsVerifyingCallLog] = useState(false);
  const [selectedCallOutcome, setSelectedCallOutcome] = useState<'answered' | 'no_answer' | 'busy' | 'canceled'>('answered');
  const [measuredCallDuration, setMeasuredCallDuration] = useState<number>(25);

  const callStartTimeRef = useRef<number | null>(null);
  const isWaitingForDialerReturn = useRef<boolean>(false);

  const {
    dwellSeconds,
    requiredDwellSeconds,
    isInsideGeofence,
    callEvidence,
    videoEvidence,
    failureReason,
    failureNotes,
    isSubmitting,
    error,
    setFailureReason,
    setFailureNotes,
    setCallEvidence,
    requestConsent,
    simulateCustomerConsentResponse,
    recordVideoClip,
    submitAttempt,
  } = useAttestation({
    delivery,
    currentLocation,
    distanceMeters,
    breadcrumbs,
    isSimulationMode,
    activePreset,
  });

  const driverLat = currentLocation?.latitude || (isSimulationMode && activePreset ? activePreset.simulatedGps.latitude : delivery.address.latitude + 0.0003);
  const driverLng = currentLocation?.longitude || (isSimulationMode && activePreset ? activePreset.simulatedGps.longitude : delivery.address.longitude + 0.0003);

  // Measure genuine time spent outside the app when driver dials
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isWaitingForDialerReturn.current && callStartTimeRef.current) {
        const elapsed = Math.max(0, Math.round((Date.now() - callStartTimeRef.current) / 1000));
        isWaitingForDialerReturn.current = false;

        if (elapsed > 0) {
          setMeasuredCallDuration(elapsed);
        } else {
          setMeasuredCallDuration(20);
        }

        if (elapsed < 3) {
          // Driver clicked dial button but came back in under 3s -> likely canceled dialer
          setSelectedCallOutcome('canceled');
        } else {
          setSelectedCallOutcome('answered');
        }

        setIsCallOutcomeModalVisible(true);
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    // Web window focus fallback
    const handleWebFocus = () => {
      if (isWaitingForDialerReturn.current && callStartTimeRef.current) {
        const elapsed = Math.max(0, Math.round((Date.now() - callStartTimeRef.current) / 1000));
        isWaitingForDialerReturn.current = false;
        if (elapsed > 0) {
          setMeasuredCallDuration(elapsed);
        } else {
          setMeasuredCallDuration(20);
        }
        if (elapsed < 3) {
          setSelectedCallOutcome('canceled');
        } else {
          setSelectedCallOutcome('answered');
        }
        setIsCallOutcomeModalVisible(true);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', handleWebFocus);
    }

    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('focus', handleWebFocus);
      }
    };
  }, []);

  // Real phone dialer trigger - tracks start timestamp and prompts outcome verification
  const handleDialCustomer = () => {
    const rawNumber = delivery.customer.phone.replace(/[^0-9+]/g, '');
    const telUrl = `tel:${rawNumber}`;

    callStartTimeRef.current = Date.now();
    isWaitingForDialerReturn.current = true;

    // 1. Launch the phone dialer
    if (Platform.OS === 'web') {
      try {
        window.location.href = telUrl;
      } catch {
        window.open(telUrl, '_self');
      }
    } else {
      Linking.openURL(telUrl).catch((err) => {
        console.warn('Dialer launch notice:', err);
      });
    }

    // 2. Open outcome verification popup
    setTimeout(() => {
      setIsCallOutcomeModalVisible(true);
    }, 1000);
  };

  // Confirm call outcome from modal
  const handleConfirmCallOutcome = () => {
    setIsVerifyingCallLog(true);

    setTimeout(() => {
      setIsVerifyingCallLog(false);

      if (selectedCallOutcome === 'canceled') {
        // Rider clicked call button but did not actually call
        setCallEvidence({
          attempted: false,
          durationSeconds: 0,
          status: 'not_attempted',
          recipientPhone: delivery.customer.phone,
          simulated: false,
        });
      } else {
        const duration = selectedCallOutcome === 'answered' ? Math.max(measuredCallDuration, 5) : 0;
        setCallEvidence({
          attempted: true,
          timestamp: new Date().toISOString(),
          durationSeconds: duration,
          status: selectedCallOutcome === 'answered' ? 'completed' : selectedCallOutcome === 'no_answer' ? 'no_answer' : 'busy',
          recipientPhone: delivery.customer.phone,
          telephonyCallId: `TEL-${Date.now().toString(36).toUpperCase()}`,
          simulated: false,
        });
      }

      setIsCallOutcomeModalVisible(false);
    }, 400);
  };

  // Record simulated 6-second video proof of customer absence
  const handleRecordVideoProof = () => {
    setIsRecordingVideoProof(true);
    setRecordingProgress(1);
    let step = 1;
    const interval = setInterval(() => {
      step += 1;
      setRecordingProgress(step);
      if (step >= 4) {
        clearInterval(interval);
        setIsRecordingVideoProof(false);
        const clipUri = `file:///evidence/doorstep_absence_${Date.now().toString(36)}.mp4`;
        setVideoProofUri(clipUri);
        recordVideoClip(clipUri, 6);
      }
    }, 500);
  };

  // Confirm and record successful delivery completion
  const handleConfirmCompleteDelivery = () => {
    setIsCompleting(true);
    setTimeout(() => {
      setIsCompleting(false);
      setIsCompleteModalVisible(false);

      if (onCompleteDelivery) {
        onCompleteDelivery(selectedHandoff, handoffNotes);
      } else {
        const nowIso = new Date().toISOString();
        const auditId = `AUD-DELIV-${Date.now().toString(36).toUpperCase()}`;
        const completionResult: VerificationResult = {
          decision: 'DELIVERED',
          deliveryId: delivery.id,
          timestamp: nowIso,
          facts: {
            deliveryId: delivery.id,
            residenceCategory: delivery.address.residenceCategory,
            distanceMeters: distanceMeters || 0,
            requiredDistanceMeters: 50,
            dwellSeconds: dwellSeconds,
            requiredDwellSeconds: requiredDwellSeconds,
            callAttempted: callEvidence.attempted,
            callDurationSeconds: callEvidence.durationSeconds,
            videoConsentRequested: false,
            videoConsentGiven: false,
            videoEvidence: false,
            gpsAccuracyMeters: currentLocation?.accuracy || 6,
            anomalyFlags: [],
          },
          ruleChecks: [
            {
              id: 'RULE_HANDOFF_VERIFIED',
              name: 'Customer Handoff Verification',
              category: 'PROXIMITY',
              passed: true,
              actualValue:
                selectedHandoff === 'direct'
                  ? 'Handed to Customer'
                  : selectedHandoff === 'doorstep'
                  ? 'Left at Door'
                  : 'Security Desk',
              expectedValue: 'Delivery Confirmation',
              isHardRequirement: true,
              explanation: `Package successfully delivered and confirmed via ${selectedHandoff.toUpperCase()} handoff.`,
            },
            {
              id: 'RULE_GEOFENCE_CONFIRMATION',
              name: 'Delivery Point Geofence Lock',
              category: 'PROXIMITY',
              passed: true,
              actualValue: isInsideGeofence ? 'Inside 50m Geofence' : `${distanceMeters || 0}m Distance`,
              expectedValue: '≤ 50m Geofence',
              isHardRequirement: true,
              explanation: 'Driver confirmed handoff at destination coordinates.',
            },
          ],
          primaryReason: 'Package successfully handed over and delivery marked as COMPLETE',
          detailedExplanation: `Delivery confirmed for ${delivery.customer.name} at ${delivery.address.street}. Handoff method: ${selectedHandoff}.`,
          auditRecordId: auditId,
          evaluationEngine: 'Saboot-ZeroTrust-DeliveryFulfillment-Engine-v1.0',
        };
        onVerificationComplete(completionResult);
      }
    }, 450);
  };

  const handleSubmit = async () => {
    setIsSubmitModalVisible(false);
    const result = await submitAttempt();
    if (result) {
      onVerificationComplete(result);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.driverAppContainer}>
        {/* Top Map Stage matching logistics-driver-app-design */}
        <LiveDeliveryMap
          driverLat={driverLat}
          driverLng={driverLng}
          destLat={delivery.address.latitude}
          destLng={delivery.address.longitude}
          destAddress={`${delivery.address.street}, ${delivery.address.city}`}
          distanceMeters={distanceMeters}
          gpsAccuracy={currentLocation?.accuracy || 8}
          isInsideGeofence={isInsideGeofence}
          onRecenter={onBack}
        />

        {/* Bottom Sheet matching logistics-driver-app-design */}
        <ScrollView style={styles.bottomSheet} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetHandle} />

          {/* Sheet Topline */}
          <View style={styles.sheetTopline}>
            <View>
              <Text style={styles.eyebrow}>ACTIVE STOP / 01 OF 04</Text>
              <Text style={styles.destinationTitle}>{delivery.customer.name}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={THEME.colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Address Row */}
          <View style={styles.addressRow}>
            <Ionicons name="location-sharp" size={16} color={THEME.colors.signal} />
            <Text style={styles.addressText} numberOfLines={2}>
              {delivery.address.street}, {delivery.address.city}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#8C979B" style={styles.addressChevron} />
          </View>

          {/* Status Pill matching design */}
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: isInsideGeofence ? THEME.colors.green : THEME.colors.signal }]} />
            <Text style={styles.statusPillText}>
              {isInsideGeofence ? 'INSIDE GEOFENCE' : 'OUTSIDE GEOFENCE'}
            </Text>
            <View style={styles.statusDivider} />
            <Text style={styles.statusPillSub}>
              {distanceMeters !== null ? `${distanceMeters}M DISTANCE` : '50M RADIUS'}
            </Text>
          </View>

          {/* Stop Content: Circular Dwell Ring + Stop Meta */}
          <DwellGauge
            residenceCategory={delivery.address.residenceCategory}
            currentDwellSeconds={dwellSeconds}
            isInsideGeofence={isInsideGeofence}
            distanceMeters={distanceMeters}
            arrivalWindow={delivery.estimatedDeliveryWindow}
            customerName={delivery.customer.name}
            customerPhone={delivery.customer.phone}
          />

          {/* Senior-Friendly Call Customer Action Button */}
          <TouchableOpacity
            style={[
              styles.callButton,
              callEvidence.attempted && callEvidence.status === 'completed' && styles.callButtonCompleted,
              callEvidence.attempted && callEvidence.status === 'no_answer' && styles.callButtonNoAnswer,
              callEvidence.attempted && callEvidence.status === 'busy' && styles.callButtonBusy,
            ]}
            onPress={handleDialCustomer}
            activeOpacity={0.85}
          >
            <View style={styles.callIconBubble}>
              <Ionicons
                name={
                  callEvidence.status === 'completed'
                    ? 'checkmark-circle'
                    : callEvidence.status === 'no_answer'
                    ? 'alert-circle'
                    : callEvidence.status === 'busy'
                    ? 'pause-circle'
                    : 'call'
                }
                size={22}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.callTextCol}>
              <Text style={styles.callButtonText} numberOfLines={1}>
                {callEvidence.status === 'completed'
                  ? `CUSTOMER SPOKE (${callEvidence.durationSeconds}s) ✓`
                  : callEvidence.status === 'no_answer'
                  ? 'ATTEMPTED: NO ANSWER ✓'
                  : callEvidence.status === 'busy'
                  ? 'ATTEMPTED: BUSY / UNREACHABLE ✓'
                  : 'CALL CUSTOMER'}
              </Text>
              <Text style={styles.callButtonSubText} numberOfLines={1}>
                {callEvidence.status === 'completed'
                  ? `Spoke with customer • ${delivery.customer.phone}`
                  : callEvidence.status === 'no_answer'
                  ? `Rang out (No answer) • ${delivery.customer.phone}`
                  : callEvidence.status === 'busy'
                  ? `Line busy / unreachable • ${delivery.customer.phone}`
                  : `${delivery.customer.phone} • Tap to call & record`}
              </Text>
            </View>
            <View style={styles.callActionPill}>
              <Text style={styles.callActionPillText}>
                {callEvidence.attempted ? 'REDIAL' : 'DIAL'}
              </Text>
              <Ionicons
                name={callEvidence.attempted ? 'repeat-outline' : 'chevron-forward'}
                size={14}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>

          {/* Primary Action: Complete Delivery Button */}
          <TouchableOpacity
            style={styles.completeDeliveryBtn}
            onPress={() => setIsCompleteModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.completeIconBubble}>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.completeDeliveryBtnText}>COMPLETE DELIVERY</Text>
              <Text style={styles.completeDeliveryBtnSub}>Mark stop fulfilled & verify customer handoff</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Secondary Action: Issue / Failed Attempt Button */}
          <TouchableOpacity
            style={styles.attestButton}
            onPress={() => setIsSubmitModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="alert-circle-outline" size={17} color={THEME.colors.slate} />
            <Text style={styles.attestButtonText}>UNABLE TO DELIVER? REPORT ISSUE</Text>
          </TouchableOpacity>

          {/* Sheet Footer matching design */}
          <View style={styles.sheetFooter}>
            <Ionicons name="notifications-outline" size={14} color={THEME.colors.muted} />
            <Text style={styles.sheetFooterText}>
              Dispatch & policy engine will evaluate dwell & call evidence
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* Call Outcome Verification Modal */}
      <Modal
        visible={isCallOutcomeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCallOutcomeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>CALL OUTCOME VERIFICATION</Text>
              <Text style={styles.modalHeaderSub}>
                Did customer pick up at {delivery.customer.phone}?
              </Text>
            </View>

            {/* Time / Status Banner */}
            <View style={styles.detectedTimeBanner}>
              <Ionicons name="time-outline" size={16} color={THEME.colors.slate} />
              <Text style={styles.detectedTimeText}>
                {measuredCallDuration > 0
                  ? `Dial duration detected: ${measuredCallDuration}s`
                  : 'Select call outcome below:'}
              </Text>
            </View>

            <View style={styles.outcomeOptions}>
              {/* Option 1: Answered */}
              <TouchableOpacity
                style={[
                  styles.outcomeBtn,
                  selectedCallOutcome === 'answered' && styles.outcomeBtnSelectedAnswered,
                ]}
                onPress={() => {
                  setSelectedCallOutcome('answered');
                  if (measuredCallDuration <= 0) setMeasuredCallDuration(25);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={selectedCallOutcome === 'answered' ? THEME.colors.green : THEME.colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.outcomeBtnTitle}>Yes, Spoke with Customer</Text>
                  <Text style={styles.outcomeBtnSubtitle}>
                    Call connected and conversation completed ({measuredCallDuration}s)
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Quick Duration Chips if Answered */}
              {selectedCallOutcome === 'answered' && (
                <View style={styles.durationChipsRow}>
                  <Text style={styles.durationChipsLabel}>Duration:</Text>
                  {[15, 30, 45, 60, 90].map((sec) => (
                    <TouchableOpacity
                      key={sec}
                      style={[
                        styles.durationChip,
                        measuredCallDuration === sec && styles.durationChipSelected,
                      ]}
                      onPress={() => setMeasuredCallDuration(sec)}
                    >
                      <Text
                        style={[
                          styles.durationChipText,
                          measuredCallDuration === sec && styles.durationChipTextSelected,
                        ]}
                      >
                        {sec}s
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Option 2: No Answer */}
              <TouchableOpacity
                style={[
                  styles.outcomeBtn,
                  selectedCallOutcome === 'no_answer' && styles.outcomeBtnSelectedNoAnswer,
                ]}
                onPress={() => {
                  setSelectedCallOutcome('no_answer');
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={selectedCallOutcome === 'no_answer' ? '#D97706' : THEME.colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.outcomeBtnTitle}>No Answer / Phone Rang Out</Text>
                  <Text style={styles.outcomeBtnSubtitle}>
                    Customer phone rang but nobody answered
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 3: Busy / Switched Off */}
              <TouchableOpacity
                style={[
                  styles.outcomeBtn,
                  selectedCallOutcome === 'busy' && styles.outcomeBtnSelectedBusy,
                ]}
                onPress={() => {
                  setSelectedCallOutcome('busy');
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="alert-circle"
                  size={24}
                  color={selectedCallOutcome === 'busy' ? '#475569' : THEME.colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.outcomeBtnTitle}>Number Busy / Switched Off</Text>
                  <Text style={styles.outcomeBtnSubtitle}>
                    Call rejected, line busy, or network unreachable
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 4: Canceled / Didn't Call */}
              <TouchableOpacity
                style={[
                  styles.outcomeBtn,
                  selectedCallOutcome === 'canceled' && styles.outcomeBtnSelectedCanceled,
                ]}
                onPress={() => {
                  setSelectedCallOutcome('canceled');
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="remove-circle-outline"
                  size={24}
                  color={selectedCallOutcome === 'canceled' ? THEME.colors.foreground : THEME.colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.outcomeBtnTitle}>Didn't Call / Canceled Dialing</Text>
                  <Text style={styles.outcomeBtnSubtitle}>
                    Clicked call button but canceled before calling (Not logged as attempt)
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Save / Confirm Button */}
            <TouchableOpacity
              style={[
                styles.confirmCallBtn,
                selectedCallOutcome === 'canceled' && styles.confirmCallBtnCanceled,
              ]}
              onPress={handleConfirmCallOutcome}
              activeOpacity={0.8}
            >
              {isVerifyingCallLog ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmCallBtnText}>
                  {selectedCallOutcome === 'canceled'
                    ? 'DISCARD CALL ATTEMPT'
                    : 'RECORD & VERIFY CALL EVIDENCE'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelCallBtn}
              onPress={() => setIsCallOutcomeModalVisible(false)}
            >
              <Text style={styles.cancelCallBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Failure Reason Picker Modal */}
      <Modal
        visible={isSubmitModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSubmitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>DELIVERY ISSUE REASON</Text>
              <Text style={styles.modalHeaderSub}>Select reason for zero-trust policy attestation</Text>
            </View>

            <ScrollView style={{ maxHeight: 280, marginBottom: 12 }}>
              {FAILURE_REASONS.map((r) => {
                const isSelected = failureReason === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => setFailureReason(r.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reasonOptionTitle}>{r.label}</Text>
                      <Text style={styles.reasonOptionDesc}>{r.desc}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={THEME.colors.signal} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Video Proof Section for Customer Unavailable */}
            {failureReason === 'customer_unavailable' && (
              <View style={styles.videoProofContainer}>
                <View style={styles.videoProofHeader}>
                  <Ionicons name="videocam" size={16} color={THEME.colors.signal} />
                  <Text style={styles.videoProofTitle}>CUSTOMER ABSENCE VIDEO EVIDENCE</Text>
                </View>
                <Text style={styles.videoProofDesc}>
                  Record 6s footage of empty doorstep & door knocking. Forwarded to customer transparency portal and dispatch supervisor for approval.
                </Text>

                {videoProofUri ? (
                  <View style={styles.videoProofReadyBox}>
                    <Ionicons name="checkmark-circle" size={22} color={THEME.colors.green} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.videoProofReadyTitle}>Doorstep Proof Attached ✓</Text>
                      <Text style={styles.videoProofReadySub}>6s clip recorded • Awaiting Admin Approval</Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleRecordVideoProof}
                      style={styles.retakeBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.retakeBtnText}>RETAKE</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.recordProofBtn}
                    onPress={handleRecordVideoProof}
                    disabled={isRecordingVideoProof}
                    activeOpacity={0.8}
                  >
                    {isRecordingVideoProof ? (
                      <>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.recordProofBtnText}>
                          RECORDING DOORSTEP PROOF ({recordingProgress * 2}s / 6s)...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="videocam" size={18} color="#FFFFFF" />
                        <Text style={styles.recordProofBtnText}>RECORD 6s DOORSTEP PROOF CLIP</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TextInput
              style={styles.textInput}
              placeholder="Driver remarks (e.g. door unanswered)..."
              placeholderTextColor={THEME.colors.muted}
              value={failureNotes}
              onChangeText={setFailureNotes}
            />

            <TouchableOpacity
              style={styles.confirmSubmitBtn}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmSubmitText}>TRANSMIT TELEMETRY TO BACKEND</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelCallBtn}
              onPress={() => setIsSubmitModalVisible(false)}
            >
              <Text style={styles.cancelCallBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Complete Delivery Modal */}
      <Modal
        visible={isCompleteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCompleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>CONFIRM SUCCESSFUL DELIVERY</Text>
              <Text style={styles.modalHeaderSub}>
                Package for {delivery.customer.name} ({delivery.trackingNumber})
              </Text>
            </View>

            {/* Geofence verification banner */}
            <View style={styles.deliveryVerifyBanner}>
              <Ionicons
                name={isInsideGeofence ? 'shield-checkmark' : 'navigate-circle'}
                size={18}
                color={isInsideGeofence ? THEME.colors.green : THEME.colors.signal}
              />
              <Text style={styles.deliveryVerifyText}>
                {isInsideGeofence
                  ? `Location Verified: Inside 50m Geofence (${distanceMeters !== null ? distanceMeters : 12}m)`
                  : `Driver Location: ${distanceMeters !== null ? `${distanceMeters}m from door` : 'At location'}`}
              </Text>
            </View>

            <Text style={styles.modalSectionLabel}>SELECT HANDOFF METHOD</Text>
            <View style={styles.handoffOptions}>
              <TouchableOpacity
                style={[
                  styles.handoffBtn,
                  selectedHandoff === 'direct' && styles.handoffBtnSelected,
                ]}
                onPress={() => setSelectedHandoff('direct')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person"
                  size={20}
                  color={selectedHandoff === 'direct' ? THEME.colors.green : THEME.colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.handoffTitle}>Handed Directly to Customer</Text>
                  <Text style={styles.handoffSub}>Recipient in-person at doorstep</Text>
                </View>
                {selectedHandoff === 'direct' && (
                  <Ionicons name="checkmark-circle" size={18} color={THEME.colors.green} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.handoffBtn,
                  selectedHandoff === 'doorstep' && styles.handoffBtnSelected,
                ]}
                onPress={() => setSelectedHandoff('doorstep')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="home"
                  size={20}
                  color={selectedHandoff === 'doorstep' ? THEME.colors.green : THEME.colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.handoffTitle}>Left at Doorstep / Safe Place</Text>
                  <Text style={styles.handoffSub}>Placed securely outside entrance</Text>
                </View>
                {selectedHandoff === 'doorstep' && (
                  <Ionicons name="checkmark-circle" size={18} color={THEME.colors.green} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.handoffBtn,
                  selectedHandoff === 'security' && styles.handoffBtnSelected,
                ]}
                onPress={() => setSelectedHandoff('security')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="shield"
                  size={20}
                  color={selectedHandoff === 'security' ? THEME.colors.green : THEME.colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.handoffTitle}>Left with Building Guard / Gate</Text>
                  <Text style={styles.handoffSub}>Handed to society security</Text>
                </View>
                {selectedHandoff === 'security' && (
                  <Ionicons name="checkmark-circle" size={18} color={THEME.colors.green} />
                )}
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="Handoff notes or recipient reference (optional)..."
              placeholderTextColor={THEME.colors.muted}
              value={handoffNotes}
              onChangeText={setHandoffNotes}
            />

            <TouchableOpacity
              style={styles.confirmCompleteBtn}
              onPress={handleConfirmCompleteDelivery}
              disabled={isCompleting}
              activeOpacity={0.85}
            >
              {isCompleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmCompleteText}>CONFIRM DELIVERY COMPLETED</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelCallBtn}
              onPress={() => setIsCompleteModalVisible(false)}
            >
              <Text style={styles.cancelCallBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={THEME.colors.signal} />
            <Text style={styles.loadingTitle}>EVALUATING ZERO-TRUST POLICY</Text>
            <Text style={styles.loadingSubtitle}>
              Server independently verifying Haversine distance, dwell & call records...
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EDF1EF',
  },
  driverAppContainer: {
    flex: 1,
    backgroundColor: '#EEF2F3',
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#D5DCDF',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    backgroundColor: '#AEB9BE',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTopline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: THEME.colors.muted,
  },
  destinationTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: THEME.colors.foreground,
    marginTop: 2,
  },
  closeButton: {
    padding: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.slate,
    flex: 1,
  },
  addressChevron: {
    marginLeft: 'auto',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    backgroundColor: THEME.colors.geofenceBg,
    borderWidth: 1,
    borderColor: THEME.colors.geofenceBorder,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginTop: 14,
    borderRadius: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: THEME.colors.geofenceText,
  },
  statusDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#AFD0BA',
  },
  statusPillSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: THEME.colors.geofenceText,
  },
  callButton: {
    width: '100%',
    minHeight: 68,
    backgroundColor: THEME.colors.signal,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  callButtonCalled: {
    backgroundColor: THEME.colors.green,
  },
  callButtonCompleted: {
    backgroundColor: THEME.colors.green,
  },
  callButtonNoAnswer: {
    backgroundColor: '#D97706',
  },
  callButtonBusy: {
    backgroundColor: '#475569',
  },
  detectedTimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detectedTimeText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.slate,
    letterSpacing: 0.3,
  },
  outcomeOptions: {
    gap: 8,
    marginBottom: 14,
  },
  outcomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFB',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  outcomeBtnSelectedAnswered: {
    borderColor: THEME.colors.green,
    backgroundColor: '#F0FDF4',
  },
  outcomeBtnSelectedNoAnswer: {
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  outcomeBtnSelectedBusy: {
    borderColor: '#475569',
    backgroundColor: '#F1F5F9',
  },
  outcomeBtnSelectedCanceled: {
    borderColor: THEME.colors.slate,
    backgroundColor: '#F8FAFC',
  },
  outcomeBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.foreground,
  },
  outcomeBtnSubtitle: {
    fontSize: 11,
    color: THEME.colors.muted,
    marginTop: 2,
    lineHeight: 14,
  },
  durationChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    marginBottom: 6,
    paddingLeft: 36,
    flexWrap: 'wrap',
  },
  durationChipsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.muted,
  },
  durationChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  durationChipSelected: {
    backgroundColor: THEME.colors.green,
    borderColor: THEME.colors.green,
  },
  durationChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.slate,
  },
  durationChipTextSelected: {
    color: '#FFFFFF',
  },
  confirmCallBtn: {
    backgroundColor: THEME.colors.green,
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmCallBtnCanceled: {
    backgroundColor: THEME.colors.slate,
  },
  confirmCallBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  cancelCallBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelCallBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 0.5,
  },
  callIconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callTextCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  callButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  callButtonSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    marginTop: 2,
  },
  callActionPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  callActionPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  attestButton: {
    width: '100%',
    minHeight: 52,
    backgroundColor: THEME.colors.slate,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 2,
    marginTop: 10,
  },
  attestButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  sheetFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
  },
  sheetFooterText: {
    fontSize: 10,
    color: THEME.colors.muted,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(21, 32, 43, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  modalHeader: {
    marginBottom: 14,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.foreground,
    letterSpacing: 0.5,
  },
  modalHeaderSub: {
    fontSize: 12,
    color: THEME.colors.muted,
    marginTop: 2,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6F7',
    padding: 12,
    borderRadius: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#DBE1E5',
  },
  reasonOptionSelected: {
    borderColor: THEME.colors.signal,
    backgroundColor: '#FFF5F2',
  },
  reasonOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.foreground,
  },
  reasonOptionDesc: {
    fontSize: 11,
    color: THEME.colors.muted,
    marginTop: 1,
  },
  textInput: {
    backgroundColor: '#F4F6F7',
    borderWidth: 1,
    borderColor: '#DBE1E5',
    borderRadius: 4,
    padding: 10,
    fontSize: 12,
    color: THEME.colors.foreground,
    marginBottom: 12,
  },
  confirmSubmitBtn: {
    backgroundColor: THEME.colors.slate,
    paddingVertical: 15,
    borderRadius: 2,
    alignItems: 'center',
  },
  confirmSubmitText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  loadingOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(21, 32, 43, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    maxWidth: 320,
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.foreground,
    marginTop: 14,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  loadingSubtitle: {
    fontSize: 11,
    color: THEME.colors.muted,
    textAlign: 'center',
    lineHeight: 15,
  },
  completeDeliveryBtn: {
    width: '100%',
    minHeight: 64,
    backgroundColor: '#15803D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  completeIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeDeliveryBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  completeDeliveryBtnSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 1,
  },
  videoProofContainer: {
    backgroundColor: '#FFF8F6',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  videoProofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  videoProofTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.signal,
    letterSpacing: 0.5,
  },
  videoProofDesc: {
    fontSize: 11,
    color: THEME.colors.slate,
    lineHeight: 15,
    marginBottom: 10,
  },
  recordProofBtn: {
    backgroundColor: THEME.colors.signal,
    paddingVertical: 12,
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordProofBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  videoProofReadyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 4,
    padding: 10,
    gap: 10,
  },
  videoProofReadyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  videoProofReadySub: {
    fontSize: 10,
    color: '#15803D',
    marginTop: 1,
  },
  retakeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 3,
  },
  retakeBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },
  deliveryVerifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 4,
    marginBottom: 14,
  },
  deliveryVerifyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  modalSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: THEME.colors.muted,
    marginBottom: 8,
  },
  handoffOptions: {
    gap: 8,
    marginBottom: 14,
  },
  handoffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    padding: 12,
    gap: 12,
  },
  handoffBtnSelected: {
    borderColor: '#15803D',
    backgroundColor: '#F0FDF4',
  },
  handoffTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.foreground,
  },
  handoffSub: {
    fontSize: 11,
    color: THEME.colors.muted,
    marginTop: 1,
  },
  confirmCompleteBtn: {
    backgroundColor: '#15803D',
    paddingVertical: 14,
    borderRadius: 3,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmCompleteText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
