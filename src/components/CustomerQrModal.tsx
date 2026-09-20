import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { THEME } from '../constants/theme';
import { Delivery } from '../types/delivery';
import { getSyncServerUrl, subscribeToRealtimeEvents, RealtimeSyncEvent } from '../services/realtimeSync';

interface CustomerQrModalProps {
  visible: boolean;
  delivery: Delivery;
  onClose: () => void;
  onVerificationResolved?: (status: 'VERIFIED' | 'CUSTOMER_CONFIRMED_FAILURE') => void;
}

export const CustomerQrModal: React.FC<CustomerQrModalProps> = ({
  visible,
  delivery,
  onClose,
  onVerificationResolved,
}) => {
  const [token, setToken] = useState<string | null>(delivery.verificationToken || null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(delivery.verificationUrl || null);
  const [expiresAt, setExpiresAt] = useState<string | null>(delivery.qrExpiresAt || null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [customerScanned, setCustomerScanned] = useState<boolean>(delivery.qrStatus === 'SCANNED');
  const [customerResponse, setCustomerResponse] = useState<'PACKAGE_RECEIVED' | 'PACKAGE_NOT_RECEIVED' | null>(
    (delivery.customerResponse as any) || null
  );

  const timerRef = useRef<any>(null);

  // Request fresh token from backend API
  const generateNewQr = async () => {
    setIsLoading(true);
    setIsExpired(false);
    setCustomerResponse(null);
    setCustomerScanned(false);

    try {
      const serverUrl = getSyncServerUrl();
      const attemptId = delivery.auditId || `ATT-${delivery.id}`;
      const res = await fetch(`${serverUrl}/api/deliveries/${encodeURIComponent(delivery.id)}/attempts/${encodeURIComponent(attemptId)}/customer-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Driver-Id': delivery.assignedDriverId || 'DRV-BLR-09'
        },
      });

      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setVerificationUrl(data.verificationUrl);
        setExpiresAt(data.expiresAt);
        const ttl = data.expiresInSeconds || 300;
        setRemainingSeconds(ttl);
      } else {
        const fallbackUrl = `${serverUrl}/v/${delivery.id}`;
        setVerificationUrl(fallbackUrl);
        setRemainingSeconds(300);
      }
    } catch (e) {
      const serverUrl = getSyncServerUrl();
      setVerificationUrl(`${serverUrl}/v/${delivery.id}`);
      setRemainingSeconds(300);
    } finally {
      setIsLoading(false);
    }
  };

  // On open: fetch token if missing or expired
  useEffect(() => {
    if (visible) {
      if (!verificationUrl || !expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
        generateNewQr();
      } else {
        const diff = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
        setRemainingSeconds(diff);
        if (diff === 0) setIsExpired(true);
      }
    }
  }, [visible, delivery.id]);

  // Live countdown timer
  useEffect(() => {
    if (!visible || isExpired || customerResponse) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, isExpired, customerResponse]);

  // Real-time SSE / event listener for live updates
  useEffect(() => {
    if (!visible) return;

    const unsubscribe = subscribeToRealtimeEvents((event: RealtimeSyncEvent) => {
      if (event.deliveryId === delivery.id) {
        if (event.type === 'CUSTOMER_QR_SCANNED') {
          setCustomerScanned(true);
        } else if (event.type === 'CUSTOMER_RESPONSE_RECORDED') {
          const resp = (event as any).customerResponse;
          if (resp === 'PACKAGE_RECEIVED' || resp === 'PACKAGE_NOT_RECEIVED') {
            setCustomerResponse(resp);
            if (onVerificationResolved) {
              onVerificationResolved(resp === 'PACKAGE_RECEIVED' ? 'VERIFIED' : 'CUSTOMER_CONFIRMED_FAILURE');
            }
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [visible, delivery.id, onVerificationResolved]);

  // Format MM:SS for countdown
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="qr-code-outline" size={20} color={THEME.colors.foreground} />
              <Text style={styles.headerTitle}>CUSTOMER VERIFICATION</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={THEME.colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <View style={styles.body}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.colors.signal} />
                <Text style={styles.loadingText}>Generating secure verification QR...</Text>
              </View>
            ) : customerResponse === 'PACKAGE_RECEIVED' ? (
              <View style={styles.resultContainer}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
                  <Ionicons name="checkmark" size={44} color="#15803D" />
                </View>
                <Text style={styles.resultTitle}>✓ CUSTOMER CONFIRMED</Text>
                <Text style={styles.resultSubtitle}>Package received</Text>
                <View style={styles.resultBadge}>
                  <Text style={styles.resultBadgeText}>Delivery verification completed.</Text>
                </View>
                <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
                  <Text style={styles.doneBtnText}>VIEW VERIFIED RESULT</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : customerResponse === 'PACKAGE_NOT_RECEIVED' ? (
              <View style={styles.resultContainer}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                  <Ionicons name="alert" size={40} color="#B91C1C" />
                </View>
                <Text style={[styles.resultTitle, { color: '#B91C1C' }]}>! CUSTOMER REPORTED NOT RECEIVED</Text>
                <Text style={styles.resultSubtitle}>Retry delivery required.</Text>
                <View style={[styles.resultBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                  <Text style={[styles.resultBadgeText, { color: '#991B1B' }]}>
                    Added to route queue: 🔄 RETRY DELIVERY
                  </Text>
                </View>
                <TouchableOpacity style={[styles.doneBtn, { backgroundColor: THEME.colors.foreground }]} onPress={onClose} activeOpacity={0.85}>
                  <Text style={styles.doneBtnText}>RETURN TO ROUTE</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : isExpired ? (
              <View style={styles.expiredContainer}>
                <View style={styles.expiredIconBox}>
                  <Ionicons name="time-outline" size={42} color="#D94A27" />
                </View>
                <Text style={styles.expiredTitle}>QR EXPIRED</Text>
                <Text style={styles.expiredSub}>
                  For zero-trust security, customer verification QRs expire after 5 minutes.
                </Text>
                <TouchableOpacity style={styles.regenerateBtn} onPress={generateNewQr} activeOpacity={0.85}>
                  <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.regenerateBtnText}>GENERATE NEW QR</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.qrContainer}>
                {/* Delivery Ref Badge */}
                <View style={styles.deliveryBadge}>
                  <Text style={styles.deliveryBadgeText}>Delivery: #{delivery.id}</Text>
                </View>

                {/* High-Contrast QR Code Card */}
                <View style={styles.qrCard}>
                  {verificationUrl ? (
                    <QRCode
                      value={verificationUrl}
                      size={240}
                      color="#0F172A"
                      backgroundColor="#FFFFFF"
                      quietZone={16}
                    />
                  ) : null}
                </View>

                {/* Instructions */}
                <Text style={styles.scanInstruction}>
                  Scan this code with your phone camera
                </Text>

                {/* Live Countdown & Status */}
                <View style={styles.footerStatus}>
                  <View style={styles.timerRow}>
                    <Ionicons name="timer-outline" size={16} color="#B45309" />
                    <Text style={styles.timerText}>
                      Expires in <Text style={styles.timerBold}>{formatTimer(remainingSeconds)}</Text>
                    </Text>
                  </View>

                  {customerScanned ? (
                    <View style={styles.scannedBanner}>
                      <Ionicons name="phone-portrait-outline" size={14} color="#15803D" />
                      <Text style={styles.scannedText}>Customer opened verification page • Awaiting response...</Text>
                    </View>
                  ) : (
                    <Text style={styles.waitingText}>Waiting for customer to scan...</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: THEME.colors.foreground,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 24,
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  qrContainer: {
    alignItems: 'center',
    width: '100%',
  },
  deliveryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
    marginBottom: 16,
  },
  deliveryBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scanInstruction: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  footerStatus: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  timerText: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '700',
  },
  timerBold: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '900',
  },
  waitingText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  scannedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 4,
  },
  scannedText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '800',
  },
  expiredContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    width: '100%',
  },
  expiredIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF5F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  expiredTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#D94A27',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  expiredSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 1.5,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  regenerateBtn: {
    backgroundColor: '#D94A27',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 4,
    width: '100%',
    justifyContent: 'center',
  },
  regenerateBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  statusIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.8,
    marginBottom: 4,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
    textAlign: 'center',
  },
  resultBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    marginBottom: 24,
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
    textAlign: 'center',
  },
  doneBtn: {
    backgroundColor: '#15803D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 4,
    width: '100%',
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
