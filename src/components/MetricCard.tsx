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
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>STOPS</Text>
        <Text style={styles.statValue}>{metrics.totalDeliveries}</Text>
        <Text style={styles.statSub}>{metrics.completed} Done</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.statBox}>
        <Text style={[styles.statLabel, { color: THEME.colors.green }]}>VERIFIED</Text>
        <Text style={[styles.statValue, { color: THEME.colors.green }]}>{metrics.verifiedAttempts}</Text>
        <Text style={styles.statSub}>Passed</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.statBox}>
        <Text style={[styles.statLabel, { color: THEME.colors.signal }]}>REJECTED</Text>
        <Text style={[styles.statValue, { color: THEME.colors.signal }]}>{metrics.rejectedAttempts}</Text>
        <Text style={styles.statSub}>Failed</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.statBox}>
        <Text style={styles.statLabel}>REVIEW</Text>
        <Text style={styles.statValue}>{metrics.reviewAttempts}</Text>
        <Text style={styles.statSub}>Queue</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBE1E5',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: THEME.colors.muted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.foreground,
  },
  statSub: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.muted,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#DBE1E5',
  },
});
