import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, StatusBar, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Delivery } from '../types/delivery';
import { Header } from '../components/Header';
import { MetricCard } from '../components/MetricCard';
import { DeliveryCard } from '../components/DeliveryCard';

interface HomeScreenProps {
  onSelectDelivery: (delivery: Delivery) => void;
  deliveries: Delivery[];
  shiftMetrics: any;
  onRefreshDeliveries?: () => Promise<any>;
  isSimulationMode?: boolean;
  activePreset?: any;
  onApplyPreset?: (preset: any) => void;
  onEnableLiveGps?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectDelivery,
  deliveries,
  shiftMetrics,
  onRefreshDeliveries,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefreshDeliveries) return;
    setIsRefreshing(true);
    try {
      await onRefreshDeliveries();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter out completed/resolved deliveries from active route
  const TERMINAL_STATUSES = ['DELIVERED', 'VERIFIED', 'REJECTED'];
  const activeDeliveries = deliveries.filter((d) => !TERMINAL_STATUSES.includes(d.status));

  const filteredDeliveries = activeDeliveries.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      d.id.toLowerCase().includes(q) ||
      d.trackingNumber.toLowerCase().includes(q) ||
      d.customer.name.toLowerCase().includes(q) ||
      d.customer.phone.includes(q) ||
      d.address.street.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.driverAppContainer}>
        {/* Header */}
        <Header />

        <View style={styles.content}>
          {/* Shift Metrics */}
          <View style={styles.metricsContainer}>
            <MetricCard metrics={shiftMetrics} />
          </View>

          {/* Search & Track Task Bar */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={16} color={THEME.colors.slate} />
            <TextInput
              style={styles.searchInput}
              placeholder="Track Order ID (DEL-1001) or Tracking #..."
              placeholderTextColor={THEME.colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  style={styles.trackActionBtn}
                  onPress={() => {
                    if (filteredDeliveries.length > 0) {
                      onSelectDelivery(filteredDeliveries[0]);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.trackActionText}>TRACK</Text>
                  <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={THEME.colors.muted} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Section Header */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>TODAY'S DELIVERY ROUTE</Text>
              <Text style={styles.sectionSub}>
                {filteredDeliveries.length} OF {activeDeliveries.length} STOPS
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.autoPingBadge}>
                <View style={styles.pingDot} />
                <Text style={styles.autoPingText}>10S PING</Text>
              </View>
              <TouchableOpacity
                style={styles.syncButton}
                onPress={handleRefresh}
                activeOpacity={0.7}
                disabled={isRefreshing}
              >
                <Ionicons
                  name="refresh"
                  size={13}
                  color={isRefreshing ? '#94A3B8' : '#0284C7'}
                />
                <Text style={[styles.syncButtonText, isRefreshing && { color: '#94A3B8' }]}>
                  {isRefreshing ? 'SYNCING...' : 'SYNC NOW'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Deliveries Queue */}
          <FlatList
            data={filteredDeliveries}
            keyExtractor={(item) => item.id}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            renderItem={({ item, index }) => (
              <DeliveryCard
                delivery={item}
                index={index}
                total={filteredDeliveries.length}
                onPress={() => onSelectDelivery(item)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={32} color={THEME.colors.muted} />
                <Text style={styles.emptyTitle}>No Matching Task Found</Text>
                <Text style={styles.emptySub}>
                  No delivery matching "{searchQuery}" was found. Check tracking ID or order number.
                </Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  metricsContainer: {
    marginBottom: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFD7D8',
    borderRadius: 4,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.foreground,
    paddingVertical: 0,
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
  trackActionBtn: {
    backgroundColor: THEME.colors.signal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  trackActionText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.foreground,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11,
    color: THEME.colors.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  syncButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  autoPingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  autoPingText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.4,
  },
});
