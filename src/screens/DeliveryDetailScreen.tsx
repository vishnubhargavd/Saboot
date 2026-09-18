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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Delivery, FailureReason } from '../types/delivery';
import { DWELL_POLICY_CONFIG } from '../constants/dwellPolicy';
import { LiveDeliveryMap } from '../components/LiveDeliveryMap';
import { DwellGauge } from '../components/DwellGauge';
import { EvidenceChecklist } from '../components/EvidenceChecklist';
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

  const dwellRule = DWELL_POLICY_CONFIG[delivery.address.residenceCategory];

  // Map coordinates
  const driverLat = currentLocation?.latitude || (isSimulationMode && activePreset ? activePreset.simulatedGps.latitude : delivery.address.latitude + 0.0003);
  const driverLng = currentLocation?.longitude || (isSimulationMode && activePreset ? activePreset.simulatedGps.longitude : delivery.address.longitude + 0.0003);

  const handleSubmit = async () => {
    setIsSubmitModalVisible(false);
    const result = await submitAttempt();
    if (result) {
      onVerificationComplete(result);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.responsiveContainer}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backText}>Queue</Text>
          </TouchableOpacity>

          <View style={styles.navTitleContainer}>
            <Text style={styles.navTitle}>{delivery.trackingNumber}</Text>
            <Text style={styles.navSubtitle}>Attempt Verification</Text>
          </View>

          <View style={styles.modeTag}>
            <Text style={styles.modeTagText}>{isSimulationMode ? 'SIM' : 'LIVE'}</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Customer & Address Summary Card (Senior Friendly) */}
          <View style={styles.destinationCard}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{delivery.customer.name}</Text>
                <Text style={styles.customerPhone}>📞 {delivery.customer.phone}</Text>
              </View>
              <View style={styles.residencePill}>
                <Text style={styles.residenceText}>{dwellRule.displayName}</Text>
              </View>
            </View>

            <Text style={styles.addressText}>
              {delivery.address.street}, {delivery.address.city}
            </Text>

            {delivery.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>Note: {delivery.notes}</Text>
              </View>
            )}
          </View>

          {/* Live Google / Dark Map */}
          <LiveDeliveryMap
            driverLat={driverLat}
            driverLng={driverLng}
            destLat={delivery.address.latitude}
            destLng={delivery.address.longitude}
            destAddress={`${delivery.address.street}, ${delivery.address.city}`}
            distanceMeters={distanceMeters}
            gpsAccuracy={currentLocation?.accuracy || 8}
            isInsideGeofence={isInsideGeofence}
          />

          {/* Dwell Gauge */}
          <DwellGauge
            residenceCategory={delivery.address.residenceCategory}
            currentDwellSeconds={dwellSeconds}
            isInsideGeofence={isInsideGeofence}
            distanceMeters={distanceMeters}
          />

          {/* Step-by-Step Evidence Checklist with Live Dialing & Call Log */}
          <EvidenceChecklist
            distanceMeters={distanceMeters}
            gpsAccuracy={currentLocation?.accuracy || 8}
            dwellSeconds={dwellSeconds}
            requiredDwellSeconds={requiredDwellSeconds}
            callEvidence={callEvidence}
            videoEvidence={videoEvidence}
            customerPhone={delivery.customer.phone}
            onCallLogged={(evidence: CallEvidence) => {
              // Update call evidence in state
              callEvidence.attempted = evidence.attempted;
              callEvidence.durationSeconds = evidence.durationSeconds;
              callEvidence.status = evidence.status;
              callEvidence.timestamp = evidence.timestamp;
              callEvidence.telephonyCallId = evidence.telephonyCallId;
            }}
            onRequestConsent={requestConsent}
            onSimulateConsent={simulateCustomerConsentResponse}
            onRecordVideo={() => recordVideoClip('file:///clips/silent_clip.mp4', 6)}
          />

          {/* Error Alert */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit Delivery Attempt Button (High Visibility for Seniors) */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => setIsSubmitModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>Submit Delivery Attempt</Text>
            <Ionicons name="arrow-forward" size={16} color="#000000" />
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* Failure Reason Modal */}
      <Modal
        visible={isSubmitModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSubmitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Delivery Issue</Text>
                <Text style={styles.modalSubtitle}>Why could the package not be delivered?</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSubmitModalVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reasonList}>
              {FAILURE_REASONS.map((r) => {
                const isSelected = failureReason === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.reasonOption,
                      isSelected && styles.reasonOptionSelected,
                    ]}
                    onPress={() => setFailureReason(r.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.reasonOptionText,
                          isSelected && styles.reasonOptionTextSelected,
                        ]}
                      >
                        {r.label}
                      </Text>
                      <Text style={styles.reasonOptionDesc}>{r.desc}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.inputLabel}>Driver Remarks (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Waited at security gate..."
                placeholderTextColor={THEME.colors.textMuted}
                value={failureNotes}
                onChangeText={setFailureNotes}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.confirmSubmitBtn}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmSubmitText}>Send Telemetry to AWS Backend</Text>
              <Ionicons name="arrow-forward" size={16} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingTitle}>Evaluating Zero-Trust Policy</Text>
            <Text style={styles.loadingSubtitle}>
              Server calculating Haversine distance, dwell & telephony validation...
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
    backgroundColor: '#000000',
  },
  responsiveContainer: {
    flex: 1,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  navTitleContainer: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    fontFamily: THEME.typography.fontFamily.mono,
  },
  navSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  modeTag: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  modeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontFamily.mono,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  destinationCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  customerPhone: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  residencePill: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  residenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  addressText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  notesBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  notesText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  errorBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
  },
  submitButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: THEME.borderRadius.md,
    gap: 8,
    minHeight: 54,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  modalClose: {
    padding: 4,
  },
  reasonList: {
    marginBottom: 14,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 14,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  reasonOptionSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: THEME.colors.surfaceHighlight,
  },
  reasonOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  reasonOptionTextSelected: {
    color: '#FFFFFF',
  },
  reasonOptionDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginTop: 10,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.sm,
    padding: 12,
    color: THEME.colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    textAlignVertical: 'top',
  },
  confirmSubmitBtn: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: THEME.borderRadius.md,
    gap: 8,
    minHeight: 52,
  },
  confirmSubmitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  loadingOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    maxWidth: 320,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
