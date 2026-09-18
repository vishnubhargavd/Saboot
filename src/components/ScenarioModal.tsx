import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { DEMO_SCENARIO_PRESETS, DemoScenarioPreset } from '../constants/demoData';

interface ScenarioModalProps {
  visible: boolean;
  activePreset: DemoScenarioPreset | null;
  isSimulationMode: boolean;
  onSelectPreset: (preset: DemoScenarioPreset) => void;
  onSelectLiveGps: () => void;
  onClose: () => void;
}

export const ScenarioModal: React.FC<ScenarioModalProps> = ({
  visible,
  activePreset,
  isSimulationMode,
  onSelectPreset,
  onSelectLiveGps,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Demo Scenarios</Text>
              <Text style={styles.subtitle}>Select a telemetry preset for testing</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={THEME.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.presetList} showsVerticalScrollIndicator={false}>
            {/* Live GPS Option */}
            <TouchableOpacity
              style={[
                styles.presetCard,
                !isSimulationMode && styles.activeLiveCard,
              ]}
              onPress={() => {
                onSelectLiveGps();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>LIVE HARDWARE</Text>
                </View>
                {!isSimulationMode && (
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.presetTitle}>Device GPS Sensor</Text>
              <Text style={styles.presetDesc}>
                Uses foreground GPS from phone hardware.
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />
            <Text style={styles.sectionHeader}>SIMULATION SCENARIOS</Text>

            {/* Presets */}
            {DEMO_SCENARIO_PRESETS.map((preset) => {
              const isSelected = isSimulationMode && activePreset?.id === preset.id;

              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetCard,
                    isSelected && styles.selectedPresetCard,
                  ]}
                  onPress={() => {
                    onSelectPreset(preset);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.badge, isSelected && styles.selectedBadge]}>
                      <Text style={[styles.badgeText, isSelected && { color: '#000000' }]}>
                        EXPECTED: {preset.expectedDecision}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    )}
                  </View>

                  <Text style={styles.presetTitle}>{preset.title}</Text>
                  <Text style={styles.presetDesc}>{preset.description}</Text>

                  {/* Chips */}
                  <View style={styles.chipsRow}>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{preset.simulatedGps.distanceMeters}m</Text>
                    </View>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{preset.dwellSeconds}s dwell</Text>
                    </View>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>
                        {preset.callAttempted ? `${preset.callDurationSeconds}s Call` : 'No Call'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.full,
  },
  presetList: {
    marginBottom: 8,
  },
  presetCard: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  activeLiveCard: {
    borderColor: '#FFFFFF',
    backgroundColor: THEME.colors.surfaceHighlight,
  },
  selectedPresetCard: {
    borderColor: '#FFFFFF',
    backgroundColor: THEME.colors.surfaceHighlight,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: THEME.colors.surfaceHighlight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.xs,
  },
  selectedBadge: {
    backgroundColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  presetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  presetDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 15,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  chipText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontFamily.mono,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 12,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
});
