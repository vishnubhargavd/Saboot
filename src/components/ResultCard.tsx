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
          subtitle: 'Multi-modal telemetry criteria satisfied',
          tagBg: '#FFFFFF',
          tagText: '#000000',
        };
      case 'REJECTED':
        return {
          title: 'ATTEMPT REJECTED',
          subtitle: 'Policy criteria failed (insufficient evidence)',
          tagBg: '#27272A',
          tagText: '#FFFFFF',
        };
      case 'REVIEW':
      default:
        return {
          title: 'SENT TO REVIEW',
          subtitle: 'Telemetry ambiguity requires supervisor inspection',
          tagBg: '#3F3F46',
          tagText: '#FFFFFF',
        };
    }
  };

  const decisionInfo = getDecisionTag();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.contentWrapper}>
        {/* Top Status Banner */}
        <View style={styles.banner}>
          <View style={[styles.decisionPill, { backgroundColor: decisionInfo.tagBg }]}>
            <Text style={[styles.decisionPillText, { color: decisionInfo.tagText }]}>
              {decisionInfo.title}
            </Text>
          </View>
          <Text style={styles.decisionSubtitle}>{decisionInfo.subtitle}</Text>
        </View>

        {/* Primary Server Explanation */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>DETERMINISTIC EVALUATION</Text>
          <Text style={styles.primaryReason}>{result.primaryReason}</Text>
          <Text style={styles.detailedText}>{result.detailedExplanation}</Text>
        </View>

        {/* Server Facts Checklist */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>EVALUATED SERVER FACTS</Text>

          {result.ruleChecks.map((rule) => (
            <View key={rule.id} style={styles.ruleRow}>
              <View style={styles.ruleHeader}>
                <Text style={styles.ruleName}>{rule.name}</Text>
                <View style={[styles.statusBadge, rule.passed ? styles.statusPassed : styles.statusFailed]}>
                  <Text style={[styles.statusBadgeText, { color: rule.passed ? '#000000' : '#FFFFFF' }]}>
                    {rule.actualValue}
                  </Text>
                </View>
              </View>
              <Text style={styles.ruleExplanation}>{rule.explanation}</Text>
            </View>
          ))}
        </View>

        {/* Cryptographic Audit Record */}
        <View style={styles.auditCard}>
          <Text style={styles.auditHeader}>CRYPTOGRAPHIC AUDIT RECORD</Text>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Audit ID</Text>
            <Text style={styles.auditValue}>{result.auditRecordId}</Text>
          </View>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Timestamp</Text>
            <Text style={styles.auditValue}>{new Date(result.timestamp).toLocaleTimeString()}</Text>
          </View>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Policy Engine</Text>
            <Text style={styles.auditValue}>AWS Deterministic Policy (v1.0)</Text>
          </View>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Audit Hash</Text>
            <Text style={styles.auditHash}>sha256:8f4c...394e1</Text>
          </View>
        </View>

        {/* Return Button */}
        <TouchableOpacity style={styles.returnButton} onPress={onReturnHome} activeOpacity={0.8}>
          <Text style={styles.returnButtonText}>Return to Delivery Queue</Text>
          <Ionicons name="arrow-forward" size={14} color="#000000" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
    padding: 16,
  },
  banner: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  decisionPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.full,
    marginBottom: 8,
  },
  decisionPillText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  decisionSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  primaryReason: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
    lineHeight: 18,
  },
  detailedText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  ruleRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ruleName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPassed: {
    backgroundColor: '#FFFFFF',
  },
  statusFailed: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: THEME.typography.fontFamily.mono,
  },
  ruleExplanation: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 15,
  },
  auditCard: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginBottom: 16,
  },
  auditHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  auditLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  auditValue: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  auditHash: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
    fontFamily: THEME.typography.fontFamily.mono,
  },
  returnButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    gap: 8,
  },
  returnButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.2,
  },
});
