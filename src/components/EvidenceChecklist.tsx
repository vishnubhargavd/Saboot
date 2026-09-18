import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
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
  isCalling: boolean;
  callDuration: number;
  videoEvidence: VideoEvidence;
  customerPhone: string;
  onStartCall: () => void;
  onEndCall: () => void;
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
  isCalling,
  callDuration,
  videoEvidence,
  customerPhone,
  onStartCall,
  onEndCall,
  onRequestConsent,
  onSimulateConsent,
  onRecordVideo,
}) => {
  const isDistanceValid = distanceMeters !== null && distanceMeters <= PROXIMITY_POLICY.maxAllowedDistanceMeters;
  const isDwellValid = dwellSeconds >= requiredDwellSeconds;
  const isCallValid = callEvidence.attempted;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>EVIDENCE CRITERIA</Text>
        <Text style={styles.sectionSubtitle}>Transmitted to AWS Backend for validation</Text>
      </View>

      {/* 1. Proximity Geofence */}
      <View style={[styles.card, isDistanceValid ? styles.validCard : styles.pendingCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View style={styles.itemTitleRow}>
              <Text style={styles.itemTitle}>1. Proximity Geofence</Text>
              <View style={styles.mustTag}>
                <Text style={styles.mustTagText}>MUST</Text>
              </View>
            </View>
            <Text style={styles.itemSubtitle}>Target: ≤ 50m to delivery door</Text>
          </View>

          <View style={[styles.statusTag, isDistanceValid && styles.statusTagActive]}>
            <Text style={[styles.statusTagText, isDistanceValid && styles.statusTagTextActive]}>
              {distanceMeters !== null ? `${distanceMeters}m` : 'Locating...'}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Accuracy: ±{gpsAccuracy}m</Text>
          <Text style={styles.metaText}>
            Status: {isDistanceValid ? 'Inside 50m Geofence' : 'Outside Geofence'}
          </Text>
        </View>
      </View>

      {/* 2. Residence Dwell Time */}
      <View style={[styles.card, isDwellValid ? styles.validCard : styles.pendingCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View style={styles.itemTitleRow}>
              <Text style={styles.itemTitle}>2. Dwell Duration</Text>
              <View style={styles.mustTag}>
                <Text style={styles.mustTagText}>MUST</Text>
              </View>
            </View>
            <Text style={styles.itemSubtitle}>Target: ≥ {requiredDwellSeconds}s</Text>
          </View>

          <View style={[styles.statusTag, isDwellValid && styles.statusTagActive]}>
            <Text style={[styles.statusTagText, isDwellValid && styles.statusTagTextActive]}>
              {dwellSeconds}s / {requiredDwellSeconds}s
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Telephony Contact */}
      <View style={[styles.card, isCallValid ? styles.validCard : styles.pendingCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View style={styles.itemTitleRow}>
              <Text style={styles.itemTitle}>3. Customer Call Attempt</Text>
              <View style={styles.mustTag}>
                <Text style={styles.mustTagText}>MUST</Text>
              </View>
            </View>
            <Text style={styles.itemSubtitle}>{customerPhone}</Text>
          </View>

          {isCalling ? (
            <TouchableOpacity style={styles.endCallButton} onPress={onEndCall} activeOpacity={0.8}>
              <Ionicons name="call" size={13} color="#FFFFFF" />
              <Text style={styles.endCallText}>End ({callDuration}s)</Text>
            </TouchableOpacity>
          ) : isCallValid ? (
            <View style={[styles.statusTag, styles.statusTagActive]}>
              <Text style={[styles.statusTagText, styles.statusTagTextActive]}>
                {callEvidence.durationSeconds}s Logged
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.callButton} onPress={onStartCall} activeOpacity={0.8}>
              <Ionicons name="call" size={13} color="#000000" />
              <Text style={styles.callButtonText}>Call Customer</Text>
            </TouchableOpacity>
          )}
        </View>

        {isCallValid && (
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Telephony ID: {callEvidence.telephonyCallId || 'SIM'}</Text>
            <Text style={styles.metaText}>Completed</Text>
          </View>
        )}
      </View>

      {/* 4. Optional Corroborating Video */}
      <View style={[styles.card, styles.optionalCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View style={styles.itemTitleRow}>
              <Text style={styles.itemTitle}>4. Video Proof (Consent-Gated)</Text>
              <View style={styles.optionalTag}>
                <Text style={styles.optionalTagText}>CORROBORATING</Text>
              </View>
            </View>
            <Text style={styles.itemSubtitle}>Non-blocking customer consent workflow</Text>
          </View>
        </View>

        <View style={styles.consentSection}>
          {videoEvidence.consentStatus === 'not_requested' && (
            <TouchableOpacity style={styles.outlineActionBtn} onPress={onRequestConsent} activeOpacity={0.7}>
              <Text style={styles.outlineActionText}>Send Consent Request SMS</Text>
            </TouchableOpacity>
          )}

          {videoEvidence.consentStatus === 'requested' && (
            <View style={styles.pendingConsentBox}>
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.pendingText}>SMS sent. Awaiting customer response...</Text>
              </View>

              <View style={styles.simActionsRow}>
                <TouchableOpacity
                  style={styles.simBtn}
                  onPress={() => onSimulateConsent('granted')}
                >
                  <Text style={styles.simBtnText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.simBtn}
                  onPress={() => onSimulateConsent('denied')}
                >
                  <Text style={styles.simBtnText}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.simBtn}
                  onPress={() => onSimulateConsent('timed_out')}
                >
                  <Text style={styles.simBtnText}>Timeout</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {videoEvidence.consentStatus === 'granted' && (
            <View style={styles.grantedBox}>
              <Text style={styles.grantedText}>Customer Consent Granted</Text>
              {videoEvidence.videoUri ? (
                <View style={styles.recordedPill}>
                  <Text style={styles.recordedText}>Silent Video Clip Recorded (6s)</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.solidActionBtn} onPress={onRecordVideo}>
                  <Text style={styles.solidActionText}>Record Silent 6s Clip</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {videoEvidence.consentStatus === 'timed_out' && (
            <View style={styles.fallbackBox}>
              <Text style={styles.fallbackText}>
                Consent timed out. Fallback: evaluating on GPS + Call evidence alone.
              </Text>
            </View>
          )}

          {videoEvidence.consentStatus === 'denied' && (
            <View style={styles.fallbackBox}>
              <Text style={styles.fallbackText}>
                Customer declined video consent. Non-blocking fallback active.
              </Text>
            </View>
          )}
        </View>
      </View>
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
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  validCard: {
    borderColor: THEME.colors.borderLight,
    backgroundColor: THEME.colors.surfaceElevated,
  },
  pendingCard: {
    borderColor: THEME.colors.border,
  },
  optionalCard: {
    borderColor: THEME.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleContainer: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  mustTag: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  mustTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
  },
  optionalTag: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  optionalTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  itemSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  statusTag: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  statusTagActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontFamily.mono,
  },
  statusTagTextActive: {
    color: '#000000',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  metaText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
    gap: 5,
  },
  callButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  endCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#3F3F46',
    gap: 5,
  },
  endCallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  consentSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  outlineActionBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    backgroundColor: THEME.colors.surfaceElevated,
  },
  outlineActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  pendingConsentBox: {
    gap: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  simActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  simBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.xs,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    alignItems: 'center',
  },
  simBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  grantedBox: {
    gap: 8,
  },
  grantedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  solidActionBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: '#FFFFFF',
  },
  solidActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  recordedPill: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 8,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  recordedText: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
    fontWeight: '600',
  },
  fallbackBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 8,
    borderRadius: THEME.borderRadius.sm,
  },
  fallbackText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 15,
  },
});
