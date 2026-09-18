import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Delivery, ResidenceCategory, DeliveryStatus } from '../types/delivery';
import { DWELL_POLICY_CONFIG } from '../constants/dwellPolicy';

interface AdminPanelProps {
  deliveries: Delivery[];
  onUpdateDelivery: (delivery: Delivery) => void;
  onCreateDelivery: (delivery: Delivery) => void;
  onClose: () => void;
}

const DRIVERS = [
  { id: 'DRV-BLR-09', name: 'Ramesh Kumar (Unit 24)' },
  { id: 'DRV-BLR-12', name: 'Sunil Rao (Unit 12)' },
  { id: 'DRV-BLR-15', name: 'Praveen Gowda (Unit 15)' },
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  deliveries,
  onUpdateDelivery,
  onCreateDelivery,
  onClose,
}) => {
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(deliveries[0] || null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  // New Delivery Form State
  const [newCustomerName, setNewCustomerName] = useState('Vishnu Bhargav');
  const [newCustomerPhone, setNewCustomerPhone] = useState('+91 90191 44983');
  const [newStreet, setNewStreet] = useState('100 Feet Road, Indiranagar');
  const [newUnit, setNewUnit] = useState('#42, 2nd Floor');
  const [newCity, setNewCity] = useState('Bengaluru');
  const [newPostal, setNewPostal] = useState('560038');
  const [newCategory, setNewCategory] = useState<ResidenceCategory>('gated_society');
  const [newPackage, setNewPackage] = useState('Electronics — ANC Headphones');
  const [newDriver, setNewDriver] = useState('DRV-BLR-09');

  const handleCreateSubmit = () => {
    if (!newCustomerName || !newCustomerPhone || !newStreet) {
      Alert.alert('Required Fields', 'Please fill in customer name, phone, and address.');
      return;
    }

    const id = `DEL-${Math.floor(1000 + Math.random() * 9000)}`;
    const trackingNumber = `SBT-BLR-${Math.floor(100000 + Math.random() * 900000)}`;

    const newDelivery: Delivery = {
      id,
      trackingNumber,
      customer: {
        id: `CUST-${Math.floor(100 + Math.random() * 900)}`,
        name: newCustomerName,
        phone: newCustomerPhone,
      },
      address: {
        street: newStreet,
        unitOrFlat: newUnit,
        city: newCity,
        postalCode: newPostal,
        latitude: 12.9719,
        longitude: 77.6412,
        residenceCategory: newCategory,
      },
      packageDescription: newPackage,
      estimatedDeliveryWindow: '02:00 PM - 03:00 PM',
      status: 'ASSIGNED',
      createdAt: new Date().toISOString(),
      assignedDriverId: newDriver,
    };

    onCreateDelivery(newDelivery);
    setSelectedDelivery(newDelivery);
    setIsCreateModalVisible(false);
    Alert.alert('Delivery Created', `Package ${trackingNumber} assigned to ${newDriver}`);
  };

  const handleAssignDriver = (driverId: string) => {
    if (!selectedDelivery) return;
    const updated = { ...selectedDelivery, assignedDriverId: driverId };
    setSelectedDelivery(updated);
    onUpdateDelivery(updated);
  };

  const handleChangeCategory = (cat: ResidenceCategory) => {
    if (!selectedDelivery) return;
    const updated = {
      ...selectedDelivery,
      address: {
        ...selectedDelivery.address,
        residenceCategory: cat,
      },
    };
    setSelectedDelivery(updated);
    onUpdateDelivery(updated);
  };

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'VERIFIED':
        return { text: 'VERIFIED', color: THEME.colors.green, bg: THEME.colors.geofenceBg };
      case 'REJECTED':
        return { text: 'REJECTED', color: THEME.colors.signal, bg: '#FFF5F2' };
      case 'REVIEW':
        return { text: 'IN REVIEW', color: '#B45309', bg: '#FFFBEB' };
      default:
        return { text: 'ASSIGNED', color: THEME.colors.slate, bg: '#EEF2F3' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Admin Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>OPERATIONS CONSOLE</Text>
          <Text style={styles.title}>SABOOT DISPATCH ADMIN</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.newButton}
            onPress={() => setIsCreateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.newButtonText}>CREATE DELIVERY</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={THEME.colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Route Summary */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{deliveries.length}</Text>
            <Text style={styles.summaryLabel}>TOTAL ORDERS</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: THEME.colors.green }]}>
              {deliveries.filter((d) => d.status === 'VERIFIED').length}
            </Text>
            <Text style={styles.summaryLabel}>VERIFIED</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: THEME.colors.signal }]}>
              {deliveries.filter((d) => d.status === 'REJECTED').length}
            </Text>
            <Text style={styles.summaryLabel}>REJECTED</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>
              {deliveries.filter((d) => d.status === 'REVIEW').length}
            </Text>
            <Text style={styles.summaryLabel}>REVIEW</Text>
          </View>
        </View>

        {/* Deliveries List for Selection */}
        <Text style={styles.sectionHeader}>ASSIGN & MANAGE DELIVERIES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hList}>
          {deliveries.map((del) => {
            const isSelected = selectedDelivery?.id === del.id;
            const badge = getStatusBadge(del.status);

            return (
              <TouchableOpacity
                key={del.id}
                style={[styles.delChip, isSelected && styles.delChipSelected]}
                onPress={() => setSelectedDelivery(del)}
                activeOpacity={0.8}
              >
                <View style={styles.chipTopRow}>
                  <Text style={styles.chipTracking}>{del.trackingNumber}</Text>
                  <View style={[styles.chipBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.chipBadgeText, { color: badge.color }]}>{badge.text}</Text>
                  </View>
                </View>
                <Text style={styles.chipName} numberOfLines={1}>{del.customer.name}</Text>
                <Text style={styles.chipDriver}>Driver: {del.assignedDriverId}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected Delivery Configuration Panel */}
        {selectedDelivery && (
          <View style={styles.configCard}>
            <View style={styles.configHeader}>
              <View>
                <Text style={styles.configTracking}>{selectedDelivery.trackingNumber}</Text>
                <Text style={styles.configCustomer}>{selectedDelivery.customer.name} ({selectedDelivery.customer.phone})</Text>
              </View>
              <View style={[styles.statusTag, { backgroundColor: getStatusBadge(selectedDelivery.status).bg }]}>
                <Text style={[styles.statusTagText, { color: getStatusBadge(selectedDelivery.status).color }]}>
                  {getStatusBadge(selectedDelivery.status).text}
                </Text>
              </View>
            </View>

            <Text style={styles.configAddress}>
              📍 {selectedDelivery.address.street}, {selectedDelivery.address.city}
            </Text>

            <View style={styles.divider} />

            {/* 1. Driver Assignment */}
            <Text style={styles.fieldLabel}>ASSIGNED DRIVER</Text>
            <View style={styles.driverList}>
              {DRIVERS.map((drv) => {
                const isCurrent = selectedDelivery.assignedDriverId === drv.id;
                return (
                  <TouchableOpacity
                    key={drv.id}
                    style={[styles.driverOption, isCurrent && styles.driverOptionSelected]}
                    onPress={() => handleAssignDriver(drv.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isCurrent ? 'radio-button-on' : 'radio-button-off'}
                      size={16}
                      color={isCurrent ? THEME.colors.signal : THEME.colors.muted}
                    />
                    <Text style={[styles.driverOptionText, isCurrent && { fontWeight: '800', color: THEME.colors.foreground }]}>
                      {drv.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.divider} />

            {/* 2. Residence Category & Dwell Rule Setup */}
            <Text style={styles.fieldLabel}>RESIDENCE CATEGORY (SETS DWELL THRESHOLD)</Text>
            <View style={styles.categoryGrid}>
              {(['individual_house', 'apartment', 'gated_society'] as ResidenceCategory[]).map((cat) => {
                const isCurrent = selectedDelivery.address.residenceCategory === cat;
                const rule = DWELL_POLICY_CONFIG[cat];

                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catOption, isCurrent && styles.catOptionSelected]}
                    onPress={() => handleChangeCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.catOptionTitle, isCurrent && { color: THEME.colors.signal }]}>
                      {rule.displayName}
                    </Text>
                    <Text style={styles.catOptionDwell}>{rule.requiredDwellSeconds}s Required</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Delivery Modal */}
      <Modal
        visible={isCreateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CREATE NEW DISPATCH ORDER</Text>
              <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}>
                <Ionicons name="close" size={20} color={THEME.colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>CUSTOMER NAME</Text>
              <TextInput
                style={styles.textInput}
                value={newCustomerName}
                onChangeText={setNewCustomerName}
                placeholder="Full Name"
              />

              <Text style={styles.inputLabel}>CUSTOMER PHONE</Text>
              <TextInput
                style={styles.textInput}
                value={newCustomerPhone}
                onChangeText={setNewCustomerPhone}
                placeholder="+91 90191 44983"
              />

              <Text style={styles.inputLabel}>STREET ADDRESS</Text>
              <TextInput
                style={styles.textInput}
                value={newStreet}
                onChangeText={setNewStreet}
                placeholder="100 Feet Road, Indiranagar"
              />

              <Text style={styles.inputLabel}>FLAT / UNIT</Text>
              <TextInput
                style={styles.textInput}
                value={newUnit}
                onChangeText={setNewUnit}
                placeholder="#42, 2nd Floor"
              />

              <Text style={styles.inputLabel}>PACKAGE DETAILS</Text>
              <TextInput
                style={styles.textInput}
                value={newPackage}
                onChangeText={setNewPackage}
                placeholder="High value electronics"
              />

              <Text style={styles.inputLabel}>RESIDENCE CATEGORY</Text>
              <View style={styles.catSelectRow}>
                {(['individual_house', 'apartment', 'gated_society'] as ResidenceCategory[]).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catPill, newCategory === cat && styles.catPillSelected]}
                    onPress={() => setNewCategory(cat)}
                  >
                    <Text style={[styles.catPillText, newCategory === cat && { color: '#FFFFFF' }]}>
                      {DWELL_POLICY_CONFIG[cat].displayName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.submitCreateBtn} onPress={handleCreateSubmit} activeOpacity={0.85}>
              <Text style={styles.submitCreateText}>DISPATCH & SAVE ORDER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2F3',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#DBE1E5',
  },
  headerLeft: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.foreground,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newButton: {
    backgroundColor: THEME.colors.signal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 2,
  },
  newButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  closeButton: {
    backgroundColor: '#EEF2F3',
    padding: 6,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#CFD7D8',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DBE1E5',
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNum: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.foreground,
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#DBE1E5',
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  hList: {
    marginBottom: 14,
  },
  delChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBE1E5',
    borderRadius: 4,
    padding: 12,
    width: 200,
    marginRight: 10,
  },
  delChipSelected: {
    borderColor: THEME.colors.foreground,
    backgroundColor: '#FAFBFB',
    borderWidth: 2,
  },
  chipTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chipTracking: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.foreground,
  },
  chipBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  chipBadgeText: {
    fontSize: 8,
    fontWeight: '900',
  },
  chipName: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.foreground,
    marginBottom: 2,
  },
  chipDriver: {
    fontSize: 10,
    color: THEME.colors.muted,
  },
  configCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DBE1E5',
    padding: 16,
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  configTracking: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.foreground,
  },
  configCustomer: {
    fontSize: 12,
    color: THEME.colors.slate,
    fontWeight: '600',
    marginTop: 2,
  },
  configAddress: {
    fontSize: 13,
    color: THEME.colors.slate,
    fontWeight: '600',
  },
  statusTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF2F3',
    marginVertical: 12,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  driverList: {
    gap: 6,
  },
  driverOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F4F6F7',
    padding: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#DBE1E5',
  },
  driverOptionSelected: {
    borderColor: THEME.colors.foreground,
    backgroundColor: '#FAFBFB',
  },
  driverOptionText: {
    fontSize: 12,
    color: THEME.colors.slate,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  catOption: {
    flex: 1,
    backgroundColor: '#F4F6F7',
    padding: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#DBE1E5',
    alignItems: 'center',
  },
  catOptionSelected: {
    borderColor: THEME.colors.signal,
    backgroundColor: '#FFF5F2',
  },
  catOptionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.foreground,
    textAlign: 'center',
  },
  catOptionDwell: {
    fontSize: 9,
    color: THEME.colors.muted,
    fontWeight: '700',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(21, 32, 43, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.foreground,
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F4F6F7',
    borderWidth: 1,
    borderColor: '#DBE1E5',
    borderRadius: 2,
    padding: 10,
    fontSize: 12,
    color: THEME.colors.foreground,
    marginBottom: 10,
  },
  catSelectRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  catPill: {
    flex: 1,
    backgroundColor: '#F4F6F7',
    paddingVertical: 8,
    borderRadius: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBE1E5',
  },
  catPillSelected: {
    backgroundColor: THEME.colors.slate,
    borderColor: THEME.colors.slate,
  },
  catPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.slate,
  },
  submitCreateBtn: {
    backgroundColor: THEME.colors.signal,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 2,
  },
  submitCreateText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
