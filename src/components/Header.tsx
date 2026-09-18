import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
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
  return (
    <View style={styles.container}>
      {/* Top row: Brand + Driver ID */}
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={20} color={THEME.colors.primary} />
          </View>
          <View>
            <Text style={styles.brandTitle}>SABOOT</Text>
            <Text style={styles.brandSubtitle}>Zero-Trust Delivery Attestation</Text>
          </View>
        </View>

        <View style={styles.driverPill}>
          <View style={styles.onlineDot} />
          <Text style={styles.driverText}>DRV-BLR-09</Text>
        </View>
      </View>

      {/* Bottom row: GPS Mode Banner & Demo Selector */}
      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[
            styles.modePill,
            isSimulationMode ? styles.simModePill : styles.liveModePill,
          ]}
          onPress={onToggleLiveGps}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isSimulationMode ? 'cube-outline' : 'navigate'}
            size={14}
            color={isSimulationMode ? THEME.colors.simulation : THEME.colors.liveGps}
          />
          <Text
            style={[
              styles.modeText,
              { color: isSimulationMode ? THEME.colors.simulation : THEME.colors.liveGps },
            ]}
          >
            {isSimulationMode ? '🟣 DEMO SIMULATION MODE' : '🟢 LIVE GPS'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scenarioButton}
          onPress={onOpenScenarioModal}
          activeOpacity={0.7}
        >
          <Ionicons name="options-outline" size={14} color={THEME.colors.primary} />
          <Text style={styles.scenarioButtonText}>
            {activePreset ? activePreset.tag : 'Scenarios'}
          </Text>
          <Ionicons name="chevron-forward" size={12} color={THEME.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.surface,
    paddingTop: 14,
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
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  driverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.colors.verified,
  },
  driverText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  modeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    flex: 1,
  },
  liveModePill: {
    backgroundColor: THEME.colors.liveGpsBg,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  simModePill: {
    backgroundColor: THEME.colors.simulationBg,
    borderColor: THEME.colors.simulationBorder,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scenarioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  scenarioButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
});
