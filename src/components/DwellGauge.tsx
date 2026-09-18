import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { ResidenceCategory } from '../types/delivery';
import { DWELL_POLICY_CONFIG } from '../constants/dwellPolicy';

interface DwellGaugeProps {
  residenceCategory: ResidenceCategory;
  currentDwellSeconds: number;
  isInsideGeofence: boolean;
  distanceMeters: number | null;
}

export const DwellGauge: React.FC<DwellGaugeProps> = ({
  residenceCategory,
  currentDwellSeconds,
  isInsideGeofence,
}) => {
  const dwellRule = DWELL_POLICY_CONFIG[residenceCategory];
  const targetSeconds = dwellRule.requiredDwellSeconds;
  const progressPercent = Math.min(100, Math.round((currentDwellSeconds / targetSeconds) * 100));
  const isSatisfied = currentDwellSeconds >= targetSeconds;

  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progressPercent,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [progressPercent, animatedWidth]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>DWELL REQUIREMENT</Text>
        </View>

        <View
          style={[
            styles.geofencePill,
            isInsideGeofence ? styles.geofenceActive : styles.geofenceInactive,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isInsideGeofence ? '#FFFFFF' : THEME.colors.textMuted },
            ]}
          />
          <Text
            style={[
              styles.geofenceText,
              { color: isInsideGeofence ? '#FFFFFF' : THEME.colors.textMuted },
            ]}
          >
            {isInsideGeofence ? 'Inside 50m Geofence' : 'Outside Geofence'}
          </Text>
        </View>
      </View>

      {/* Main Counter & Target */}
      <View style={styles.counterRow}>
        <View style={styles.secondsContainer}>
          <Text style={styles.secondsValue}>{currentDwellSeconds}s</Text>
          <Text style={styles.secondsTarget}> / {targetSeconds}s required</Text>
        </View>

        <View style={[styles.thresholdBadge, isSatisfied ? styles.thresholdSatisfied : styles.thresholdPending]}>
          <Text style={[styles.thresholdText, { color: isSatisfied ? '#000000' : '#FFFFFF' }]}>
            {isSatisfied ? 'THRESHOLD MET' : `${targetSeconds - currentDwellSeconds}s LEFT`}
          </Text>
        </View>
      </View>

      {/* Animated Progress Bar */}
      <View style={styles.progressBarTrack}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: isSatisfied ? '#FFFFFF' : '#A1A1AA',
            },
          ]}
        />
      </View>

      {/* Category Rationale */}
      <View style={styles.rationaleBox}>
        <Text style={styles.rationaleText}>
          <Text style={{ fontWeight: '700', color: THEME.colors.textPrimary }}>
            {dwellRule.displayName}:{' '}
          </Text>
          {dwellRule.rationale}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
  },
  geofencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    gap: 5,
  },
  geofenceActive: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.borderLight,
  },
  geofenceInactive: {
    backgroundColor: THEME.colors.background,
    borderColor: THEME.colors.border,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  geofenceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  secondsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  secondsValue: {
    fontSize: 34,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    fontFamily: THEME.typography.fontFamily.mono,
    letterSpacing: -0.5,
  },
  secondsTarget: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    marginLeft: 4,
  },
  thresholdBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
  },
  thresholdSatisfied: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  thresholdPending: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.borderLight,
  },
  thresholdText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  rationaleBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
  },
  rationaleText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
});
