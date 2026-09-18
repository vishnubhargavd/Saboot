import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { SabootLogo } from './SabootLogo';

interface HeaderProps {
  isSimulationMode?: boolean;
  activePreset?: any;
  onOpenScenarioModal?: () => void;
  onToggleLiveGps?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <View style={styles.container}>
      {/* Top Console Bar */}
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <SabootLogo size={34} />
          <View style={styles.brandTextCol}>
            <View style={styles.brandTitleRow}>
              <Text style={styles.brandTitle}>SABOOT</Text>
              <View style={styles.unitChip}>
                <Ionicons name="radio-outline" size={11} color={THEME.colors.slate} />
                <Text style={styles.unitChipText}>UNIT 24</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <View style={styles.liveStatusPill}>
            <View style={styles.statusDotLive} />
            <Text style={styles.liveStatusText}>LIVE GPS LOCKED</Text>
          </View>
        </View>
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
  brandTextCol: {
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: THEME.colors.foreground,
  },
  unitChip: {
    backgroundColor: '#EEF2F3',
    borderWidth: 1,
    borderColor: '#CFD7D8',
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    borderRadius: 2,
  },
  unitChipText: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.slate,
    letterSpacing: 0.8,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveStatusPill: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: 2,
  },
  statusDotLive: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.green,
  },
  liveStatusText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.8,
  },
});
