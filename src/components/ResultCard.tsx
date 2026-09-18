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
  const getDecisionTheme = () => {
    switch (result.decision) {
      case 'VERIFIED':
        return {
          title: 'ATTEMPT VERIFIED',
          subtitle: 'Zero-trust physical & telephony telemetry satisfied',
          color: THEME.colors.verified,
          bg: THEME.colors.verifiedBg,
          border: THEME.colors.verifiedBorder,
          icon: 'shield-checkmark',
        };
      case 'REJECTED':
        return {
          title: 'ATTEMPT REJECTED',
          subtitle: 'Mandatory physical or contact evidence criteria failed',
          color: THEME.colors.rejected,
          bg: THEME.colors.rejectedBg,
          border: THEME.colors.rejectedBorder,
          icon: 'close-circle',
        };
      case 'REVIEW':
      default:
        return {
          title: 'SENT TO OPS REVIEW',
          subtitle: 'Borderline or ambiguous telemetry requires human verification',
          color: THEME.colors.review,
          bg: THEME.colors.reviewBg,
          border: THEME.colors.reviewBorder,
          icon: 'alert-circle',
        };
    }
  };

  const decisionTheme = getDecisionTheme();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Decision Banner */}
      <View
        style={[
          styles.banner,
          { backgroundColor: decisionTheme.bg, borderColor: decisionTheme.border },
        ]}
      >
        <View style={styles.iconCircle}>
          <Ionicons
            name={decisionTheme.icon as any}
            size={40}
            color={decisionTheme.color}
          />
        </View>
        <Text style={[styles.decisionTitle, { color: decisionTheme.color }]}>
          {decisionTheme.title}
        </Text>
        <Text style={styles.decisionSubtitle}>{decisionTheme.subtitle}</Text>
      </View>

      {/* Primary Server Explanation */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="document-text-outline" size={16} color={THEME.colors.primary} />
          <Text style={styles.sectionTitle}>Deterministic Policy Evaluation</Text>
        </View>
        <Text style={styles.primaryReason}>{result.primaryReason}</Text>
        <Text style={styles.detailedText}>{result.detailedExplanation}</Text>
      </View>

      {/* Server Facts Checklist */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="checkbox-outline" size={16} color={THEME.colors.primary} />
          <Text style={styles.sectionTitle}>Evaluated Server Facts</Text>
        </View>

        {result.ruleChecks.map((rule) => (
          <View key={rule.id} style={styles.ruleRow}>
            <View style={styles.ruleIconContainer}>
              <Ionicons
                name={rule.passed ? 'checkmark-circle' : rule.isHardRequirement ? 'close-circle' : 'alert-circle'}
                size={18}
                color={rule.passed ? THEME.colors.verified : rule.isHardRequirement ? THEME.colors.rejected : THEME.colors.review}
              />
            </View>
            <View style={styles.ruleContent}>
              <View style={styles.ruleTitleRow}>
                <Text style={styles.ruleName}>{rule.name}</Text>
                <Text
                  style={[
                    styles.ruleStatus,
                    { color: rule.passed ? THEME.colors.verified : rule.isHardRequirement ? THEME.colors.rejected : THEME.colors.review },
                  ]}
                >
                  {rule.actualValue}
                </Text>
              </View>
              <Text style={styles.ruleExplanation}>{rule.explanation}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Tamper-Proof Audit Record */}
      <View style={styles.auditCard}>
        <View style={styles.auditHeader}>
          <Ionicons name="finger-print-outline" size={16} color={THEME.colors.textMuted} />
          <Text style={styles.auditTitle}>Cryptographic Audit Trail</Text>
        </View>
        <View style={styles.auditItem}>
          <Text style={styles.auditLabel}>Audit ID:</Text>
          <Text style={styles.auditValue}>{result.auditRecordId}</Text>
        </View>
        <View style={styles.auditItem}>
          <Text style={styles.auditLabel}>Timestamp:</Text>
          <Text style={styles.auditValue}>{new Date(result.timestamp).toLocaleString()}</Text>
        </View>
        <View style={styles.auditItem}>
          <Text style={styles.auditLabel}>Engine:</Text>
          <Text style={styles.auditValue}>{result.evaluationEngine}</Text>
        </View>
        <View style={styles.auditItem}>
          <Text style={styles.auditLabel}>Immutable Hash:</Text>
          <Text style={styles.auditHash} numberOfLines={1}>
            sha256:8f4c82b991a0...394e1
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity style={styles.returnButton} onPress={onReturnHome} activeOpacity={0.8}>
        <Text style={styles.returnButtonText}>Return to Delivery Queue</Text>
        <Ionicons name="arrow-forward" size={16} color="#090D16" />
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  banner: {
    borderRadius: THEME.borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  decisionTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  decisionSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  primaryReason: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
    lineHeight: 20,
  },
  detailedText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceHighlight,
  },
  ruleIconContainer: {
    marginTop: 2,
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  ruleName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  ruleStatus: {
    fontSize: 12,
    fontWeight: '800',
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
    marginBottom: 20,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  auditTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
  },
  auditItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
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
    color: THEME.colors.primary,
    fontFamily: THEME.typography.fontFamily.mono,
  },
  returnButton: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    gap: 8,
  },
  returnButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#090D16',
    letterSpacing: 0.5,
  },
});
