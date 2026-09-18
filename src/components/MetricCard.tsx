import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { ShiftMetrics } from '../types/delivery';

interface MetricCardProps {
  metrics: ShiftMetrics;
}

export const MetricCard: React.FC<MetricCardProps> = ({ metrics }) => {
  return (
    <View style={styles.container}>
      <View style={styles.metricItem}>
        <Text style={styles.label}>TOTAL</Text>
        <Text style={[styles.value, { color: THEME.colors.textPrimary }]}>
          {metrics.totalDeliveries}
        </Text>
        <View style={styles.subBadge}>
          <Text style={styles.subText}>{metrics.completed} Done</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricItem}>
        <View style={styles.labelRow}>
          <Ionicons name="checkmark-circle" size={12} color={THEME.colors.verified} />
          <Text style={[styles.label, { color: THEME.colors.verified }]}>VERIFIED</Text>
        </View>
        <Text style={[styles.value, { color: THEME.colors.verified }]}>
          {metrics.verifiedAttempts}
        </Text>
        <View style={[styles.subBadge, { backgroundColor: THEME.colors.verifiedBg }]}>
          <Text style={[styles.subText, { color: THEME.colors.verified }]}>Genuine</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricItem}>
        <View style={styles.labelRow}>
          <Ionicons name="close-circle" size={12} color={THEME.colors.rejected} />
          <Text style={[styles.label, { color: THEME.colors.rejected }]}>REJECTED</Text>
        </View>
        <Text style={[styles.value, { color: THEME.colors.rejected }]}>
          {metrics.rejectedAttempts}
        </Text>
        <View style={[styles.subBadge, { backgroundColor: THEME.colors.rejectedBg }]}>
          <Text style={[styles.subText, { color: THEME.colors.rejected }]}>Failed Rules</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricItem}>
        <View style={styles.labelRow}>
          <Ionicons name="alert-circle" size={12} color={THEME.colors.review} />
          <Text style={[styles.label, { color: THEME.colors.review }]}>REVIEW</Text>
        </View>
        <Text style={[styles.value, { color: THEME.colors.review }]}>
          {metrics.reviewAttempts}
        </Text>
        <View style={[styles.subBadge, { backgroundColor: THEME.colors.reviewBg }]}>
          <Text style={[styles.subText, { color: THEME.colors.review }]}>Ops Queue</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  subBadge: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subText: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: THEME.colors.border,
  },
});
