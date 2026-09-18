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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.driverAppContainer}>
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

          {/* Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>TODAY'S DELIVERY ROUTE</Text>
            <Text style={styles.sectionSub}>{deliveries.length} STOPS ASSIGNED</Text>
          </View>

          {/* Deliveries Queue */}
          <FlatList
            data={deliveries}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <DeliveryCard
                delivery={item}
                index={index}
                total={deliveries.length}
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
    backgroundColor: '#FFFFFF',
  },
  driverAppContainer: {
    flex: 1,
    backgroundColor: '#EEF2F3',
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
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 1.2,
  },
  sectionSub: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.slate,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 24,
  },
});
