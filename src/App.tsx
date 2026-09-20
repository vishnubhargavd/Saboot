import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { THEME } from './constants/theme';
import { useDelivery } from './hooks/useDelivery';
import { useLocationTracking } from './hooks/useLocationTracking';
import { HomeScreen } from './screens/HomeScreen';
import { DeliveryDetailScreen } from './screens/DeliveryDetailScreen';
import { ResultScreen } from './screens/ResultScreen';
import { Delivery } from './types/delivery';
import { VerificationResult } from './types/policy';

type ScreenState = 'HOME' | 'DELIVERY_DETAIL' | 'RESULT';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('HOME');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [latestResult, setLatestResult] = useState<VerificationResult | null>(null);

  const {
    deliveries,
    shiftMetrics,
    selectDelivery,
    updateDelivery,
    addDelivery,
    recordAttestationResult,
    completeDelivery,
    refreshDeliveries,
  } = useDelivery();

  // Saboot Deep-Link Ingestion: saboot://verify?deliveryId=DEL-1001&category=...
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      try {
        const urlStr = event.url;
        if (!urlStr) return;
        const match = urlStr.match(/deliveryId=([^&]+)/i);
        if (match && match[1]) {
          const targetId = decodeURIComponent(match[1]);
          const found = deliveries.find(
            (d) =>
              d.id.toLowerCase() === targetId.toLowerCase() ||
              d.trackingNumber.toLowerCase() === targetId.toLowerCase()
          );
          if (found) {
            setSelectedDelivery(found);
            selectDelivery(found.id);
            setCurrentScreen('DELIVERY_DETAIL');
          }
        }
      } catch (e) {
        console.warn('[Saboot DeepLink] Ingestion error:', e);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    const sub = Linking.addEventListener('url', handleUrl);
    return () => {
      sub.remove();
    };
  }, [deliveries, selectDelivery]);

  const activeTargetDelivery = selectedDelivery || deliveries[0];

  const {
    currentLocation,
    distanceMeters,
    breadcrumbs,
    isSimulationMode,
    activePreset,
    applyDemoPreset,
    enableLiveGps,
  } = useLocationTracking({
    targetLatitude: activeTargetDelivery?.address.latitude,
    targetLongitude: activeTargetDelivery?.address.longitude,
  });

  const handleSelectDelivery = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    selectDelivery(delivery.id);
    setCurrentScreen('DELIVERY_DETAIL');
  };

  const handleVerificationComplete = (result: VerificationResult) => {
    if (selectedDelivery) {
      recordAttestationResult(selectedDelivery.id, result);
    }
    setLatestResult(result);
    setCurrentScreen('RESULT');
  };

  const handleCompleteDelivery = (
    handoffType: 'direct' | 'doorstep' | 'security',
    notes?: string,
    videoProofUri?: string,
    videoMetrics?: { luminance: number; variance: number },
    thumbnailUri?: string
  ) => {
    if (selectedDelivery) {
      const result = completeDelivery(selectedDelivery.id, handoffType, notes, videoProofUri, videoMetrics, thumbnailUri);
      setLatestResult(result);
      setCurrentScreen('RESULT');
    }
  };

  const handleReturnHome = () => {
    setSelectedDelivery(null);
    setLatestResult(null);
    setCurrentScreen('HOME');
  };

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="dark" />

        {currentScreen === 'HOME' && (
          <HomeScreen
            deliveries={deliveries}
            shiftMetrics={shiftMetrics}
            onSelectDelivery={handleSelectDelivery}
            onRefreshDeliveries={refreshDeliveries}
            isSimulationMode={isSimulationMode}
            activePreset={activePreset}
            onApplyPreset={applyDemoPreset}
            onEnableLiveGps={enableLiveGps}
          />
        )}

        {currentScreen === 'DELIVERY_DETAIL' && selectedDelivery && (
          <DeliveryDetailScreen
            delivery={selectedDelivery}
            currentLocation={currentLocation}
            distanceMeters={distanceMeters}
            breadcrumbs={breadcrumbs}
            isSimulationMode={isSimulationMode}
            activePreset={activePreset}
            onBack={() => setCurrentScreen('HOME')}
            onVerificationComplete={handleVerificationComplete}
            onCompleteDelivery={handleCompleteDelivery}
          />
        )}

        {currentScreen === 'RESULT' && latestResult && selectedDelivery && (
          <ResultScreen
            result={latestResult}
            delivery={selectedDelivery}
            onReturnHome={handleReturnHome}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EEF2F3',
  },
});
