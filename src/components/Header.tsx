import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { DemoScenarioPreset } from '../constants/demoData';

interface HeaderProps {
  isSimulationMode: boolean;
  activePreset: DemoScenarioPreset | null;
  onOpenScenarioModal: () => void;
  onToggleLiveGps: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSimulationMode,
  activePreset,
  onOpenScenarioModal,
  onToggleLiveGps,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {/* Top row: Brand + Driver ID */}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Text style={styles.brandTitle}>SABOOT</Text>
          <View style={styles.versionPill}>
            <Text style={styles.versionText}>ZERO-TRUST</Text>
          </View>
        </View>

        <View style={styles.driverPill}>
          <Animated.View
            style={[
              styles.statusDot,
              { opacity: pulseAnim },
            ]}
          />
          <Text style={styles.driverText}>DRV-BLR-09</Text>
        </View>
      </View>

      {/* Mode Switcher Bar */}
      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            !isSimulationMode ? styles.activeModeButton : styles.inactiveModeButton,
          ]}
          onPress={onToggleLiveGps}
          activeOpacity={0.7}
        >
          <Ionicons
            name="navigate"
            size={12}
            color={!isSimulationMode ? THEME.colors.primaryInverse : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.modeButtonText,
              !isSimulationMode ? styles.activeModeText : styles.inactiveModeText,
            ]}
          >
            Live GPS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeButton,
            isSimulationMode ? styles.activeModeButton : styles.inactiveModeButton,
          ]}
          onPress={onOpenScenarioModal}
          activeOpacity={0.7}
        >
          <Ionicons
            name="cube-outline"
            size={12}
            color={isSimulationMode ? THEME.colors.primaryInverse : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.modeButtonText,
              isSimulationMode ? styles.activeModeText : styles.inactiveModeText,
            ]}
            numberOfLines={1}
          >
            {activePreset ? activePreset.tag : 'Sim Scenarios'}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={11}
            color={isSimulationMode ? THEME.colors.primaryInverse : THEME.colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.surface,
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 2,
  },
  versionPill: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  versionText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
  },
  driverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  driverText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontFamily.mono,
  },
  modeBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.background,
    padding: 3,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: THEME.borderRadius.sm,
    gap: 5,
  },
  activeModeButton: {
    backgroundColor: '#FFFFFF',
  },
  inactiveModeButton: {
    backgroundColor: 'transparent',
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  activeModeText: {
    color: '#000000',
  },
  inactiveModeText: {
    color: THEME.colors.textMuted,
  },
});
