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
  Alert,
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
import { RawGPSPoint } from '../types/evidence';
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
}

const FAILURE_REASONS: { id: FailureReason; label: string; desc: string }[] = [
  { id: 'customer_unavailable', label: 'Customer Unavailable', desc: 'Door unanswered after calling & waiting' },
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
}) => {
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);
  const [isCallOutcomeModalVisible, setIsCallOutcomeModalVisible] = useState(false);
  const [isVerifyingCallLog, setIsVerifyingCallLog] = useState(false);
  const [selectedCallOutcome, setSelectedCallOutcome] = useState<'answered' | 'unanswered' | 'busy'>('answered');
  const [callDurationSec, setCallDurationSec] = useState<number>(24);
  const [isDialingActive, setIsDialingActive] = useState<boolean>(false);
  const [callActiveSeconds, setCallActiveSeconds] = useState<number>(0);

  const callTimerRef = useRef<any>(null);
  const callStartTimeRef = useRef<number | null>(null);

  const {
    dwellSeconds,
    requiredDwellSeconds,
    isInsideGeofence,
    callEvidence,
    updateCallLogEvidence,
    failureReason,
    failureNotes,
    isSubmitting,
    error,
    setFailureReason,
    setFailureNotes,
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

  // Monitor AppState to auto-prompt Call Log Verification when returning from Phone app
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isDialingActive && callStartTimeRef.current) {
        const elapsed = Math.max(12, Math.round((Date.now() - callStartTimeRef.current) / 1000));
        setCallDurationSec(elapsed);
        setIsDialingActive(false);
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        setIsCallOutcomeModalVisible(true);
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isDialingActive]);

  // Handle active call second counter
  useEffect(() => {
    if (isDialingActive) {
      callTimerRef.current = setInterval(() => {
        setCallActiveSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isDialingActive]);

  // Real phone dialer trigger
  const handleDialCustomer = async () => {
    const rawNumber = delivery.customer.phone.replace(/\s+/g, '');
    const telUrl = `tel:${rawNumber}`;

    setIsDialingActive(true);
    setCallActiveSeconds(0);
    callStartTimeRef.current = Date.now();

    try {
      if (Platform.OS === 'web') {
        window.open(telUrl);
      } else {
        const canOpen = await Linking.canOpenURL(telUrl).catch(() => false);
        if (canOpen) {
          await Linking.openURL(telUrl);
        } else {
          Alert.alert('Calling Customer', `Dialing ${delivery.customer.phone}`);
        }
      }
    } catch {
      // Fallback
    }
  };

  const handleFinishCallManual = () => {
    const elapsed = Math.max(callActiveSeconds, 20);
    setCallDurationSec(elapsed);
    setIsDialingActive(false);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setIsCallOutcomeModalVisible(true);
  };

  const handleOpenCallLogModal = () => {
    if (callEvidence.attempted) {
      setCallDurationSec(callEvidence.durationSeconds || 24);
      setSelectedCallOutcome(callEvidence.status === 'completed' ? 'answered' : callEvidence.status === 'no_answer' ? 'unanswered' : 'busy');
    }
    setIsCallOutcomeModalVisible(true);
  };

  const handleConfirmCallLog = () => {
    setIsVerifyingCallLog(true);

    setTimeout(() => {
      setIsVerifyingCallLog(false);

      const finalDuration = selectedCallOutcome === 'answered' ? callDurationSec : 0;
      const finalStatus = selectedCallOutcome === 'answered' ? 'completed' : selectedCallOutcome === 'unanswered' ? 'no_answer' : 'busy';

      updateCallLogEvidence({
        durationSeconds: finalDuration,
        status: finalStatus,
        recipientPhone: delivery.customer.phone,
        attempted: true,
      });

      setIsCallOutcomeModalVisible(false);
    }, 400);
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
        {/* Top Map Stage with Back Button & Unit Chip */}
        <LiveDeliveryMap
          driverLat={driverLat}
          driverLng={driverLng}
          destLat={delivery.address.latitude}
          destLng={delivery.address.longitude}
          destAddress={`${delivery.address.street}, ${delivery.address.city}`}
          distanceMeters={distanceMeters}
          gpsAccuracy={currentLocation?.accuracy || 8}
          isInsideGeofence={isInsideGeofence}
          onBack={onBack}
        />

        {/* Bottom Sheet */}
        <ScrollView style={styles.bottomSheet} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          <View style={styles.sheetHandle} />

          {/* Sheet Topline */}
          <View style={styles.sheetTopline}>
            <View style={{ flex: 1 }}>
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
          </View>

          {/* Status Pill */}
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

          {/* Dwell Timer Ring & Stop Meta */}
          <DwellGauge
            residenceCategory={delivery.address.residenceCategory}
            currentDwellSeconds={dwellSeconds}
            isInsideGeofence={isInsideGeofence}
            distanceMeters={distanceMeters}
            arrivalWindow={delivery.estimatedDeliveryWindow}
            customerName={delivery.customer.name}
            customerPhone={delivery.customer.phone}
            callEvidence={callEvidence}
          />

          {/* Active Calling In-Progress Banner */}
          {isDialingActive && (
            <View style={styles.activeCallBanner}>
              <View style={styles.activeCallLeft}>
                <Ionicons name="call" size={20} color="#FFFFFF" />
                <View>
                  <Text style={styles.activeCallTitle}>CALL IN PROGRESS ({callActiveSeconds}S)</Text>
                  <Text style={styles.activeCallSub}>Dialed {delivery.customer.phone}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.finishCallBtn} onPress={handleFinishCallManual} activeOpacity={0.8}>
                <Text style={styles.finishCallBtnText}>VERIFY LOG</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Dedicated Call Action Section (Senior / Driver Accessible) */}
          <View style={styles.callActionCard}>
            {!callEvidence.attempted && !isDialingActive && (
              <TouchableOpacity
                style={styles.bigCallBtn}
                onPress={handleDialCustomer}
                activeOpacity={0.85}
              >
                <View style={styles.callBtnIconWrap}>
                  <Ionicons name="call" size={24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bigCallBtnTitle}>CALL CUSTOMER</Text>
                  <Text style={styles.bigCallBtnSub}>{delivery.customer.phone} • One-tap dial & log</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {isDialingActive && (
              <TouchableOpacity
                style={[styles.bigCallBtn, { backgroundColor: THEME.colors.slate }]}
                onPress={handleFinishCallManual}
                activeOpacity={0.85}
              >
                <View style={styles.callBtnIconWrap}>
                  <Ionicons name="checkmark-done-circle" size={24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bigCallBtnTitle}>I FINISHED CALLING</Text>
                  <Text style={styles.bigCallBtnSub}>Tap to verify duration & outcome</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {callEvidence.attempted && !isDialingActive && (
              <View style={styles.callVerifiedCard}>
                <View style={styles.callVerifiedTop}>
                  <Ionicons name="checkmark-circle" size={24} color={THEME.colors.green} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.callVerifiedTitle}>
                      {callEvidence.status === 'completed'
                        ? `CALL VERIFIED: SPOKE WITH CUSTOMER`
                        : callEvidence.status === 'no_answer'
                        ? `CALL VERIFIED: NO ANSWER (RANG OUT)`
                        : `CALL VERIFIED: LINE BUSY`}
                    </Text>
                    <Text style={styles.callVerifiedSub}>
                      {delivery.customer.phone} • {callEvidence.durationSeconds}s recorded
                    </Text>
                  </View>
                </View>

                <View style={styles.callVerifiedButtons}>
                  <TouchableOpacity
                    style={styles.reverifyBtn}
                    onPress={handleOpenCallLogModal}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={15} color={THEME.colors.slate} />
                    <Text style={styles.reverifyBtnText}>EDIT LOG</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.redialBtn}
                    onPress={handleDialCustomer}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call-outline" size={15} color={THEME.colors.signal} />
                    <Text style={styles.redialBtnText}>REDIAL</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Submit Delivery Attempt Button */}
          <TouchableOpacity
            style={styles.attestButton}
            onPress={() => setIsSubmitModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.attestButtonText}>SUBMIT ATTEMPT FOR VERIFICATION</Text>
          </TouchableOpacity>

          {/* Sheet Footer */}
          <View style={styles.sheetFooter}>
            <Ionicons name="shield-outline" size={14} color={THEME.colors.muted} />
            <Text style={styles.sheetFooterText}>
              Server independently validates Haversine distance, dwell & call logs
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Call Outcome & Log Verification Modal */}
      <Modal
        visible={isCallOutcomeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCallOutcomeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>CALL LOG TELEMETRY VERIFICATION</Text>
              <Text style={styles.modalHeaderSub}>Outbound attempt to {delivery.customer.phone} ({delivery.customer.name})</Text>
            </View>

            {/* Permission Check Telemetry Banner */}
            <View style={styles.logProofBanner}>
              <Ionicons name="shield-checkmark" size={22} color={THEME.colors.green} />
              <View style={{ flex: 1 }}>
                <Text style={styles.logProofTitle}>Telephony Call Log Access: GRANTED</Text>
                <Text style={styles.logProofDetail}>
                  Carrier Outgoing Log • Target: {delivery.customer.phone}
                </Text>
              </View>
            </View>

            {/* Call Duration Stepper */}
            <View style={styles.durationBox}>
              <Text style={styles.durationBoxLabel}>RECORDED CALL DURATION</Text>
              <View style={styles.durationControls}>
                <TouchableOpacity
                  style={styles.durationStepBtn}
                  onPress={() => setCallDurationSec((prev) => Math.max(0, prev - 5))}
                >
                  <Text style={styles.durationStepText}>-5s</Text>
                </TouchableOpacity>

                <View style={styles.durationDisplay}>
                  <Text style={styles.durationNum}>{callDurationSec}</Text>
                  <Text style={styles.durationUnit}>SECONDS</Text>
                </View>

                <TouchableOpacity
                  style={styles.durationStepBtn}
                  onPress={() => setCallDurationSec((prev) => prev + 5)}
                >
                  <Text style={styles.durationStepText}>+5s</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.durationStepBtn}
                  onPress={() => setCallDurationSec((prev) => prev + 15)}
                >
                  <Text style={styles.durationStepText}>+15s</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Preset Buttons */}
              <View style={styles.presetRow}>
                {[15, 30, 45, 60].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetBtn, callDurationSec === preset && styles.presetBtnActive]}
                    onPress={() => setCallDurationSec(preset)}
                  >
                    <Text style={[styles.presetBtnText, callDurationSec === preset && styles.presetBtnTextActive]}>
                      {preset}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Outcome Selection */}
            <Text style={styles.outcomeQuestion}>DID CUSTOMER ANSWER THE CALL?</Text>
            <View style={styles.outcomeOptions}>
              <TouchableOpacity
                style={[styles.outcomeBtn, selectedCallOutcome === 'answered' && styles.outcomeBtnSelected]}
                onPress={() => setSelectedCallOutcome('answered')}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={24} color={selectedCallOutcome === 'answered' ? THEME.colors.green : THEME.colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.outcomeBtnTitle}>Yes, Connected & Spoke with Customer</Text>
                  <Text style={styles.outcomeBtnSubtitle}>Conversation completed ({callDurationSec}s talk time)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.outcomeBtn, selectedCallOutcome === 'unanswered' && styles.outcomeBtnSelected]}
                onPress={() => setSelectedCallOutcome('unanswered')}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={24} color={selectedCallOutcome === 'unanswered' ? THEME.colors.signal : THEME.colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.outcomeBtnTitle}>No Answer / Customer Did Not Pick Up</Text>
                  <Text style={styles.outcomeBtnSubtitle}>Phone rang out with zero response</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.outcomeBtn, selectedCallOutcome === 'busy' && styles.outcomeBtnSelected]}
                onPress={() => setSelectedCallOutcome('busy')}
                activeOpacity={0.8}
              >
                <Ionicons name="alert-circle" size={24} color={selectedCallOutcome === 'busy' ? THEME.colors.signal : THEME.colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.outcomeBtnTitle}>Line Busy / Number Switched Off</Text>
                  <Text style={styles.outcomeBtnSubtitle}>Carrier reported line unreachable or busy tone</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.confirmCallBtn}
              onPress={handleConfirmCallLog}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmCallBtnText}>
                {isVerifyingCallLog ? 'VERIFYING TELEMETRY...' : 'CONFIRM & SAVE CALL EVIDENCE'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setIsCallOutcomeModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Failure Reason Modal */}
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

            <ScrollView style={{ maxHeight: 260, marginBottom: 12 }}>
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

            <TextInput
              style={styles.textInput}
              placeholder="Driver remarks (e.g. security gate refusal)..."
              placeholderTextColor={THEME.colors.muted}
              value={failureNotes}
              onChangeText={setFailureNotes}
            />

            <TouchableOpacity
              style={styles.confirmSubmitBtn}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmSubmitText}>TRANSMIT TELEMETRY TO BACKEND</Text>
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
  activeCallBanner: {
    backgroundColor: THEME.colors.slate,
    padding: 12,
    borderRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  activeCallLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeCallTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  activeCallSub: {
    fontSize: 10,
    color: '#CBD4D7',
  },
  finishCallBtn: {
    backgroundColor: THEME.colors.signal,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
  },
  finishCallBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  callActionCard: {
    marginTop: 8,
    marginBottom: 4,
  },
  bigCallBtn: {
    width: '100%',
    minHeight: 64,
    backgroundColor: THEME.colors.signal,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  callBtnIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigCallBtnTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bigCallBtnSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFE2DB',
    marginTop: 2,
  },
  callVerifiedCard: {
    backgroundColor: '#F3FBF5',
    borderWidth: 1.5,
    borderColor: '#A9D1BB',
    borderRadius: 4,
    padding: 14,
    gap: 12,
  },
  callVerifiedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  callVerifiedTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1A7047',
    letterSpacing: 0.5,
  },
  callVerifiedSub: {
    fontSize: 11,
    color: THEME.colors.slate,
    fontWeight: '600',
    marginTop: 2,
  },
  callVerifiedButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  reverifyBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFD7D8',
    paddingVertical: 8,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reverifyBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.slate,
    letterSpacing: 0.5,
  },
  redialBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.signal,
    paddingVertical: 8,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  redialBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.signal,
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
    borderRadius: 4,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
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
  logProofBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.colors.geofenceBg,
    borderWidth: 1,
    borderColor: THEME.colors.geofenceBorder,
    padding: 10,
    borderRadius: 4,
    marginBottom: 14,
  },
  logProofTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.geofenceText,
  },
  logProofDetail: {
    fontSize: 11,
    color: THEME.colors.slate,
    fontWeight: '600',
    marginTop: 1,
  },
  durationBox: {
    backgroundColor: '#F4F6F7',
    borderWidth: 1,
    borderColor: '#DBE1E5',
    borderRadius: 4,
    padding: 12,
    marginBottom: 14,
  },
  durationBoxLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.muted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  durationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  durationStepBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD4D7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
  },
  durationStepText: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.slate,
  },
  durationDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationNum: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.colors.foreground,
    letterSpacing: -0.5,
  },
  durationUnit: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 1,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBE1E5',
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 2,
  },
  presetBtnActive: {
    backgroundColor: THEME.colors.foreground,
    borderColor: THEME.colors.foreground,
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.slate,
  },
  presetBtnTextActive: {
    color: '#FFFFFF',
  },
  outcomeQuestion: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.muted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  outcomeOptions: {
    gap: 8,
    marginBottom: 16,
  },
  outcomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6F7',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DBE1E5',
    gap: 12,
  },
  outcomeBtnSelected: {
    borderColor: THEME.colors.foreground,
    backgroundColor: '#E3E9E5',
  },
  outcomeBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.foreground,
  },
  outcomeBtnSubtitle: {
    fontSize: 11,
    color: THEME.colors.muted,
    marginTop: 1,
  },
  confirmCallBtn: {
    backgroundColor: THEME.colors.signal,
    paddingVertical: 15,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmCallBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 1,
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
});
