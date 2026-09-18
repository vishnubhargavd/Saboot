import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
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
  distanceMeters,
}) => {
  const dwellRule = DWELL_POLICY_CONFIG[residenceCategory];
  const targetSeconds = dwellRule.requiredDwellSeconds;
  const progressPercent = Math.min(100, Math.round((currentDwellSeconds / targetSeconds) * 100));
  const isSatisfied = currentDwellSeconds >= targetSeconds;

  const progressColor = isSatisfied
    ? THEME.colors.verified
    : currentDwellSeconds > 0
    ? THEME.colors.primary
    : THEME.colors.textMuted;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="timer-outline" size={18} color={THEME.colors.primary} />
          <Text style={styles.title}>Dwell Time Requirement</Text>
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
              { backgroundColor: isInsideGeofence ? THEME.colors.verified : THEME.colors.review },
            ]}
          />
          <Text
            style={[
              styles.geofenceText,
              { color: isInsideGeofence ? THEME.colors.verified : THEME.colors.review },
            ]}
          >
            {isInsideGeofence ? 'Inside 50m Geofence' : 'Outside Geofence'}
          </Text>
        </View>
      </View>

      {/* Main Counter & Target */}
      <View style={styles.counterRow}>
        <View style={styles.secondsContainer}>
          <Text style={[styles.secondsValue, { color: progressColor }]}>
            {currentDwellSeconds}s
          </Text>
          <Text style={styles.secondsTarget}> / {targetSeconds}s required</Text>
        </View>

        <View
          style={[
            styles.thresholdBadge,
            isSatisfied ? styles.thresholdSatisfied : styles.thresholdPending,
          ]}
        >
          <Ionicons
            name={isSatisfied ? 'checkmark-circle' : 'hourglass-outline'}
            size={14}
            color={isSatisfied ? THEME.colors.verified : THEME.colors.review}
          />
          <Text
            style={[
              styles.thresholdText,
              { color: isSatisfied ? THEME.colors.verified : THEME.colors.review },
            ]}
          >
            {isSatisfied ? 'Dwell Satisfied' : `${targetSeconds - currentDwellSeconds}s Remaining`}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>

      {/* Category Rationale */}
      <View style={styles.rationaleBox}>
        <Ionicons name="shield-outline" size={13} color={THEME.colors.textSecondary} />
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
    marginBottom: 16,
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
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  geofencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  geofenceActive: {
    backgroundColor: THEME.colors.verifiedBg,
    borderColor: THEME.colors.verifiedBorder,
  },
  geofenceInactive: {
    backgroundColor: THEME.colors.reviewBg,
    borderColor: THEME.colors.reviewBorder,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  geofenceText: {
    fontSize: 10,
    fontWeight: '700',
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
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  secondsTarget: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    marginLeft: 4,
  },
  thresholdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  thresholdSatisfied: {
    backgroundColor: THEME.colors.verifiedBg,
    borderColor: THEME.colors.verifiedBorder,
  },
  thresholdPending: {
    backgroundColor: THEME.colors.reviewBg,
    borderColor: THEME.colors.reviewBorder,
  },
  thresholdText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  rationaleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  rationaleText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    flex: 1,
  },
});
