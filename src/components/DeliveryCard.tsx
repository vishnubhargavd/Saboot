import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Delivery } from '../types/delivery';
import { DWELL_POLICY_CONFIG, getDwellRule } from '../constants/dwellPolicy';

interface DeliveryCardProps {
  delivery: Delivery;
  index?: number;
  total?: number;
  isSelected?: boolean;
  onPress: () => void;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  index = 0,
  total = 4,
  isSelected = false,
  onPress,
}) => {
  const dwellRule = getDwellRule(delivery.address?.residenceCategory);
  const stopNumber = (index + 1).toString().padStart(2, '0');
  const totalStops = total.toString().padStart(2, '0');

  const getStatusInfo = () => {
    switch (delivery.status) {
      case 'VERIFIED':
        return { text: 'VERIFIED', bg: THEME.colors.geofenceBg, border: THEME.colors.geofenceBorder, color: THEME.colors.green };
      case 'REJECTED':
        return { text: 'REJECTED', bg: '#FFF5F2', border: '#FCA5A5', color: THEME.colors.signal };
      case 'REVIEW':
        return { text: 'IN REVIEW', bg: '#FFFBEB', border: '#FDE68A', color: '#B45309' };
      default:
        return { text: 'READY', bg: '#EEF2F3', border: '#CFD7D8', color: THEME.colors.slate };
    }
  };

  const status = getStatusInfo();
  const isRetry = delivery.retryRequired === true || 
    delivery.status === 'CUSTOMER_CONFIRMED_FAILURE' || 
    delivery.status === 'RETRY_REQUIRED';

  if (isRetry) {
    return (
      <TouchableOpacity
        style={[styles.card, styles.retryCard, isSelected && styles.selectedCard]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.retryHeaderRow}>
          <View style={styles.retryBadge}>
            <Text style={styles.retryBadgeText}>🔄 RETRY DELIVERY</Text>
          </View>
          <Text style={styles.retryIdText}>Delivery #{delivery.id}</Text>
        </View>

        <Text style={styles.retryCustomerText}>{delivery.customer.name}</Text>
        <Text style={styles.phoneText}>📞 {delivery.customer.phone}</Text>
        <Text style={styles.retryExplanationText}>
          Customer confirmed that the package was not received.
        </Text>

        <View style={styles.addressRow}>
          <Ionicons name="location-sharp" size={14} color={THEME.colors.signal} />
          <Text style={styles.addressText} numberOfLines={1}>
            {delivery.address.street}, {delivery.address.city}
          </Text>
        </View>

        <TouchableOpacity style={styles.retryActionBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.retryActionBtnText}>🔄 RETRY DELIVERY</Text>
          <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.selectedCard]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Top Header: Stop Number + Status */}
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>STOP {stopNumber} OF {totalStops}</Text>
        <View style={[styles.statusTag, { backgroundColor: status.bg, borderColor: status.border }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      {/* Destination Title & Phone */}
      <Text style={styles.title}>{delivery.customer.name}</Text>
      <Text style={styles.phoneText}>📞 {delivery.customer.phone}</Text>

      {/* Address */}
      <View style={styles.addressRow}>
        <Ionicons name="location-sharp" size={14} color={THEME.colors.signal} />
        <Text style={styles.addressText} numberOfLines={1}>
          {delivery.address.street}, {delivery.address.city}
        </Text>
      </View>

      {/* Footer: Dwell Policy & ETA */}
      <View style={styles.footerRow}>
        <View style={styles.residencePill}>
          <Text style={styles.residenceText}>
            {dwellRule.displayName.toUpperCase()} ({dwellRule.requiredDwellSeconds}S DWELL)
          </Text>
        </View>

        <View style={styles.actionArrow}>
          <Text style={styles.actionText}>VIEW STOP</Text>
          <Ionicons name="arrow-forward" size={13} color={THEME.colors.slate} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBE1E5',
    borderRadius: 4,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  selectedCard: {
    borderColor: THEME.colors.foreground,
    backgroundColor: '#FAFBFB',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: THEME.colors.muted,
  },
  statusTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.foreground,
    letterSpacing: -0.3,
  },
  phoneText: {
    fontSize: 12,
    color: THEME.colors.slate,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 12,
    color: THEME.colors.slate,
    fontWeight: '600',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F3',
  },
  residencePill: {
    backgroundColor: '#EEF2F3',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#CFD7D8',
  },
  residenceText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.slate,
    letterSpacing: 0.5,
  },
  actionArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.slate,
    letterSpacing: 0.8,
  },
  retryCard: {
    borderColor: '#F87171',
    borderWidth: 1.5,
    backgroundColor: '#FFFBFB',
  },
  retryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  retryBadge: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  retryBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B91C1C',
    letterSpacing: 0.8,
  },
  retryIdText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.slate,
  },
  retryCustomerText: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.foreground,
    letterSpacing: -0.3,
  },
  retryExplanationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
    marginVertical: 6,
  },
  retryActionBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  retryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
