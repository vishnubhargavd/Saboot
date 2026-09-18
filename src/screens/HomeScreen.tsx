import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Delivery } from '../types/delivery';
import { DemoScenarioPreset } from '../constants/demoData';
import { Header } from '../components/Header';
import { MetricCard } from '../components/MetricCard';
import { DeliveryCard } from '../components/DeliveryCard';
import { ScenarioModal } from '../components/ScenarioModal';
import { useDelivery } from '../hooks/useDelivery';
import { useLocationTracking } from '../hooks/useLocationTracking';

interface HomeScreenProps {
  onSelectDelivery: (delivery: Delivery) => void;
  isSimulationMode: boolean;
  activePreset: DemoScenarioPreset | null;
  onApplyPreset: (preset: DemoScenarioPreset) => void;
  onEnableLiveGps: () => void;
  deliveries: Delivery[];
  shiftMetrics: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectDelivery,
  isSimulationMode,
  activePreset,
  onApplyPreset,
  onEnableLiveGps,
  deliveries,
  shiftMetrics,
}) => {
  const [isScenarioModalVisible, setIsScenarioModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.surface} />

      {/* Driver Header */}
      <Header
        isSimulationMode={isSimulationMode}
        activePreset={activePreset}
        onOpenScenarioModal={() => setIsScenarioModalVisible(true)}
        onToggleLiveGps={onEnableLiveGps}
      />

      <View style={styles.content}>
        {/* Shift Metrics */}
        <View style={styles.metricsContainer}>
          <MetricCard metrics={shiftMetrics} />
        </View>

        {/* Deliveries Queue Header */}
        <View style={styles.queueHeader}>
          <View style={styles.queueTitleRow}>
            <Ionicons name="cube-outline" size={18} color={THEME.colors.primary} />
            <Text style={styles.queueTitle}>Active Delivery Queue</Text>
            <View style={styles.queueCountBadge}>
              <Text style={styles.queueCountText}>{deliveries.length}</Text>
            </View>
          </View>
          <Text style={styles.queueSubtitle}>
            Tap a delivery to begin live attempt attestation
          </Text>
        </View>

        {/* Delivery List */}
        <FlatList
          data={deliveries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DeliveryCard
              delivery={item}
              onPress={() => onSelectDelivery(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Scenario Selection Modal */}
      <ScenarioModal
        visible={isScenarioModalVisible}
        activePreset={activePreset}
        isSimulationMode={isSimulationMode}
        onSelectPreset={onApplyPreset}
        onSelectLiveGps={onEnableLiveGps}
        onClose={() => setIsScenarioModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  metricsContainer: {
    marginBottom: 16,
  },
  queueHeader: {
    marginBottom: 12,
  },
  queueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  queueCountBadge: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  queueCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  queueSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 24,
  },
});
