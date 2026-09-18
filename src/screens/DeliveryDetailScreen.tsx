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

const FAILURE_REASONS: { id: FailureReason; label: string }[] = [
  { id: 'customer_unavailable', label: 'Customer Unavailable / Unreachable' },
  { id: 'gate_locked_security_refusal', label: 'Security Gate Locked / Access Denied' },
  { id: 'incorrect_address', label: 'Incorrect Address / Unit Not Found' },
  { id: 'customer_rejected_delivery', label: 'Customer Refused at Door' },
  { id: 'access_code_required', label: 'Entry Passcode / OTP Required' },
  { id: 'other', label: 'Other Operational Issue' },
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.responsiveContainer}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
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
          {/* Destination Summary Card */}
          <View style={styles.destinationCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.customerName}>{delivery.customer.name}</Text>
                <Text style={styles.customerPhone}>{delivery.customer.phone}</Text>
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
                <Text style={styles.notesText}>{delivery.notes}</Text>
              </View>
            )}
          </View>

          {/* Dwell Gauge */}
          <DwellGauge
            residenceCategory={delivery.address.residenceCategory}
            currentDwellSeconds={dwellSeconds}
            isInsideGeofence={isInsideGeofence}
            distanceMeters={distanceMeters}
          />

          {/* Evidence Checklist */}
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
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit Attempt Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => setIsSubmitModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>Submit Delivery Attempt</Text>
            <Ionicons name="arrow-forward" size={14} color="#000000" />
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
                <Text style={styles.modalTitle}>Submit Attempt</Text>
                <Text style={styles.modalSubtitle}>Select reason for zero-trust evaluation</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSubmitModalVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
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
                    <Text
                      style={[
                        styles.reasonOptionText,
                        isSelected && styles.reasonOptionTextSelected,
                      ]}
                    >
                      {r.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Driver notes..."
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
              <Text style={styles.confirmSubmitText}>Transmit Telemetry</Text>
              <Ionicons name="arrow-forward" size={14} color="#000000" />
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
    gap: 4,
  },
  backText: {
    fontSize: 13,
    color: THEME.colors.textPrimary,
    fontWeight: '600',
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  modeTagText: {
    fontSize: 9,
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
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  customerPhone: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  residencePill: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  residenceText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  addressText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  notesBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  notesText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  errorBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
  },
  submitButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    gap: 6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
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
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  reasonOptionSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: THEME.colors.surfaceHighlight,
  },
  reasonOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  reasonOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginTop: 10,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.sm,
    padding: 10,
    color: THEME.colors.textPrimary,
    fontSize: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    textAlignVertical: 'top',
  },
  confirmSubmitBtn: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    gap: 6,
  },
  confirmSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  loadingOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    maxWidth: 320,
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },
});
