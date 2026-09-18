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
              <Text style={styles.eyebrow}>HACKATHON DEMO CONTROLS</Text>
              <Text style={styles.title}>TELEMETRY PRESETS</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={THEME.colors.foreground} />
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
              activeOpacity={0.8}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>LIVE HARDWARE SENSOR</Text>
                </View>
                {!isSimulationMode && (
                  <Ionicons name="checkmark-circle" size={18} color={THEME.colors.green} />
                )}
              </View>
              <Text style={styles.presetTitle}>Physical Device GPS</Text>
              <Text style={styles.presetDesc}>
                Uses live real-world GPS coordinates from phone hardware.
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />
            <Text style={styles.sectionHeader}>SIMULATION PRESETS (FOR JUDGES)</Text>

            {/* Presets */}
            {DEMO_SCENARIO_PRESETS.map((preset) => {
              const isSelected = isSimulationMode && activePreset?.id === preset.id;
              const isVerified = preset.expectedDecision === 'VERIFIED';
              const isRejected = preset.expectedDecision === 'REJECTED';

              const badgeColor = isVerified
                ? THEME.colors.green
                : isRejected
                ? THEME.colors.signal
                : '#B45309';

              const badgeBg = isVerified
                ? THEME.colors.geofenceBg
                : isRejected
                ? '#FFF5F2'
                : '#FFFBEB';

              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetCard,
                    isSelected && { borderColor: THEME.colors.foreground, backgroundColor: '#FAFBFB' },
                  ]}
                  onPress={() => {
                    onSelectPreset(preset);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.badgeText, { color: badgeColor }]}>
                        EXPECTED: {preset.expectedDecision}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={badgeColor} />
                    )}
                  </View>

                  <Text style={styles.presetTitle}>{preset.title}</Text>
                  <Text style={styles.presetDesc}>{preset.description}</Text>

                  {/* Chips */}
                  <View style={styles.chipsRow}>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>📍 {preset.simulatedGps.distanceMeters}M</Text>
                    </View>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>⏱️ {preset.dwellSeconds}S DWELL</Text>
                    </View>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>
                        📞 {preset.callAttempted ? `${preset.callDurationSeconds}S CALL` : 'NO CALL'}
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
    backgroundColor: 'rgba(21, 32, 43, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '85%',
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.foreground,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  presetList: {
    marginBottom: 8,
  },
  presetCard: {
    backgroundColor: '#F4F6F7',
    borderRadius: 4,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DBE1E5',
  },
  activeLiveCard: {
    borderColor: THEME.colors.green,
    backgroundColor: THEME.colors.geofenceBg,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    backgroundColor: '#EEF2F3',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.slate,
    letterSpacing: 0.6,
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.foreground,
    marginBottom: 4,
  },
  presetDesc: {
    fontSize: 12,
    color: THEME.colors.slate,
    lineHeight: 16,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#DBE1E5',
  },
  chipText: {
    fontSize: 9,
    color: THEME.colors.slate,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#DBE1E5',
    marginVertical: 12,
  },
  sectionHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
});
