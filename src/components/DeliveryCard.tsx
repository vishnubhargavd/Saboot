import React, { useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Delivery } from '../types/delivery';
import { DWELL_POLICY_CONFIG } from '../constants/dwellPolicy';

interface DeliveryCardProps {
  delivery: Delivery;
  isSelected?: boolean;
  onPress: () => void;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  isSelected = false,
  onPress,
}) => {
  const dwellRule = DWELL_POLICY_CONFIG[delivery.address.residenceCategory];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const getStatusBadge = () => {
    switch (delivery.status) {
      case 'VERIFIED':
        return { text: 'VERIFIED', isDone: true, color: '#FFFFFF' };
      case 'REJECTED':
        return { text: 'REJECTED', isDone: true, color: '#A1A1AA' };
      case 'REVIEW':
        return { text: 'IN REVIEW', isDone: true, color: '#E4E4E7' };
      case 'IN_TRANSIT':
        return { text: 'IN TRANSIT', isDone: false, color: '#FFFFFF' };
      default:
        return { text: 'READY', isDone: false, color: THEME.colors.textMuted };
    }
  };

  const status = getStatusBadge();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          isSelected && styles.selectedCard,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {/* Header: Tracking + Status */}
        <View style={styles.headerRow}>
          <View style={styles.trackingContainer}>
            <Text style={styles.trackingNumber}>{delivery.trackingNumber}</Text>
            <Text style={styles.etaText}>{delivery.estimatedDeliveryWindow}</Text>
          </View>

          <View style={styles.statusPill}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
        </View>

        {/* Customer & Address */}
        <View style={styles.body}>
          <View style={styles.customerRow}>
            <Text style={styles.customerName}>{delivery.customer.name}</Text>
            <Text style={styles.customerPhone}>• {delivery.customer.phone}</Text>
          </View>

          <Text style={styles.addressText} numberOfLines={2}>
            {delivery.address.street}, {delivery.address.city}
          </Text>

          {delivery.address.landmark && (
            <Text style={styles.landmarkText}>{delivery.address.landmark}</Text>
          )}
        </View>

        {/* Footer: Residence Category Tag + Action */}
        <View style={styles.footer}>
          <View style={styles.categoryPill}>
            <Ionicons name={dwellRule.icon as any} size={12} color={THEME.colors.textPrimary} />
            <Text style={styles.categoryText}>
              {dwellRule.displayName}
            </Text>
            <View style={styles.dwellDot} />
            <Text style={styles.dwellText}>{dwellRule.requiredDwellSeconds}s dwell</Text>
          </View>

          <View style={styles.actionRow}>
            <Text style={styles.actionText}>Attest</Text>
            <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  selectedCard: {
    borderColor: '#FFFFFF',
    backgroundColor: THEME.colors.surfaceElevated,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  trackingContainer: {
    flex: 1,
  },
  trackingNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    fontFamily: THEME.typography.fontFamily.mono,
    letterSpacing: 0.5,
  },
  etaText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  body: {
    marginBottom: 12,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  customerPhone: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  addressText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  landmarkText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    gap: 5,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  dwellDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: THEME.colors.textMuted,
  },
  dwellText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
