import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
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

  const getResidenceColor = () => {
    switch (delivery.address.residenceCategory) {
      case 'gated_society':
        return THEME.colors.categoryGated;
      case 'apartment':
        return THEME.colors.categoryApartment;
      case 'individual_house':
      default:
        return THEME.colors.categoryHouse;
    }
  };

  const getStatusBadge = () => {
    switch (delivery.status) {
      case 'VERIFIED':
        return {
          text: '🟢 VERIFIED',
          bg: THEME.colors.verifiedBg,
          color: THEME.colors.verified,
          border: THEME.colors.verifiedBorder,
        };
      case 'REJECTED':
        return {
          text: '🔴 REJECTED',
          bg: THEME.colors.rejectedBg,
          color: THEME.colors.rejected,
          border: THEME.colors.rejectedBorder,
        };
      case 'REVIEW':
        return {
          text: '🟡 IN REVIEW',
          bg: THEME.colors.reviewBg,
          color: THEME.colors.review,
          border: THEME.colors.reviewBorder,
        };
      case 'IN_TRANSIT':
        return {
          text: '🔵 IN TRANSIT',
          bg: 'rgba(56, 189, 248, 0.12)',
          color: THEME.colors.primary,
          border: THEME.colors.primary,
        };
      default:
        return {
          text: 'ASSIGNED',
          bg: THEME.colors.surfaceElevated,
          color: THEME.colors.textSecondary,
          border: THEME.colors.borderLight,
        };
    }
  };

  const statusBadge = getStatusBadge();
  const residenceColor = getResidenceColor();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.selectedCard,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Card Header: Tracking + Status */}
      <View style={styles.headerRow}>
        <View style={styles.trackingContainer}>
          <Text style={styles.trackingNumber}>{delivery.trackingNumber}</Text>
          <Text style={styles.etaText}>ETA: {delivery.estimatedDeliveryWindow}</Text>
        </View>

        <View
          style={[
            styles.statusPill,
            { backgroundColor: statusBadge.bg, borderColor: statusBadge.border },
          ]}
        >
          <Text style={[styles.statusText, { color: statusBadge.color }]}>
            {statusBadge.text}
          </Text>
        </View>
      </View>

      {/* Customer & Address */}
      <View style={styles.body}>
        <View style={styles.customerRow}>
          <Ionicons name="person" size={14} color={THEME.colors.textSecondary} />
          <Text style={styles.customerName}>{delivery.customer.name}</Text>
          <Text style={styles.customerPhone}>• {delivery.customer.phone}</Text>
        </View>

        <View style={styles.addressRow}>
          <Ionicons name="location-sharp" size={16} color={THEME.colors.primary} />
          <Text style={styles.addressText} numberOfLines={2}>
            {delivery.address.street}, {delivery.address.city}
          </Text>
        </View>

        {delivery.address.landmark && (
          <Text style={styles.landmarkText}>Landmark: {delivery.address.landmark}</Text>
        )}

        <View style={styles.packageRow}>
          <Ionicons name="cube" size={13} color={THEME.colors.textMuted} />
          <Text style={styles.packageText} numberOfLines={1}>
            {delivery.packageDescription}
          </Text>
        </View>
      </View>

      {/* Footer: Category-Aware Dwell Requirement Badge + Action */}
      <View style={styles.footer}>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: `${residenceColor}15`, borderColor: `${residenceColor}40` },
          ]}
        >
          <Ionicons
            name={dwellRule.icon as any}
            size={13}
            color={residenceColor}
          />
          <Text style={[styles.categoryText, { color: residenceColor }]}>
            {dwellRule.displayName}
          </Text>
          <View style={[styles.dwellTimeTag, { backgroundColor: `${residenceColor}25` }]}>
            <Text style={[styles.dwellTimeText, { color: residenceColor }]}>
              {dwellRule.requiredDwellSeconds}s Dwell
            </Text>
          </View>
        </View>

        <View style={styles.actionPrompt}>
          <Text style={styles.actionText}>Attest Attempt</Text>
          <Ionicons name="arrow-forward" size={14} color={THEME.colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedCard: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trackingContainer: {
    flex: 1,
  },
  trackingNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  etaText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  body: {
    marginBottom: 12,
    gap: 6,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  customerPhone: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  addressText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  landmarkText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginLeft: 22,
    fontStyle: 'italic',
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  packageText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dwellTimeTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dwellTimeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
});
