import React from 'react';
import { StyleSheet, View, Text, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { VerificationResult } from '../types/policy';
import { Delivery } from '../types/delivery';
import { ResultCard } from '../components/ResultCard';

interface ResultScreenProps {
  result: VerificationResult;
  delivery: Delivery;
  onReturnHome: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  result,
  delivery,
  onReturnHome,
}) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={styles.responsiveContainer}>
        {/* Header */}
        <View style={styles.navBar}>
          <View style={styles.navTitleContainer}>
            <Text style={styles.navTitle}>Attestation Certificate</Text>
            <Text style={styles.navSubtitle}>
              {delivery.trackingNumber} • {delivery.customer.name}
            </Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onReturnHome} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Result Card */}
        <ResultCard result={result} onReturnHome={onReturnHome} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  responsiveContainer: {
    flex: 1,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  navTitleContainer: {
    flex: 1,
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  navSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontFamily: THEME.typography.fontFamily.mono,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.full,
  },
});
