import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { Delivery } from '../types/delivery';
import { DemoScenarioPreset } from '../constants/demoData';
import { Header } from '../components/Header';
import { MetricCard } from '../components/MetricCard';
import { DeliveryCard } from '../components/DeliveryCard';
import { ScenarioModal } from '../components/ScenarioModal';

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={styles.responsiveContainer}>
        {/* Header */}
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

          {/* Queue Title */}
          <View style={styles.queueHeader}>
            <Text style={styles.queueTitle}>Assigned Queue</Text>
            <Text style={styles.queueCount}>{deliveries.length} Packages</Text>
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
    backgroundColor: '#000000',
  },
  responsiveContainer: {
    flex: 1,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  metricsContainer: {
    marginBottom: 14,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  queueTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.2,
  },
  queueCount: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
});
