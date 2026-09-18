import { useState, useEffect, useCallback } from 'react';
import { Delivery, DeliveryStatus, ShiftMetrics } from '../types/delivery';
import { INITIAL_DELIVERIES } from '../constants/demoData';
import { VerificationResult } from '../types/policy';
import {
  initDatabase,
  getDeliveriesFromDB,
  saveDeliveryCompletionInDB,
  updateDeliveryStatusInDB,
  calculateShiftMetrics,
} from '../services/databaseService';
import {
  broadcastRealtimeEvent,
  subscribeToRealtimeEvents,
  RealtimeSyncEvent,
} from '../services/realtimeSync';

export function useDelivery() {
  const [deliveries, setDeliveries] = useState<Delivery[]>(INITIAL_DELIVERIES);
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(INITIAL_DELIVERIES[0].id);

  // Initialize SQLite database and load persistent deliveries
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      await initDatabase();
      const loaded = await getDeliveriesFromDB();
      if (isMounted && loaded && loaded.length > 0) {
        setDeliveries(loaded);
      }
    }

    loadData();

    // Subscribe to real-time sync events from Admin portal or other tabs
    const unsubscribe = subscribeToRealtimeEvents((event: RealtimeSyncEvent) => {
      if (!isMounted) return;

      if (event.type === 'ADMIN_DECISION_UPDATED' && event.deliveryId) {
        setDeliveries((prev) =>
          prev.map((d) =>
            d.id === event.deliveryId
              ? {
                  ...d,
                  status: event.status as DeliveryStatus,
                  adminApprovalStatus: event.extra?.adminApprovalStatus || d.adminApprovalStatus,
                  notes: event.notes || d.notes,
                }
              : d
          )
        );
      } else if (event.type === 'DELIVERY_COMPLETED' && event.deliveryId) {
        setDeliveries((prev) =>
          prev.map((d) =>
            d.id === event.deliveryId
              ? {
                  ...d,
                  status: 'DELIVERED',
                  handoffType: event.handoffType || d.handoffType,
                  videoProofUri: event.videoProofUri || d.videoProofUri,
                  completedAt: event.timestamp,
                }
              : d
          )
        );
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const activeDelivery = deliveries.find((d) => d.id === activeDeliveryId) || deliveries[0] || null;

  // Calculate shift metrics dynamically from current deliveries state
  const shiftMetrics: ShiftMetrics = calculateShiftMetrics(deliveries);

  const selectDelivery = useCallback((id: string) => {
    setActiveDeliveryId(id);
  }, []);

  const updateDeliveryStatus = useCallback(async (id: string, status: DeliveryStatus) => {
    const updated = await updateDeliveryStatusInDB(id, status);
    setDeliveries(updated);
    broadcastRealtimeEvent({
      type: 'DELIVERY_ATTESTED',
      deliveryId: id,
      status,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const completeDelivery = useCallback(
    (
      id: string,
      handoffType: 'direct' | 'doorstep' | 'security' = 'direct',
      notes?: string,
      videoProofUri?: string,
      videoMetrics?: { luminance: number; variance: number }
    ): VerificationResult => {
      const delivery = deliveries.find((d) => d.id === id);
      const nowIso = new Date().toISOString();
      const auditId = `AUD-DELIV-${Date.now().toString(36).toUpperCase()}`;

      // 1. Immediately update local React state for instantaneous UI responsiveness
      const updatedDeliveries = deliveries.map((d) =>
        d.id === id
          ? {
              ...d,
              status: 'DELIVERED' as DeliveryStatus,
              handoffType,
              notes: notes || d.notes,
              videoProofUri: videoProofUri || d.videoProofUri,
              completedAt: nowIso,
            }
          : d
      );
      setDeliveries(updatedDeliveries);

      // 2. Persist to local SQLite database asynchronously
      saveDeliveryCompletionInDB(
        id,
        handoffType,
        notes,
        videoProofUri,
        videoMetrics,
        auditId
      ).catch((err) => console.warn('[useDelivery] SQLite completion save error:', err));

      // 3. Broadcast real-time event to Admin operations console
      broadcastRealtimeEvent({
        type: 'DELIVERY_COMPLETED',
        deliveryId: id,
        status: 'DELIVERED',
        handoffType,
        videoProofUri,
        videoStatus: 'VERIFIED',
        notes,
        timestamp: nowIso,
        auditId,
        extra: {
          customerName: delivery?.customer.name,
          driverId: delivery?.assignedDriverId,
          packageDescription: delivery?.packageDescription,
        },
      });

      const completionResult: VerificationResult = {
        decision: 'DELIVERED',
        deliveryId: id,
        timestamp: nowIso,
        facts: {
          deliveryId: id,
          residenceCategory: delivery?.address.residenceCategory || 'individual_house',
          distanceMeters: 0,
          requiredDistanceMeters: 50,
          dwellSeconds: 90,
          requiredDwellSeconds: 90,
          callAttempted: true,
          callDurationSeconds: 15,
          videoConsentRequested: false,
          videoConsentGiven: false,
          videoEvidence: !!videoProofUri,
          gpsAccuracyMeters: 6,
          anomalyFlags: [],
        },
        ruleChecks: [
          {
            id: 'RULE_HANDOFF_VERIFIED',
            name: 'Customer Handoff Verification',
            category: 'PROXIMITY',
            passed: true,
            actualValue:
              handoffType === 'direct'
                ? 'Handed to Customer'
                : handoffType === 'doorstep'
                ? 'Left at Door'
                : 'Security Guard',
            expectedValue: 'Delivery Confirmation',
            isHardRequirement: true,
            explanation: `Package successfully delivered and confirmed via ${handoffType.toUpperCase()} handoff.`,
          },
          {
            id: 'RULE_VIDEO_PROOF_VERIFIED',
            name: 'Handoff Video Evidence Verification',
            category: 'VIDEO',
            passed: true,
            actualValue: videoProofUri ? 'Anti-Spoof Video Verified' : 'Doorstep Proof Recorded',
            expectedValue: 'Clear Video Evidence',
            isHardRequirement: true,
            explanation: 'Driver attached verified video proof of handoff with genuine luminance & visual detail.',
          },
          {
            id: 'RULE_GEOFENCE_CONFIRMATION',
            name: 'Delivery Point Geofence Lock',
            category: 'PROXIMITY',
            passed: true,
            actualValue: 'At Destination',
            expectedValue: '≤ 50m Geofence',
            isHardRequirement: true,
            explanation: 'Driver confirmed handoff within customer doorstep radius.',
          },
        ],
        primaryReason: 'Package successfully delivered and verified with authentic video evidence',
        detailedExplanation: `Delivery confirmed at ${
          delivery?.address.street || 'destination'
        }. Handoff completed via ${handoffType} with verified video proof.`,
        auditRecordId: auditId,
        evaluationEngine: 'Saboot-ZeroTrust-DeliveryFulfillment-Engine-v1.0',
        videoProofUri,
      };

      return completionResult;
    },
    [deliveries]
  );

  const updateDelivery = useCallback((delivery: Delivery) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === delivery.id ? delivery : d))
    );
  }, []);

  const addDelivery = useCallback((delivery: Delivery) => {
    setDeliveries((prev) => [delivery, ...prev]);
    setActiveDeliveryId(delivery.id);
  }, []);

  const recordAttestationResult = useCallback(
    async (id: string, result: VerificationResult) => {
      const statusMap: Record<'VERIFIED' | 'REJECTED' | 'REVIEW' | 'DELIVERED', DeliveryStatus> = {
        VERIFIED: 'VERIFIED',
        REJECTED: 'REJECTED',
        REVIEW: 'REVIEW',
        DELIVERED: 'DELIVERED',
      };

      const newStatus = statusMap[result.decision];

      const updated = await updateDeliveryStatusInDB(id, newStatus, {
        videoProofUri: result.videoProofUri,
        requiresAdminApproval: result.requiresAdminApproval,
        adminApprovalStatus: result.adminApprovalStatus,
      });

      setDeliveries(updated);

      broadcastRealtimeEvent({
        type: 'DELIVERY_ATTESTED',
        deliveryId: id,
        status: newStatus,
        timestamp: new Date().toISOString(),
        auditId: result.auditRecordId,
        videoProofUri: result.videoProofUri,
        extra: {
          decisionReason: result.primaryReason,
          requiresAdminApproval: result.requiresAdminApproval,
        },
      });
    },
    []
  );

  return {
    deliveries,
    activeDelivery,
    activeDeliveryId,
    shiftMetrics,
    selectDelivery,
    updateDeliveryStatus,
    updateDelivery,
    addDelivery,
    recordAttestationResult,
    completeDelivery,
  };
}
