import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { THEME } from '../constants/theme';
import { ResidenceCategory } from '../types/delivery';
import { DWELL_POLICY_CONFIG, getDwellRule } from '../constants/dwellPolicy';

interface DwellGaugeProps {
  residenceCategory: ResidenceCategory;
  currentDwellSeconds: number;
  isInsideGeofence: boolean;
  distanceMeters: number | null;
  arrivalWindow?: string;
  customerName?: string;
  customerPhone?: string;
  isPaused?: boolean;
  onTogglePause?: () => void;
}

export const DwellGauge: React.FC<DwellGaugeProps> = ({
  residenceCategory,
  currentDwellSeconds,
  isInsideGeofence,
  arrivalWindow = '11:00 — 12:00',
  customerName = 'VISHNU BHARGAV',
  customerPhone = '+91 90191 44983',
  isPaused = false,
  onTogglePause,
}) => {
  const dwellRule = getDwellRule(residenceCategory);
  const targetSeconds = dwellRule.requiredDwellSeconds;
  const remainingSeconds = Math.max(0, targetSeconds - currentDwellSeconds);
  const isSatisfied = currentDwellSeconds >= targetSeconds;

  const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const seconds = (remainingSeconds % 60).toString().padStart(2, '0');

  // SVG Circular progress math (radius 45, circumference ~ 282.74)
  const radius = 45;
  const circumference = 2 * Math.PI * radius; // ~282.74
  const progressRatio = Math.min(1, currentDwellSeconds / targetSeconds);
  const strokeDashoffset = circumference * (1 - progressRatio);

  const ringColor = isSatisfied ? THEME.colors.green : THEME.colors.signal;

  return (
    <View style={styles.stopContent}>
      {/* Exact Circular Timer Wrap from design */}
      <View style={styles.timerWrap}>
        <Svg width={140} height={140} viewBox="0 0 108 108" style={styles.timerRing}>
          {/* Background Track */}
          <Circle
            cx="54"
            cy="54"
            r={radius}
            stroke="#E5EAEC"
            strokeWidth="7"
            fill="none"
          />
          {/* Active Progress Stroke */}
          <Circle
            cx="54"
            cy="54"
            r={radius}
            stroke={ringColor}
            strokeWidth="7"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="square"
            transform="rotate(-90 54 54)"
          />
        </Svg>

        <View style={styles.timerContent}>
          <Text style={styles.timerLabel}>DWELL TIME</Text>
          <Text style={styles.timerTime}>
            {isSatisfied ? '00:00' : `${minutes}:${seconds}`}
          </Text>
          <Text style={styles.timerSubtext}>
            {isSatisfied ? 'THRESHOLD MET' : 'REMAINING'}
          </Text>
        </View>

        {onTogglePause && (
          <TouchableOpacity style={styles.timerToggle} onPress={onTogglePause} activeOpacity={0.8}>
            <Text style={styles.timerToggleText}>{isPaused ? 'RESUME' : 'PAUSE'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Exact Stop Meta Column from design */}
      <View style={styles.stopMeta}>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>ARRIVAL WINDOW</Text>
          <Text style={styles.metaValue}>{arrivalWindow}</Text>
        </View>

        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>RESIDENCE TYPE</Text>
          <Text style={styles.metaValue}>{dwellRule.displayName.toUpperCase()} ({targetSeconds}S)</Text>
        </View>

        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>CONTACT</Text>
          <Text style={styles.metaValue} numberOfLines={1}>{customerName}</Text>
          <Text style={styles.metaSubValue}>{customerPhone}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stopContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginVertical: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DBE1E5',
  },
  timerWrap: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timerRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  timerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  timerLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: THEME.colors.muted,
  },
  timerTime: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -1,
    color: THEME.colors.foreground,
    lineHeight: 28,
  },
  timerSubtext: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    color: THEME.colors.muted,
  },
  timerToggle: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD4D7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  timerToggleText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    color: THEME.colors.slate,
  },
  stopMeta: {
    flex: 1,
    gap: 12,
    minWidth: 0,
  },
  metaBlock: {
    gap: 2,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: THEME.colors.muted,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: THEME.colors.foreground,
  },
  metaSubValue: {
    fontSize: 11,
    color: THEME.colors.slate,
    fontWeight: '600',
    marginTop: 1,
  },
});
