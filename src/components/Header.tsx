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
      {/* Top Console Bar */}
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>SABOOT</Text>
          <View style={styles.unitChip}>
            <Ionicons name="radio-outline" size={13} color={THEME.colors.slate} />
            <Text style={styles.unitChipText}>LIVE / UNIT 24</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.scenarioButton}
          onPress={onOpenScenarioModal}
          activeOpacity={0.8}
        >
          <Ionicons name="layers-outline" size={14} color={THEME.colors.slate} />
          <Text style={styles.scenarioButtonText}>
            {isSimulationMode && activePreset ? activePreset.tag : 'SCENARIOS'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* GPS Mode Bar */}
      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[styles.modePill, !isSimulationMode ? styles.liveActive : styles.modeInactive]}
          onPress={onToggleLiveGps}
          activeOpacity={0.8}
        >
          <View style={[styles.statusDot, { backgroundColor: !isSimulationMode ? THEME.colors.green : THEME.colors.muted }]} />
          <Text style={[styles.modeText, { color: !isSimulationMode ? THEME.colors.foreground : THEME.colors.muted }]}>
            LIVE HARDWARE GPS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modePill, isSimulationMode ? styles.simActive : styles.modeInactive]}
          onPress={onOpenScenarioModal}
          activeOpacity={0.8}
        >
          <View style={[styles.statusDot, { backgroundColor: isSimulationMode ? THEME.colors.signal : THEME.colors.muted }]} />
          <Text style={[styles.modeText, { color: isSimulationMode ? THEME.colors.signal : THEME.colors.muted }]}>
            DEMO SIMULATOR
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DBE1E5',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    color: THEME.colors.foreground,
  },
  unitChip: {
    backgroundColor: '#EEF2F3',
    borderWidth: 1,
    borderColor: '#CFD7D8',
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    borderRadius: 2,
  },
  unitChipText: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.slate,
    letterSpacing: 1,
  },
  scenarioButton: {
    backgroundColor: '#EEF2F3',
    borderWidth: 1,
    borderColor: '#CFD7D8',
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 2,
  },
  scenarioButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.slate,
    letterSpacing: 0.8,
  },
  modeBar: {
    flexDirection: 'row',
    gap: 8,
  },
  modePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 2,
    borderWidth: 1,
    gap: 6,
  },
  liveActive: {
    backgroundColor: THEME.colors.geofenceBg,
    borderColor: THEME.colors.geofenceBorder,
  },
  simActive: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FCA5A5',
  },
  modeInactive: {
    backgroundColor: '#F4F6F7',
    borderColor: '#DBE1E5',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
