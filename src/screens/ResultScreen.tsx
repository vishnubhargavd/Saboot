import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.surface} />

      {/* Header */}
      <View style={styles.navBar}>
        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle}>Zero-Trust Attestation Result</Text>
          <Text style={styles.navSubtitle}>{delivery.trackingNumber} • {delivery.customer.name}</Text>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={onReturnHome}>
          <Ionicons name="close" size={20} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Result Card */}
      <ResultCard result={result} onReturnHome={onReturnHome} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
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
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  navSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
});
