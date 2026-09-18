import { useState, useCallback } from 'react';
import { Delivery, DeliveryStatus, ShiftMetrics } from '../types/delivery';
import { INITIAL_DELIVERIES } from '../constants/demoData';
import { VerificationResult } from '../types/policy';

export function useDelivery() {
  const [deliveries, setDeliveries] = useState<Delivery[]>(INITIAL_DELIVERIES);
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(INITIAL_DELIVERIES[0].id);

  const activeDelivery = deliveries.find((d) => d.id === activeDeliveryId) || deliveries[0] || null;

  // Calculate shift metrics
  const shiftMetrics: ShiftMetrics = {
    totalDeliveries: deliveries.length,
    completed: deliveries.filter((d) => ['VERIFIED', 'REJECTED', 'REVIEW', 'DELIVERED'].includes(d.status)).length,
    verifiedAttempts: deliveries.filter((d) => d.status === 'VERIFIED' || d.status === 'DELIVERED').length,
    rejectedAttempts: deliveries.filter((d) => d.status === 'REJECTED').length,
    reviewAttempts: deliveries.filter((d) => d.status === 'REVIEW').length,
  };

  const selectDelivery = useCallback((id: string) => {
    setActiveDeliveryId(id);
  }, []);

  const updateDeliveryStatus = useCallback((id: string, status: DeliveryStatus) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status } : d))
    );
  }, []);

  const completeDelivery = useCallback((
    id: string,
    handoffType: 'direct' | 'doorstep' | 'security' = 'direct',
    notes?: string
  ): VerificationResult => {
    const delivery = deliveries.find((d) => d.id === id);
    const nowIso = new Date().toISOString();
    const auditId = `AUD-DELIV-${Date.now().toString(36).toUpperCase()}`;

    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: 'DELIVERED',
              handoffType,
              notes: notes || d.notes,
              completedAt: nowIso,
            }
          : d
      )
    );

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
        videoEvidence: false,
        gpsAccuracyMeters: 6,
        anomalyFlags: [],
      },
      ruleChecks: [
        {
          id: 'RULE_HANDOFF_VERIFIED',
          name: 'Customer Handoff Verification',
          category: 'PROXIMITY',
          passed: true,
          actualValue: handoffType === 'direct' ? 'Handed to Customer' : handoffType === 'doorstep' ? 'Left at Door' : 'Security Guard',
          expectedValue: 'Delivery Confirmation',
          isHardRequirement: true,
          explanation: `Package successfully delivered and confirmed via ${handoffType.toUpperCase()} handoff.`,
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
      primaryReason: 'Package successfully handed over and delivery marked as COMPLETE',
      detailedExplanation: `Delivery confirmed at ${delivery?.address.street || 'destination'}. Handoff completed via ${handoffType}.`,
      auditRecordId: auditId,
      evaluationEngine: 'Saboot-ZeroTrust-DeliveryFulfillment-Engine-v1.0',
    };

    return completionResult;
  }, [deliveries]);

  const updateDelivery = useCallback((delivery: Delivery) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === delivery.id ? delivery : d))
    );
  }, []);

  const addDelivery = useCallback((delivery: Delivery) => {
    setDeliveries((prev) => [delivery, ...prev]);
    setActiveDeliveryId(delivery.id);
  }, []);

  const recordAttestationResult = useCallback((id: string, result: VerificationResult) => {
    const statusMap: Record<'VERIFIED' | 'REJECTED' | 'REVIEW' | 'DELIVERED', DeliveryStatus> = {
      VERIFIED: 'VERIFIED',
      REJECTED: 'REJECTED',
      REVIEW: 'REVIEW',
      DELIVERED: 'DELIVERED',
    };
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: statusMap[result.decision],
              videoProofUri: result.videoProofUri || d.videoProofUri,
              requiresAdminApproval: result.requiresAdminApproval ?? d.requiresAdminApproval,
              adminApprovalStatus: result.adminApprovalStatus || d.adminApprovalStatus,
              completedAt: result.decision === 'DELIVERED' ? new Date().toISOString() : d.completedAt,
            }
          : d
      )
    );
  }, []);

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
