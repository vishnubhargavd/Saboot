import React from 'react';
import { StyleSheet, View, Text, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { VerificationResult } from '../types/policy';
import { Delivery } from '../types/delivery';
import { ResultCard } from '../components/ResultCard';
import { SabootLogo } from '../components/SabootLogo';

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.driverAppContainer}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <SabootLogo size={32} style={{ marginRight: 10 }} />
          <View style={styles.navTitleContainer}>
            <Text style={styles.navEyebrow}>ATTESTATION CERTIFICATE</Text>
            <Text style={styles.navTitle}>
              {delivery.trackingNumber} • {delivery.customer.name}
            </Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onReturnHome} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={THEME.colors.foreground} />
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
    backgroundColor: '#FFFFFF',
  },
  driverAppContainer: {
    flex: 1,
    backgroundColor: '#EEF2F3',
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DBE1E5',
  },
  navTitleContainer: {
    flex: 1,
  },
  navEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: THEME.colors.muted,
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.foreground,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#EEF2F3',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#CFD7D8',
  },
});
