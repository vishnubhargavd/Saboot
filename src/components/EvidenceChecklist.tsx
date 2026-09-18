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
      <Text style={styles.sectionTitle}>EVIDENCE COLLECTION CHECKLIST</Text>
      <Text style={styles.sectionSubtitle}>
        Raw sensor telemetry collected for server-side policy evaluation
      </Text>

      {/* 1. GPS Proximity Card (MUST) */}
      <View style={[styles.evidenceCard, isDistanceValid ? styles.validCard : styles.pendingCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: isDistanceValid ? THEME.colors.verifiedBg : THEME.colors.surfaceHighlight },
              ]}
            >
              <Ionicons
                name="navigate"
                size={16}
                color={isDistanceValid ? THEME.colors.verified : THEME.colors.primary}
              />
            </View>
            <View>
              <View style={styles.badgeRow}>
                <Text style={styles.cardTitle}>GPS Proximity Geofence</Text>
                <View style={styles.mustTag}>
                  <Text style={styles.mustTagText}>MUST HAVE</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>Target: ≤ 50m to destination</Text>
            </View>
          </View>

          <View
            style={[
              styles.statusPill,
              isDistanceValid ? styles.statusPillValid : styles.statusPillPending,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: isDistanceValid ? THEME.colors.verified : THEME.colors.rejected },
              ]}
            >
              {distanceMeters !== null ? `${distanceMeters}m` : 'Locating...'}
            </Text>
          </View>
        </View>

        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryText}>
            Accuracy: <Text style={{ color: THEME.colors.textPrimary }}>±{gpsAccuracy}m</Text>
          </Text>
          <Text style={styles.telemetryText}>
            Status:{' '}
            <Text style={{ color: isDistanceValid ? THEME.colors.verified : THEME.colors.review }}>
              {isDistanceValid ? 'Inside 50m Geofence' : 'Outside Geofence'}
            </Text>
          </Text>
        </View>
      </View>

      {/* 2. Dwell Time Card (MUST) */}
      <View style={[styles.evidenceCard, isDwellValid ? styles.validCard : styles.pendingCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: isDwellValid ? THEME.colors.verifiedBg : THEME.colors.surfaceHighlight },
              ]}
            >
              <Ionicons
                name="time"
                size={16}
                color={isDwellValid ? THEME.colors.verified : THEME.colors.primary}
              />
            </View>
            <View>
              <View style={styles.badgeRow}>
                <Text style={styles.cardTitle}>Residence Dwell Time</Text>
                <View style={styles.mustTag}>
                  <Text style={styles.mustTagText}>MUST HAVE</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                Required: ≥ {requiredDwellSeconds}s at location
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusPill,
              isDwellValid ? styles.statusPillValid : styles.statusPillPending,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: isDwellValid ? THEME.colors.verified : THEME.colors.review },
              ]}
            >
              {dwellSeconds}s / {requiredDwellSeconds}s
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Customer Call Telephony (MUST) */}
      <View style={[styles.evidenceCard, isCallValid ? styles.validCard : styles.pendingCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: isCallValid ? THEME.colors.verifiedBg : THEME.colors.surfaceHighlight },
              ]}
            >
              <Ionicons
                name="call"
                size={16}
                color={isCallValid ? THEME.colors.verified : THEME.colors.primary}
              />
            </View>
            <View>
              <View style={styles.badgeRow}>
                <Text style={styles.cardTitle}>Customer Telephony Call</Text>
                <View style={styles.mustTag}>
                  <Text style={styles.mustTagText}>MUST HAVE</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>{customerPhone}</Text>
            </View>
          </View>

          {isCalling ? (
            <TouchableOpacity style={styles.endCallButton} onPress={onEndCall}>
              <Ionicons name="call" size={14} color="#FFF" />
              <Text style={styles.endCallText}>End ({callDuration}s)</Text>
            </TouchableOpacity>
          ) : isCallValid ? (
            <View style={[styles.statusPill, styles.statusPillValid]}>
              <Ionicons name="checkmark-circle" size={12} color={THEME.colors.verified} />
              <Text style={[styles.statusPillText, { color: THEME.colors.verified }]}>
                {callEvidence.durationSeconds}s Logged
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.callButton} onPress={onStartCall}>
              <Ionicons name="call" size={14} color="#FFF" />
              <Text style={styles.callButtonText}>Call Customer</Text>
            </TouchableOpacity>
          )}
        </View>

        {isCallValid && (
          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryText}>
              Call ID: <Text style={{ color: THEME.colors.textPrimary }}>{callEvidence.telephonyCallId || 'SIM-LOG'}</Text>
            </Text>
            <Text style={styles.telemetryText}>
              Status: <Text style={{ color: THEME.colors.verified }}>Completed</Text>
            </Text>
          </View>
        )}
      </View>

      {/* 4. Video Evidence & Consent Pipeline (CORROBORATING - OPTIONAL) */}
      <View style={[styles.evidenceCard, styles.optionalCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Ionicons name="videocam" size={16} color={THEME.colors.simulation} />
            </View>
            <View>
              <View style={styles.badgeRow}>
                <Text style={styles.cardTitle}>Video Proof (Consent-Gated)</Text>
                <View style={styles.optionalTag}>
                  <Text style={styles.optionalTagText}>CORROBORATING</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                Customer SMS approval required • Non-blocking
              </Text>
            </View>
          </View>
        </View>

        {/* Consent Actions / States */}
        <View style={styles.consentContainer}>
          {videoEvidence.consentStatus === 'not_requested' && (
            <TouchableOpacity style={styles.consentBtn} onPress={onRequestConsent}>
              <Ionicons name="chatbox-ellipses-outline" size={14} color={THEME.colors.primary} />
              <Text style={styles.consentBtnText}>Send Consent SMS to Customer</Text>
            </TouchableOpacity>
          )}

          {videoEvidence.consentStatus === 'requested' && (
            <View style={styles.requestedBox}>
              <View style={styles.waitingRow}>
                <ActivityIndicator size="small" color={THEME.colors.primary} />
                <Text style={styles.waitingText}>Consent SMS sent. Waiting for customer approval...</Text>
              </View>

              <View style={styles.simConsentRow}>
                <TouchableOpacity
                  style={[styles.simConsentAction, { borderColor: THEME.colors.verified }]}
                  onPress={() => onSimulateConsent('granted')}
                >
                  <Text style={[styles.simConsentText, { color: THEME.colors.verified }]}>
                    Simulate Approve
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simConsentAction, { borderColor: THEME.colors.rejected }]}
                  onPress={() => onSimulateConsent('denied')}
                >
                  <Text style={[styles.simConsentText, { color: THEME.colors.rejected }]}>
                    Simulate Deny
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simConsentAction, { borderColor: THEME.colors.review }]}
                  onPress={() => onSimulateConsent('timed_out')}
                >
                  <Text style={[styles.simConsentText, { color: THEME.colors.review }]}>
                    Simulate Timeout
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {videoEvidence.consentStatus === 'granted' && (
            <View style={styles.grantedBox}>
              <View style={styles.grantedHeader}>
                <Ionicons name="checkmark-circle" size={16} color={THEME.colors.verified} />
                <Text style={styles.grantedText}>Customer Approved Video Capture</Text>
              </View>

              {videoEvidence.videoUri ? (
                <View style={styles.videoRecordedBadge}>
                  <Ionicons name="film-outline" size={14} color={THEME.colors.verified} />
                  <Text style={styles.videoRecordedText}>
                    Silent Video Evidence Recorded ({videoEvidence.durationSeconds || 6}s)
                  </Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.recordBtn} onPress={onRecordVideo}>
                  <Ionicons name="videocam" size={14} color="#FFF" />
                  <Text style={styles.recordBtnText}>Record Silent 6s Evidence Clip</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {videoEvidence.consentStatus === 'timed_out' && (
            <View style={styles.timedOutBox}>
              <Ionicons name="time-outline" size={14} color={THEME.colors.review} />
              <Text style={styles.timedOutText}>
                Consent timed out (3 min window). Proceeding with GPS + Call evidence.
              </Text>
            </View>
          )}

          {videoEvidence.consentStatus === 'denied' && (
            <View style={styles.deniedBox}>
              <Ionicons name="close-circle-outline" size={14} color={THEME.colors.rejected} />
              <Text style={styles.deniedText}>
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
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 12,
  },
  evidenceCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  validCard: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  pendingCard: {
    borderColor: THEME.colors.border,
  },
  optionalCard: {
    borderColor: 'rgba(168, 85, 247, 0.3)',
    backgroundColor: 'rgba(168, 85, 247, 0.03)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  mustTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  mustTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.rejected,
  },
  optionalTag: {
    backgroundColor: THEME.colors.simulationBg,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  optionalTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.simulation,
  },
  cardSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusPillValid: {
    backgroundColor: THEME.colors.verifiedBg,
    borderColor: THEME.colors.verifiedBorder,
  },
  statusPillPending: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.borderLight,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  telemetryText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#090D16',
  },
  endCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.rejected,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  endCallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  consentContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  consentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    gap: 6,
  },
  consentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  requestedBox: {
    gap: 8,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waitingText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  simConsentRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  simConsentAction: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  simConsentText: {
    fontSize: 10,
    fontWeight: '700',
  },
  grantedBox: {
    gap: 8,
  },
  grantedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  grantedText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.verified,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.simulation,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  recordBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  videoRecordedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.verifiedBg,
    padding: 8,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.colors.verifiedBorder,
  },
  videoRecordedText: {
    fontSize: 11,
    color: THEME.colors.verified,
    fontWeight: '600',
  },
  timedOutBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.reviewBg,
    padding: 8,
    borderRadius: 6,
    gap: 6,
  },
  timedOutText: {
    fontSize: 11,
    color: THEME.colors.review,
    flex: 1,
  },
  deniedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.rejectedBg,
    padding: 8,
    borderRadius: 6,
    gap: 6,
  },
  deniedText: {
    fontSize: 11,
    color: THEME.colors.rejected,
    flex: 1,
  },
});
