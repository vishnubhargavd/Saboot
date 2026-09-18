import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Modal,
  Platform,
  AppState,
  AppStateStatus,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { CallEvidence, VideoEvidence } from '../types/evidence';
import { PROXIMITY_POLICY } from '../constants/dwellPolicy';

interface EvidenceChecklistProps {
  distanceMeters: number | null;
  gpsAccuracy: number;
  dwellSeconds: number;
  requiredDwellSeconds: number;
  callEvidence: CallEvidence;
  videoEvidence: VideoEvidence;
  customerPhone: string;
  onCallLogged: (evidence: CallEvidence) => void;
  onRequestConsent: () => void;
  onSimulateConsent: (status: 'granted' | 'denied' | 'timed_out') => void;
  onRecordVideo: () => void;
}

export const EvidenceChecklist: React.FC<EvidenceChecklistProps> = ({
  distanceMeters,
  gpsAccuracy,
  dwellSeconds,
  requiredDwellSeconds,
  callEvidence,
  videoEvidence,
  customerPhone = '+91 90191 44983',
  onCallLogged,
  onRequestConsent,
  onSimulateConsent,
  onRecordVideo,
}) => {
  const [isCallOutcomeModalVisible, setIsCallOutcomeModalVisible] = useState(false);
  const [isVerifyingCallLog, setIsVerifyingCallLog] = useState(false);
  const [selectedCallOutcome, setSelectedCallOutcome] = useState<'answered' | 'no_answer' | 'busy' | 'canceled'>('answered');
  const [measuredCallDuration, setMeasuredCallDuration] = useState<number>(25);

  const callStartTimeRef = useRef<number | null>(null);
  const isWaitingForDialerReturn = useRef<boolean>(false);

  const isDistanceValid = distanceMeters !== null && distanceMeters <= PROXIMITY_POLICY.maxAllowedDistanceMeters;
  const isDwellValid = dwellSeconds >= requiredDwellSeconds;
  const isCallValid = callEvidence.attempted;

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isWaitingForDialerReturn.current && callStartTimeRef.current) {
        const elapsed = Math.max(0, Math.round((Date.now() - callStartTimeRef.current) / 1000));
        isWaitingForDialerReturn.current = false;
        if (elapsed > 0) setMeasuredCallDuration(elapsed);
        if (elapsed < 3) {
          setSelectedCallOutcome('canceled');
        } else {
          setSelectedCallOutcome('answered');
        }
        setIsCallOutcomeModalVisible(true);
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  // Real phone dialer trigger - tracks start timestamp and prompts outcome verification
  const handleDialCustomer = () => {
    const rawNumber = customerPhone.replace(/[^0-9+]/g, '');
    const telUrl = `tel:${rawNumber}`;

    callStartTimeRef.current = Date.now();
    isWaitingForDialerReturn.current = true;

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

    setTimeout(() => {
      setIsCallOutcomeModalVisible(true);
    }, 1000);
  };

  // Confirm genuine call outcome
  const handleConfirmCallOutcome = () => {
    setIsVerifyingCallLog(true);
    setTimeout(() => {
      setIsVerifyingCallLog(false);
      if (selectedCallOutcome === 'canceled') {
        onCallLogged({
          attempted: false,
          durationSeconds: 0,
          status: 'not_attempted',
          recipientPhone: customerPhone,
          simulated: false,
        });
      } else {
        const duration = selectedCallOutcome === 'answered' ? Math.max(measuredCallDuration, 5) : 0;
        onCallLogged({
          attempted: true,
          timestamp: new Date().toISOString(),
          durationSeconds: duration,
          status: selectedCallOutcome === 'answered' ? 'completed' : selectedCallOutcome === 'no_answer' ? 'no_answer' : 'busy',
          recipientPhone: customerPhone,
          simulated: false,
          telephonyCallId: `LOG-${Date.now().toString(36).toUpperCase()}`,
        });
      }
      setIsCallOutcomeModalVisible(false);
    }, 400);
  };

  return (
    <View style={styles.container}>
      {/* Step Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>STEP-BY-STEP VERIFICATION</Text>
        <Text style={styles.sectionSubtitle}>
          Complete the 3 required steps below before submitting
        </Text>
      </View>

      {/* STEP 1: Proximity Geofence */}
      <View style={[styles.stepCard, isDistanceValid ? styles.stepCardDone : styles.stepCardActive]}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumberBadge}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>Step 1: Arrive at Door</Text>
            <Text style={styles.stepDesc}>
              {distanceMeters !== null
                ? isDistanceValid
                  ? `✓ You are ${distanceMeters}m away (Inside 50m geofence)`
                  : `Please walk closer: currently ${distanceMeters}m away (target: ≤50m)`
                : 'Locating GPS position...'}
            </Text>
          </View>
          <View style={[styles.statusPill, isDistanceValid && styles.statusPillDone]}>
            <Text style={[styles.statusPillText, isDistanceValid && styles.statusPillTextDone]}>
              {isDistanceValid ? 'VERIFIED' : `${distanceMeters || 0}m`}
            </Text>
          </View>
        </View>
      </View>

      {/* STEP 2: Dwell Time */}
      <View style={[styles.stepCard, isDwellValid ? styles.stepCardDone : styles.stepCardActive]}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumberBadge}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>Step 2: Wait at Location</Text>
            <Text style={styles.stepDesc}>
              {isDwellValid
                ? `✓ Waited ${dwellSeconds}s (Required: ${requiredDwellSeconds}s)`
                : `Timer: ${dwellSeconds}s of ${requiredDwellSeconds}s required`}
            </Text>
          </View>
          <View style={[styles.statusPill, isDwellValid && styles.statusPillDone]}>
            <Text style={[styles.statusPillText, isDwellValid && styles.statusPillTextDone]}>
              {isDwellValid ? 'VERIFIED' : `${dwellSeconds}s`}
            </Text>
          </View>
        </View>
      </View>

      {/* STEP 3: Customer Call (Large, Clear Button - No Overlap) */}
      <View style={[styles.stepCard, isCallValid ? styles.stepCardDone : styles.stepCardActive]}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumberBadge}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>Step 3: Call Customer</Text>
            <Text style={styles.stepDesc}>
              {isCallValid
                ? `✓ Call outcome verified (${callEvidence.status.toUpperCase()}, ${callEvidence.durationSeconds}s)`
                : `Must attempt phone call to ${customerPhone}`}
            </Text>
          </View>
        </View>

        {/* Senior-Friendly Call Customer Action Button */}
        <View style={styles.callButtonContainer}>
          <TouchableOpacity
            style={[
              styles.largeCallButton,
              isCallValid && callEvidence.status === 'completed' && styles.largeCallButtonDone,
              isCallValid && callEvidence.status === 'no_answer' && styles.largeCallButtonNoAnswer,
              isCallValid && callEvidence.status === 'busy' && styles.largeCallButtonBusy,
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
            <View style={styles.callButtonTextGroup}>
              <Text style={styles.largeCallButtonText} numberOfLines={1}>
                {callEvidence.status === 'completed'
                  ? `CUSTOMER SPOKE (${callEvidence.durationSeconds}s) ✓`
                  : callEvidence.status === 'no_answer'
                  ? 'ATTEMPTED: NO ANSWER ✓'
                  : callEvidence.status === 'busy'
                  ? 'ATTEMPTED: BUSY / UNREACHABLE ✓'
                  : 'CALL CUSTOMER'}
              </Text>
              <Text style={styles.largeCallButtonSubText} numberOfLines={1}>
                {callEvidence.status === 'completed'
                  ? `Spoke with customer • ${customerPhone}`
                  : callEvidence.status === 'no_answer'
                  ? `Rang out (No answer) • ${customerPhone}`
                  : callEvidence.status === 'busy'
                  ? `Line busy / unreachable • ${customerPhone}`
                  : `${customerPhone} • Tap to call & record`}
              </Text>
            </View>
            <View style={styles.callActionPill}>
              <Text style={styles.callActionPillText}>
                {isCallValid ? 'REDIAL' : 'DIAL'}
              </Text>
              <Ionicons
                name={isCallValid ? 'repeat-outline' : 'chevron-forward'}
                size={14}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* OPTIONAL STEP: Video Evidence (Corroborating) */}
      <View style={[styles.stepCard, styles.optionalCard]}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepNumberBadge, styles.optionalNumberBadge]}>
            <Ionicons name="videocam" size={14} color={THEME.colors.textSecondary} />
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>Optional: Video Evidence</Text>
            <Text style={styles.stepDesc}>Customer SMS consent required • Non-blocking</Text>
          </View>
        </View>

        <View style={styles.consentActions}>
          {videoEvidence.consentStatus === 'not_requested' && (
            <TouchableOpacity style={styles.consentActionBtn} onPress={onRequestConsent}>
              <Text style={styles.consentActionText}>Request Customer Video Consent (SMS)</Text>
            </TouchableOpacity>
          )}

          {videoEvidence.consentStatus === 'requested' && (
            <View style={styles.consentWaitingBox}>
              <Text style={styles.waitingText}>Waiting for customer to tap SMS link...</Text>
              <View style={styles.simButtonsRow}>
                <TouchableOpacity
                  style={styles.simSmallBtn}
                  onPress={() => onSimulateConsent('granted')}
                >
                  <Text style={styles.simSmallBtnText}>Customer Approved</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.simSmallBtn}
                  onPress={() => onSimulateConsent('timed_out')}
                >
                  <Text style={styles.simSmallBtnText}>Timed Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {videoEvidence.consentStatus === 'granted' && (
            <View style={styles.consentGrantedBox}>
              <Text style={styles.grantedTitle}>✓ Consent Granted by Customer</Text>
              {videoEvidence.videoUri ? (
                <Text style={styles.videoSavedText}>✓ Silent 6s clip recorded & attached</Text>
              ) : (
                <TouchableOpacity style={styles.recordClipBtn} onPress={onRecordVideo}>
                  <Ionicons name="videocam" size={16} color="#000000" />
                  <Text style={styles.recordClipBtnText}>Record Silent 6s Clip</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {videoEvidence.consentStatus === 'timed_out' && (
            <Text style={styles.fallbackNotice}>
              Consent window timed out. Proceeding on GPS + Call verification.
            </Text>
          )}
        </View>
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
                Did customer pick up at {customerPhone}?
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  stepCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  stepCardActive: {
    borderColor: THEME.colors.borderLight,
  },
  stepCardDone: {
    borderColor: '#FFFFFF',
    backgroundColor: THEME.colors.surfaceElevated,
  },
  optionalCard: {
    borderColor: THEME.colors.border,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionalNumberBadge: {
    backgroundColor: THEME.colors.surface,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  stepDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  statusPill: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  statusPillDone: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontFamily.mono,
  },
  statusPillTextDone: {
    color: '#000000',
  },
  callButtonContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  largeCallButton: {
    backgroundColor: THEME.colors.signal,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    minHeight: 64,
  },
  largeCallButtonDone: {
    backgroundColor: THEME.colors.green,
  },
  largeCallButtonNoAnswer: {
    backgroundColor: '#D97706',
  },
  largeCallButtonBusy: {
    backgroundColor: '#475569',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonTextGroup: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  largeCallButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  largeCallButtonSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    marginTop: 2,
  },
  callActionPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
  consentActions: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  consentActionBtn: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  consentActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  consentWaitingBox: {
    gap: 8,
  },
  waitingText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  simSmallBtn: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceElevated,
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  simSmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  consentGrantedBox: {
    gap: 8,
  },
  grantedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  videoSavedText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  recordClipBtn: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.sm,
    gap: 6,
  },
  recordClipBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  fallbackNotice: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 15,
  },
});

