import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Delivery, FailureReason } from '../types/delivery';
import { DWELL_POLICY_CONFIG } from '../constants/dwellPolicy';
import { DwellGauge } from '../components/DwellGauge';
import { EvidenceChecklist } from '../components/EvidenceChecklist';
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

const FAILURE_REASONS: { id: FailureReason; label: string; icon: string }[] = [
  { id: 'customer_unavailable', label: 'Customer Unavailable / Unreachable', icon: 'person-remove-outline' },
  { id: 'gate_locked_security_refusal', label: 'Security Gate Locked / Access Denied', icon: 'shield-outline' },
  { id: 'incorrect_address', label: 'Incorrect Address / Unit Not Found', icon: 'location-outline' },
  { id: 'customer_rejected_delivery', label: 'Customer Refused / Cancelled at Door', icon: 'close-circle-outline' },
  { id: 'access_code_required', label: 'Entry Passcode / OTP Required', icon: 'key-outline' },
  { id: 'other', label: 'Other Operational Issue', icon: 'help-circle-outline' },
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
    isCalling,
    callDuration,
    videoEvidence,
    failureReason,
    failureNotes,
    isSubmitting,
    error,
    setFailureReason,
    setFailureNotes,
    startCall,
    endCall,
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

  const handleSubmit = async () => {
    setIsSubmitModalVisible(false);
    const result = await submitAttempt();
    if (result) {
      onVerificationComplete(result);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={THEME.colors.textPrimary} />
          <Text style={styles.backText}>Queue</Text>
        </TouchableOpacity>

        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle}>{delivery.trackingNumber}</Text>
          <Text style={styles.navSubtitle}>Live Delivery Attestation</Text>
        </View>

        <View
          style={[
            styles.modeTag,
            isSimulationMode ? styles.simModeTag : styles.liveModeTag,
          ]}
        >
          <Text
            style={[
              styles.modeTagText,
              { color: isSimulationMode ? THEME.colors.simulation : THEME.colors.liveGps },
            ]}
          >
            {isSimulationMode ? 'SIM' : 'LIVE'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Destination & Customer Summary Card */}
        <View style={styles.destinationCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.customerName}>{delivery.customer.name}</Text>
              <Text style={styles.customerPhone}>{delivery.customer.phone}</Text>
            </View>
            <View style={styles.residencePill}>
              <Ionicons name={dwellRule.icon as any} size={12} color={THEME.colors.primary} />
              <Text style={styles.residenceText}>{dwellRule.displayName}</Text>
            </View>
          </View>

          <View style={styles.addressBox}>
            <Ionicons name="location-sharp" size={16} color={THEME.colors.primary} />
            <Text style={styles.addressText}>
              {delivery.address.street}, {delivery.address.city}
            </Text>
          </View>

          {delivery.notes && (
            <View style={styles.notesBox}>
              <Ionicons name="information-circle-outline" size={14} color={THEME.colors.textMuted} />
              <Text style={styles.notesText}>{delivery.notes}</Text>
            </View>
          )}
        </View>

        {/* Live Category-Aware Dwell Gauge */}
        <DwellGauge
          residenceCategory={delivery.address.residenceCategory}
          currentDwellSeconds={dwellSeconds}
          isInsideGeofence={isInsideGeofence}
          distanceMeters={distanceMeters}
        />

        {/* Multi-Modal Evidence Checklist */}
        <EvidenceChecklist
          distanceMeters={distanceMeters}
          gpsAccuracy={currentLocation?.accuracy || 10}
          dwellSeconds={dwellSeconds}
          requiredDwellSeconds={requiredDwellSeconds}
          callEvidence={callEvidence}
          isCalling={isCalling}
          callDuration={callDuration}
          videoEvidence={videoEvidence}
          customerPhone={delivery.customer.phone}
          onStartCall={startCall}
          onEndCall={endCall}
          onRequestConsent={requestConsent}
          onSimulateConsent={simulateCustomerConsentResponse}
          onRecordVideo={() => recordVideoClip('file:///clips/silent_clip.mp4', 6)}
        />

        {/* Error Alert */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={THEME.colors.rejected} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Submit Attempt Action Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => setIsSubmitModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="shield-checkmark" size={18} color="#090D16" />
          <Text style={styles.submitButtonText}>Submit Delivery Attempt</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Submit Attempt Modal */}
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
                <Text style={styles.modalTitle}>Submit Delivery Failure</Text>
                <Text style={styles.modalSubtitle}>
                  Select reason for zero-trust policy attestation
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSubmitModalVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
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
                    <Ionicons
                      name={r.icon as any}
                      size={18}
                      color={isSelected ? THEME.colors.primary : THEME.colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.reasonOptionText,
                        isSelected && styles.reasonOptionTextSelected,
                      ]}
                    >
                      {r.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={THEME.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.inputLabel}>Driver Notes (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Waited at security gate, intercom unanswered..."
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
              <Text style={styles.confirmSubmitText}>Transmit Telemetry to Backend</Text>
              <Ionicons name="arrow-forward" size={16} color="#090D16" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Submitting Loading Overlay */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingTitle}>Evaluating Zero-Trust Policy</Text>
            <Text style={styles.loadingSubtitle}>
              Server independently calculating distance, dwell & rule checks...
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
    backgroundColor: THEME.colors.background,
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
    gap: 4,
  },
  backText: {
    fontSize: 14,
    color: THEME.colors.textPrimary,
    fontWeight: '600',
  },
  navTitleContainer: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  navSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  modeTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  liveModeTag: {
    backgroundColor: THEME.colors.liveGpsBg,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  simModeTag: {
    backgroundColor: THEME.colors.simulationBg,
    borderColor: THEME.colors.simulationBorder,
  },
  modeTagText: {
    fontSize: 10,
    fontWeight: '800',
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
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  customerPhone: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  residencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  residenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  addressText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  notesText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.rejectedBg,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.rejectedBorder,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: THEME.colors.rejected,
    flex: 1,
  },
  submitButton: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    gap: 8,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#090D16',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
    marginBottom: 16,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    gap: 10,
  },
  reasonOptionSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  reasonOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  reasonOptionTextSelected: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
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
    borderRadius: 8,
    padding: 12,
    color: THEME.colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    textAlignVertical: 'top',
  },
  confirmSubmitBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    gap: 8,
  },
  confirmSubmitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#090D16',
  },
  loadingOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(9, 13, 22, 0.88)',
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
    marginBottom: 6,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
