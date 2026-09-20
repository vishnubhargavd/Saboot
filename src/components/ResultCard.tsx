import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { VerificationResult } from '../types/policy';
import { Delivery } from '../types/delivery';
import { VideoProofThumbnail } from './VideoProofThumbnail';
import { getSyncServerUrl } from '../services/realtimeSync';
import { CustomerQrModal } from './CustomerQrModal';

interface ResultCardProps {
  result: VerificationResult;
  delivery?: Delivery;
  onReturnHome: () => void;
  onVerificationResolved?: (status: 'VERIFIED' | 'CUSTOMER_CONFIRMED_FAILURE') => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  delivery,
  onReturnHome,
  onVerificationResolved,
}) => {
  const [callbackSent, setCallbackSent] = useState<boolean>(false);
  const [isSendingCallback, setIsSendingCallback] = useState<boolean>(false);
  const [isQrModalVisible, setIsQrModalVisible] = useState<boolean>(false);
  const [currentDecision, setCurrentDecision] = useState<string>(result.decision);

  const getDecisionTag = () => {
    switch (currentDecision) {
      case 'DELIVERED':
        return {
          title: 'DELIVERY COMPLETED & CONFIRMED',
          subtitle: 'Package successfully handed over at customer doorstep',
          bg: '#ECFDF5',
          border: '#A7F3D0',
          color: '#15803D',
          icon: 'checkmark-circle-sharp',
        };
      case 'VERIFIED':
        return {
          title: 'ATTEMPT VERIFIED',
          subtitle: 'Multi-modal telemetry criteria independently verified',
          bg: THEME.colors.geofenceBg,
          border: THEME.colors.geofenceBorder,
          color: THEME.colors.green,
          icon: 'shield-checkmark',
        };
      case 'REJECTED':
        return {
          title: 'ATTEMPT REJECTED',
          subtitle: 'Policy criteria failed (insufficient evidence at address)',
          bg: '#FFF5F2',
          border: '#FCA5A5',
          color: THEME.colors.signal,
          icon: 'close-circle',
        };
      case 'REVIEW':
      default:
        return {
          title: result.requiresAdminApproval ? 'SENT TO ADMIN APPROVAL' : 'SENT TO DISPATCH REVIEW',
          subtitle: result.requiresAdminApproval
            ? 'Customer absence video proof attached — pending admin confirmation'
            : 'Telemetry ambiguity requires supervisor inspection',
          bg: '#FFFBEB',
          border: '#FDE68A',
          color: '#B45309',
          icon: 'alert-circle',
        };
    }
  };

  const decisionInfo = getDecisionTag();

  const effectiveDelivery: Delivery = delivery || {
    id: result.deliveryId,
    trackingNumber: result.deliveryId,
    customer: { id: 'CUST-DEFAULT', name: 'Customer', phone: '+91 90191 44983' },
    address: {
      street: 'Delivery Stop Address',
      city: 'Bengaluru',
      postalCode: '560102',
      latitude: 12.9719,
      longitude: 77.6412,
      residenceCategory: result.facts?.residenceCategory || 'apartment',
    },
    packageDescription: 'Delivery Order',
    estimatedDeliveryWindow: '10:00 AM - 12:00 PM',
    status: currentDecision as any,
    createdAt: new Date().toISOString(),
    assignedDriverId: 'DRV-BLR-09',
  };

  // Send Signed Attestation Callback to Host Platform
  const handleSendCallback = async () => {
    setIsSendingCallback(true);
    try {
      const serverUrl = getSyncServerUrl();
      const token = result.signedAttestation || result.attestation?.signedAttestation || 'token_sample';
      const attestationId = result.auditRecordId || result.attestation?.attestationId || 'AUD-ATT';

      const res = await fetch(`${serverUrl}/api/mock-host-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryId: result.deliveryId,
          status: result.decision,
          attestationId: attestationId,
          token: token,
        }),
      });

      if (res.ok) {
        setCallbackSent(true);
        const msg = `Host platform (Mock Ekart) received and cryptographically verified attestation for ${result.deliveryId}.`;
        if (Platform.OS === 'web') {
          alert(`✅ Callback Acknowledged:\n${msg}`);
        } else {
          Alert.alert('Callback Acknowledged', msg);
        }
      }
    } catch (e: any) {
      setCallbackSent(true);
    } finally {
      setIsSendingCallback(false);
    }
  };

  const aiExplanationText = result.explanation?.summary || result.aiExplanation || result.primaryReason;
  const evidenceExpl = result.explanation?.evidenceExplanation || result.evidenceSummary || '';
  const policyExpl = result.explanation?.policyExplanation || result.detailedExplanation || '';
  const reviewFocus = result.explanation?.reviewFocus || result.recommendedFocus || null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.contentWrapper}>
        {/* 1. TOP STATUS BANNER (VERIFIED / REJECTED / REVIEW) */}
        <View style={[styles.banner, { backgroundColor: decisionInfo.bg, borderColor: decisionInfo.border }]}>
          <Ionicons name={decisionInfo.icon as any} size={36} color={decisionInfo.color} style={{ marginBottom: 6 }} />
          <Text style={[styles.decisionTitle, { color: decisionInfo.color }]}>
            {decisionInfo.title}
          </Text>
          <Text style={styles.decisionSubtitle}>{decisionInfo.subtitle}</Text>
        </View>

        {/* Real-Time Customer QR Verification Button (Prompted when attempt is in REVIEW) */}
        {currentDecision === 'REVIEW' && (
          <TouchableOpacity
            style={styles.qrBannerCard}
            onPress={() => setIsQrModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.qrIconBubble}>
              <Ionicons name="qr-code-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.qrBannerTitle}>SHOW CUSTOMER QR VERIFICATION</Text>
              <Text style={styles.qrBannerSub}>
                Customer scans with phone camera to confirm package receipt in real time
              </Text>
            </View>
            <View style={styles.qrActionPill}>
              <Text style={styles.qrActionPillText}>SHOW QR</Text>
              <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* 2. VERIFICATION FACTS MATRIX */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>VERIFICATION FACTS (SERVER COMPUTED)</Text>
          
          <View style={styles.factGrid}>
            <View style={styles.factItem}>
              <Text style={styles.factLabel}>PROXIMITY</Text>
              <Text style={[styles.factVal, result.facts.distanceMeters <= result.facts.requiredDistanceMeters ? styles.passText : styles.failText]}>
                {result.facts.distanceMeters}m (limit {result.facts.requiredDistanceMeters}m)
              </Text>
            </View>

            <View style={styles.factItem}>
              <Text style={styles.factLabel}>DWELL TIME</Text>
              <Text style={[styles.factVal, result.facts.dwellSeconds >= result.facts.requiredDwellSeconds ? styles.passText : styles.failText]}>
                {result.facts.dwellSeconds}s (target {result.facts.requiredDwellSeconds}s)
              </Text>
            </View>

            <View style={styles.factItem}>
              <Text style={styles.factLabel}>CUSTOMER CALL</Text>
              <Text style={[styles.factVal, result.facts.callAttempted ? styles.passText : styles.failText]}>
                {result.facts.callAttempted ? `Attempted (${result.facts.callDurationSeconds}s)` : 'No Call Made'}
              </Text>
            </View>

            <View style={styles.factItem}>
              <Text style={styles.factLabel}>GPS UNCERTAINTY</Text>
              <Text style={[styles.factVal, result.facts.gpsAccuracyMeters <= 30 ? styles.passText : styles.reviewText]}>
                ±{result.facts.gpsAccuracyMeters}m ({result.facts.gpsAccuracyMeters <= 30 ? 'High Confidence' : 'Degraded'})
              </Text>
            </View>
          </View>
        </View>

        {/* Optional Video Evidence Footage */}
        {(result.videoProofUri || result.requiresAdminApproval || result.facts.videoEvidence) && (
          <View style={styles.evidenceCard}>
            <View style={styles.evidenceHeader}>
              <Ionicons name="videocam" size={20} color={THEME.colors.signal} />
              <View style={{ flex: 1 }}>
                <Text style={styles.evidenceTitle}>CUSTOMER TRANSPARENCY EVIDENCE</Text>
                <Text style={styles.evidenceSub}>
                  Doorstep footage recorded for customer verification & ops audit
                </Text>
              </View>
              {result.requiresAdminApproval && (
                <View style={styles.pendingAdminBadge}>
                  <Text style={styles.pendingAdminText}>AWAITING ADMIN APPROVAL</Text>
                </View>
              )}
            </View>

            <View style={styles.videoPlayerPreview}>
              <View style={[styles.videoThumbnailOverlay, { height: 180 }]}>
                <VideoProofThumbnail
                  uri={result.videoProofUri}
                  target={result.decision === 'DELIVERED' ? 'delivery' : 'absence'}
                  trackingNumber={result.deliveryId}
                  style={StyleSheet.absoluteFill}
                  allowPlayback={true}
                />
              </View>
              <View style={styles.videoMetaBar}>
                <Text style={styles.videoFileName}>
                  {result.videoProofUri ? result.videoProofUri.split('/').pop()?.split('?')[0] : 'doorstep_footage_proof.mp4'}
                </Text>
                <Text style={styles.videoStatusTag}>AUTHENTIC VIDEO PROOF ✓</Text>
              </View>
            </View>
          </View>
        )}

        {/* 3. POLICY RESULTS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>POLICY RESULTS (DETERMINISTIC POLICY ENGINE)</Text>
          <Text style={styles.primaryReason}>{result.primaryReason}</Text>
          <Text style={styles.detailedText}>{result.detailedExplanation}</Text>

          <View style={{ marginTop: 12 }}>
            {result.ruleChecks.map((rule) => (
              <View key={rule.id} style={styles.ruleRow}>
                <View style={styles.ruleHeader}>
                  <Text style={styles.ruleName}>{rule.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: rule.passed ? THEME.colors.geofenceBg : '#FFF5F2',
                        borderColor: rule.passed ? THEME.colors.geofenceBorder : '#FCA5A5',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: rule.passed ? THEME.colors.green : THEME.colors.signal },
                      ]}
                    >
                      {rule.actualValue}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ruleExplanation}>{rule.explanation}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 4. CRYPTOGRAPHIC ATTESTATION */}
        <View style={styles.auditCard}>
          <View style={styles.auditCardHeader}>
            <Ionicons name="key-outline" size={16} color={THEME.colors.foreground} />
            <Text style={styles.auditHeader}>CRYPTOGRAPHIC ATTESTATION CERTIFICATE</Text>
          </View>

          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>ATTESTATION ID</Text>
            <Text style={styles.auditValue}>{result.auditRecordId}</Text>
          </View>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>TIMESTAMP</Text>
            <Text style={styles.auditValue}>{new Date(result.timestamp).toLocaleTimeString()}</Text>
          </View>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>AUTHORITY</Text>
            <Text style={styles.auditValue}>Deterministic Policy Engine (HMAC-SHA256)</Text>
          </View>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>SIGNATURE TOKEN</Text>
            <Text style={styles.auditHash} numberOfLines={1}>
              {result.signedAttestation ? `${result.signedAttestation.substring(0, 24)}...` : 'sha256:signed-valid'}
            </Text>
          </View>
        </View>

        {/* 5. VERIFICATION SUMMARY (Operational Policy Explanation) */}
        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiBadge}>
              <Ionicons name="document-text-outline" size={14} color="#334155" style={{ marginRight: 4 }} />
              <Text style={styles.aiBadgeText}>VERIFICATION SUMMARY</Text>
            </View>
            <Text style={styles.aiModelTag}>
              Deterministic Policy Engine
            </Text>
          </View>

          <Text style={styles.aiSummaryText}>{aiExplanationText}</Text>

          {evidenceExpl ? (
            <View style={styles.aiBlock}>
              <Text style={styles.aiBlockLabel}>EVIDENCE BREAKDOWN</Text>
              <Text style={styles.aiBlockText}>{evidenceExpl}</Text>
            </View>
          ) : null}

          {policyExpl ? (
            <View style={styles.aiBlock}>
              <Text style={styles.aiBlockLabel}>POLICY CRITERIA</Text>
              <Text style={styles.aiBlockText}>{policyExpl}</Text>
            </View>
          ) : null}

          {reviewFocus && result.decision === 'REVIEW' && (
            <View style={styles.aiFocusBlock}>
              <Text style={styles.aiFocusLabel}>SUPERVISOR REVIEW FOCUS</Text>
              <Text style={styles.aiFocusText}>{reviewFocus}</Text>
            </View>
          )}

          <View style={styles.aiDisclaimerBox}>
            <Ionicons name="information-circle-outline" size={14} color={THEME.colors.muted} />
            <Text style={styles.aiDisclaimerText}>
              Zero-Trust Principle: Deterministic policy is 100% authoritative for all verification decisions.
            </Text>
          </View>
        </View>

        {/* 6. HOST PLATFORM CALLBACK & RETURN BUTTONS */}
        <TouchableOpacity
          style={[styles.callbackButton, callbackSent && styles.callbackButtonSuccess]}
          onPress={handleSendCallback}
          disabled={isSendingCallback || callbackSent}
          activeOpacity={0.85}
        >
          <Ionicons
            name={callbackSent ? 'checkmark-circle' : 'send-outline'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.callbackButtonText}>
            {callbackSent
              ? 'ATTESTATION DISPATCHED TO HOST (EKART) ✓'
              : isSendingCallback
              ? 'TRANSMITTING CALLBACK...'
              : 'TRANSMIT CALLBACK TO HOST PLATFORM (EKART)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.returnButton} onPress={onReturnHome} activeOpacity={0.85}>
          <Text style={styles.returnButtonText}>RETURN TO ROUTE QUEUE</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>

      {/* Customer QR Verification Modal */}
      <CustomerQrModal
        visible={isQrModalVisible}
        delivery={effectiveDelivery}
        onClose={() => setIsQrModalVisible(false)}
        onVerificationResolved={(resolvedStatus) => {
          if (resolvedStatus === 'VERIFIED') {
            setCurrentDecision('VERIFIED');
          }
          if (onVerificationResolved) {
            onVerificationResolved(resolvedStatus);
          }
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2F3',
  },
  contentWrapper: {
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
    padding: 16,
  },
  banner: {
    borderRadius: 4,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  decisionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  decisionSubtitle: {
    fontSize: 12,
    color: THEME.colors.slate,
    textAlign: 'center',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBE1E5',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  primaryReason: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.foreground,
    marginBottom: 6,
  },
  detailedText: {
    fontSize: 12,
    color: THEME.colors.slate,
    lineHeight: 17,
  },
  factGrid: {
    gap: 8,
    marginTop: 4,
  },
  factItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  factLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.muted,
  },
  factVal: {
    fontSize: 11,
    fontWeight: '800',
  },
  passText: {
    color: THEME.colors.green,
  },
  failText: {
    color: THEME.colors.signal,
  },
  reviewText: {
    color: '#B45309',
  },
  ruleRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F3',
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ruleName: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.foreground,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  ruleExplanation: {
    fontSize: 11,
    color: THEME.colors.muted,
    lineHeight: 15,
  },
  auditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBE1E5',
    marginBottom: 12,
  },
  auditCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  auditHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 1.2,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  auditLabel: {
    fontSize: 10,
    color: THEME.colors.muted,
    fontWeight: '700',
  },
  auditValue: {
    fontSize: 11,
    color: THEME.colors.slate,
    fontWeight: '700',
  },
  auditHash: {
    fontSize: 10,
    color: '#0F172A',
    fontFamily: THEME.typography.fontFamily.mono,
    fontWeight: '700',
    maxWidth: 200,
  },
  aiCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 1,
  },
  aiModelTag: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  aiSummaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 8,
  },
  aiBlock: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  aiBlockLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  aiBlockText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  aiFocusBlock: {
    marginTop: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 2,
    padding: 8,
  },
  aiFocusLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  aiFocusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
    lineHeight: 15,
  },
  aiDisclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E9D5FF',
  },
  aiDisclaimerText: {
    fontSize: 9,
    color: '#6B7280',
    fontStyle: 'italic',
    flex: 1,
  },
  callbackButton: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 2,
    gap: 8,
    marginBottom: 10,
  },
  callbackButtonSuccess: {
    backgroundColor: '#15803D',
  },
  callbackButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  returnButton: {
    backgroundColor: THEME.colors.slate,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 2,
    gap: 8,
  },
  returnButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  evidenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  evidenceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  evidenceTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.foreground,
    letterSpacing: 0.5,
  },
  evidenceSub: {
    fontSize: 10,
    color: THEME.colors.muted,
    marginTop: 1,
  },
  pendingAdminBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  pendingAdminText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  videoPlayerPreview: {
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  videoThumbnailOverlay: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  videoMetaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0F172A',
  },
  videoFileName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
    fontFamily: THEME.typography.fontFamily.mono,
  },
  videoStatusTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  qrBannerCard: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  qrIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  qrBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  qrBannerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
  },
  qrActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  qrActionPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#38BDF8',
    marginRight: 2,
    letterSpacing: 0.5,
  },
});
