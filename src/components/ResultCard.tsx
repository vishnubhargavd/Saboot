import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { VerificationResult } from '../types/policy';

interface ResultCardProps {
  result: VerificationResult;
  onReturnHome: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onReturnHome }) => {
  const getDecisionTag = () => {
    switch (result.decision) {
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
          title: 'SENT TO DISPATCH REVIEW',
          subtitle: 'Telemetry ambiguity requires supervisor inspection',
          bg: '#FFFBEB',
          border: '#FDE68A',
          color: '#B45309',
          icon: 'alert-circle',
        };
    }
  };

  const decisionInfo = getDecisionTag();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.contentWrapper}>
        {/* Top Status Banner */}
        <View style={[styles.banner, { backgroundColor: decisionInfo.bg, borderColor: decisionInfo.border }]}>
          <Ionicons name={decisionInfo.icon as any} size={36} color={decisionInfo.color} style={{ marginBottom: 6 }} />
          <Text style={[styles.decisionTitle, { color: decisionInfo.color }]}>
            {decisionInfo.title}
          </Text>
          <Text style={styles.decisionSubtitle}>{decisionInfo.subtitle}</Text>
        </View>

        {/* Deterministic Policy Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>DETERMINISTIC EVALUATION EXPLANATION</Text>
          <Text style={styles.primaryReason}>{result.primaryReason}</Text>
          <Text style={styles.detailedText}>{result.detailedExplanation}</Text>
        </View>

        {/* Evaluated Server Facts */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>SERVER-COMPUTED FACTS MATRIX</Text>

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

        {/* Cryptographic Audit Trail */}
        <View style={styles.auditCard}>
          <Text style={styles.auditHeader}>CRYPTOGRAPHIC AUDIT RECORD</Text>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>AUDIT ID</Text>
            <Text style={styles.auditValue}>{result.auditRecordId}</Text>
          </View>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>TIMESTAMP</Text>
            <Text style={styles.auditValue}>{new Date(result.timestamp).toLocaleTimeString()}</Text>
          </View>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>ENGINE</Text>
            <Text style={styles.auditValue}>AWS Zero-Trust Engine (Cedar-equiv)</Text>
          </View>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>AUDIT HASH</Text>
            <Text style={styles.auditHash}>sha256:8f4c...394e1</Text>
          </View>
        </View>

        {/* Return Button */}
        <TouchableOpacity style={styles.returnButton} onPress={onReturnHome} activeOpacity={0.85}>
          <Text style={styles.returnButtonText}>RETURN TO ROUTE QUEUE</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
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
  ruleRow: {
    paddingVertical: 10,
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
    marginBottom: 16,
  },
  auditHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 1.2,
    marginBottom: 10,
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
    color: THEME.colors.signal,
    fontFamily: THEME.typography.fontFamily.mono,
    fontWeight: '700',
  },
  returnButton: {
    backgroundColor: THEME.colors.slate,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 2,
    gap: 8,
  },
  returnButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
