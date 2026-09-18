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
    completed: deliveries.filter((d) => ['VERIFIED', 'REJECTED', 'REVIEW'].includes(d.status)).length,
    verifiedAttempts: deliveries.filter((d) => d.status === 'VERIFIED').length,
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
    const statusMap: Record<'VERIFIED' | 'REJECTED' | 'REVIEW', DeliveryStatus> = {
      VERIFIED: 'VERIFIED',
      REJECTED: 'REJECTED',
      REVIEW: 'REVIEW',
    };
    updateDeliveryStatus(id, statusMap[result.decision]);
  }, [updateDeliveryStatus]);

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
  };
}
