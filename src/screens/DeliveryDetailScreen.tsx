import React, { useState } from 'react';
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

  // Real phone dialer trigger
  const handleDialCustomer = async () => {
    const rawNumber = delivery.customer.phone.replace(/\s+/g, '');
    const telUrl = `tel:${rawNumber}`;

    try {
      if (Platform.OS === 'web') {
        window.open(telUrl);
      } else {
        const canOpen = await Linking.canOpenURL(telUrl);
        if (canOpen) {
          await Linking.openURL(telUrl);
        } else {
          Alert.alert('Calling Customer', `Dialing ${delivery.customer.phone}`);
        }
      }
    } catch {
      // Fallback
    }

    // Prompt call log verification after dialing
    setTimeout(() => {
      setIsCallOutcomeModalVisible(true);
    }, 1200);
  };

  const handleConfirmCallLog = () => {
    setIsVerifyingCallLog(true);

    setTimeout(() => {
      setIsVerifyingCallLog(false);

      callEvidence.attempted = true;
      callEvidence.timestamp = new Date().toISOString();
      callEvidence.durationSeconds = selectedCallOutcome === 'answered' ? callDurationSec : 0;
      callEvidence.status = selectedCallOutcome === 'answered' ? 'completed' : selectedCallOutcome === 'unanswered' ? 'no_answer' : 'busy';
      callEvidence.recipientPhone = delivery.customer.phone;
      callEvidence.telephonyCallId = `LOG-${Date.now().toString(36).toUpperCase()}`;

      setIsCallOutcomeModalVisible(false);
    }, 600);
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

          {/* Giant Call Customer Button matching design */}
          <TouchableOpacity
            style={[styles.callButton, callEvidence.attempted && styles.callButtonCalled]}
            onPress={handleDialCustomer}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={22} color="#FFFFFF" />
            <Text style={styles.callButtonText}>
              {callEvidence.attempted
                ? `CUSTOMER CALLED (${callEvidence.durationSeconds}S)`
                : `CALL CUSTOMER (${delivery.customer.phone})`}
            </Text>
          </TouchableOpacity>

          {/* Submit Delivery Attempt Action Button */}
          <TouchableOpacity
            style={styles.attestButton}
            onPress={() => setIsSubmitModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.attestButtonText}>SUBMIT ATTEMPT FOR VERIFICATION</Text>
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
              <Text style={styles.modalHeaderTitle}>CALL VERIFICATION</Text>
              <Text style={styles.modalHeaderSub}>Did customer pick up at {delivery.customer.phone}?</Text>
            </View>

            <View style={styles.outcomeOptions}>
              <TouchableOpacity
                style={[styles.outcomeBtn, selectedCallOutcome === 'answered' && styles.outcomeBtnSelected]}
                onPress={() => {
                  setSelectedCallOutcome('answered');
                  setCallDurationSec(25);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={22} color={selectedCallOutcome === 'answered' ? THEME.colors.green : THEME.colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.outcomeBtnTitle}>Yes, Spoke with Customer</Text>
                  <Text style={styles.outcomeBtnSubtitle}>Call connected ({callDurationSec}s duration)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.outcomeBtn, selectedCallOutcome === 'unanswered' && styles.outcomeBtnSelected]}
                onPress={() => {
                  setSelectedCallOutcome('unanswered');
                  setCallDurationSec(0);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={22} color={selectedCallOutcome === 'unanswered' ? THEME.colors.signal : THEME.colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.outcomeBtnTitle}>No Answer / Phone Rang Out</Text>
                  <Text style={styles.outcomeBtnSubtitle}>Customer did not pick up call</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.outcomeBtn, selectedCallOutcome === 'busy' && styles.outcomeBtnSelected]}
                onPress={() => {
                  setSelectedCallOutcome('busy');
                  setCallDurationSec(0);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="alert-circle" size={22} color={selectedCallOutcome === 'busy' ? THEME.colors.signal : THEME.colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.outcomeBtnTitle}>Number Busy / Switched Off</Text>
                  <Text style={styles.outcomeBtnSubtitle}>Line was busy or unreachable</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.confirmCallBtn}
              onPress={handleConfirmCallLog}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmCallBtnText}>
                {isVerifyingCallLog ? 'VERIFYING CALL LOG...' : 'SAVE VERIFIED CALL EVIDENCE'}
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

            <TextInput
              style={styles.textInput}
              placeholder="Driver remarks (e.g. security refusal)..."
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
    minHeight: 64,
    backgroundColor: THEME.colors.signal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 2,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  callButtonCalled: {
    backgroundColor: THEME.colors.green,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
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
  outcomeOptions: {
    gap: 8,
    marginBottom: 16,
  },
  outcomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6F7',
    padding: 14,
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
    fontSize: 14,
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
