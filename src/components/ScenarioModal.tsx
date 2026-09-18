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
          {/* Modal Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Hackathon Demo Scenarios</Text>
              <Text style={styles.subtitle}>
                Inject realistic multi-modal telemetry profiles for live judging
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
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
                <View style={[styles.badge, styles.liveBadge]}>
                  <Ionicons name="navigate" size={12} color={THEME.colors.liveGps} />
                  <Text style={[styles.badgeText, { color: THEME.colors.liveGps }]}>
                    LIVE GPS HARDWARE
                  </Text>
                </View>
                {!isSimulationMode && (
                  <Ionicons name="checkmark-circle" size={18} color={THEME.colors.liveGps} />
                )}
              </View>
              <Text style={styles.presetTitle}>Physical Device Sensors</Text>
              <Text style={styles.presetDesc}>
                Use live foreground GPS coordinates from your device's location chip.
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />
            <Text style={styles.sectionHeader}>DEMO SIMULATION PRESETS</Text>

            {/* Scenario Presets */}
            {DEMO_SCENARIO_PRESETS.map((preset) => {
              const isSelected = isSimulationMode && activePreset?.id === preset.id;
              const decisionColor =
                preset.expectedDecision === 'VERIFIED'
                  ? THEME.colors.verified
                  : preset.expectedDecision === 'REJECTED'
                  ? THEME.colors.rejected
                  : THEME.colors.review;

              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetCard,
                    isSelected && { borderColor: decisionColor, backgroundColor: `${decisionColor}0C` },
                  ]}
                  onPress={() => {
                    onSelectPreset(preset);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.badge, { backgroundColor: `${decisionColor}18`, borderColor: `${decisionColor}40` }]}>
                      <Text style={[styles.badgeText, { color: decisionColor }]}>
                        EXPECTED: {preset.expectedDecision}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={decisionColor} />
                    )}
                  </View>

                  <Text style={styles.presetTitle}>{preset.title}</Text>
                  <Text style={styles.presetDesc}>{preset.description}</Text>

                  {/* Fact Chips */}
                  <View style={styles.chipsRow}>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>📍 {preset.simulatedGps.distanceMeters}m</Text>
                    </View>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>⏱️ {preset.dwellSeconds}s dwell</Text>
                    </View>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>
                        📞 {preset.callAttempted ? `${preset.callDurationSeconds}s Call` : 'No Call'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  presetList: {
    marginBottom: 8,
  },
  presetCard: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  activeLiveCard: {
    borderColor: THEME.colors.liveGps,
    backgroundColor: THEME.colors.liveGpsBg,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    gap: 4,
  },
  liveBadge: {
    backgroundColor: THEME.colors.liveGpsBg,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  presetDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: THEME.colors.surfaceHighlight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
});
