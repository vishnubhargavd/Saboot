import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { THEME } from '../constants/theme';
import { ShiftMetrics } from '../types/delivery';

interface MetricCardProps {
  metrics: ShiftMetrics;
}

export const MetricCard: React.FC<MetricCardProps> = ({ metrics }) => {
  return (
    <View style={styles.container}>
      <View style={styles.metricItem}>
        <Text style={styles.label}>QUEUE</Text>
        <Text style={styles.value}>{metrics.totalDeliveries}</Text>
        <Text style={styles.subText}>{metrics.completed} Done</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricItem}>
        <Text style={styles.label}>VERIFIED</Text>
        <Text style={styles.value}>{metrics.verifiedAttempts}</Text>
        <Text style={styles.subText}>Genuine</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricItem}>
        <Text style={styles.label}>REJECTED</Text>
        <Text style={styles.value}>{metrics.rejectedAttempts}</Text>
        <Text style={styles.subText}>Failed</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricItem}>
        <Text style={styles.label}>REVIEW</Text>
        <Text style={styles.value}>{metrics.reviewAttempts}</Text>
        <Text style={styles.subText}>Ops Queue</Text>
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
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    fontFamily: THEME.typography.fontFamily.bold,
  },
  subText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: THEME.colors.border,
  },
});
