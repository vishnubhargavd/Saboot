/**
 * Saboot Real-Time Synchronization Service
 * 
 * Synchronizes delivery status updates, completed handoffs with video proof,
 * and admin decisions between the Driver App and the Admin Operations Portal.
 * Uses in-memory dispatch on native React Native and BroadcastChannel / Storage on Web.
 */

import { Platform } from 'react-native';

export type RealtimeEventType = 
  | 'DELIVERY_COMPLETED'
  | 'DELIVERY_ATTESTED'
  | 'ADMIN_DECISION_UPDATED'
  | 'DATABASE_RESET';

export interface RealtimeSyncEvent {
  type: RealtimeEventType;
  deliveryId: string;
  status: string;
  handoffType?: 'direct' | 'doorstep' | 'security';
  videoProofUri?: string;
  videoStatus?: string;
  notes?: string;
  timestamp: string;
  auditId?: string;
  extra?: any;
}

const CHANNEL_NAME = 'saboot_realtime_sync';
const STORAGE_EVENT_KEY = 'saboot_realtime_event_bus';

// In-memory listeners for native React Native environments (iOS / Android)
const inMemoryListeners: Set<(event: RealtimeSyncEvent) => void> = new Set();

let broadcastChannel: any = null;

if (Platform.OS === 'web' && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new (window as any).BroadcastChannel(CHANNEL_NAME);
  } catch (err) {
    console.warn('[RealtimeSync] BroadcastChannel not supported:', err);
  }
}

/**
 * Broadcast an event to all listening apps (Driver App & Admin Portal)
 */
export function broadcastRealtimeEvent(event: RealtimeSyncEvent): void {
  try {
    // Notify native in-memory listeners
    inMemoryListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.warn('[RealtimeSync] in-memory listener error:', err);
      }
    });

    // Web BroadcastChannel & localStorage sync
    if (Platform.OS === 'web') {
      if (broadcastChannel && typeof broadcastChannel.postMessage === 'function') {
        broadcastChannel.postMessage(event);
      }

      if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
        window.localStorage.setItem(
          STORAGE_EVENT_KEY,
          JSON.stringify({ ...event, _t: Date.now() })
        );
      }
    }
  } catch (err) {
    console.warn('[RealtimeSync] Broadcast failed:', err);
  }
}

/**
 * Subscribe to real-time events across native hooks and web windows / tabs
 */
export function subscribeToRealtimeEvents(
  listener: (event: RealtimeSyncEvent) => void
): () => void {
  // Always register for in-memory events
  inMemoryListeners.add(listener);

  let handleBroadcastMessage: any = null;
  let handleStorageEvent: any = null;

  // Setup DOM listeners only on Web platform where addEventListener is available
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.addEventListener === 'function'
  ) {
    handleBroadcastMessage = (msgEvent: any) => {
      if (msgEvent && msgEvent.data) {
        listener(msgEvent.data);
      }
    };

    handleStorageEvent = (storageEvent: any) => {
      if (storageEvent.key === STORAGE_EVENT_KEY && storageEvent.newValue) {
        try {
          const parsed = JSON.parse(storageEvent.newValue);
          listener(parsed);
        } catch (err) {
          console.error('[RealtimeSync] Failed to parse storage event:', err);
        }
      }
    };

    if (broadcastChannel && typeof broadcastChannel.addEventListener === 'function') {
      broadcastChannel.addEventListener('message', handleBroadcastMessage);
    }

    try {
      window.addEventListener('storage', handleStorageEvent);
    } catch (e) {
      console.warn('[RealtimeSync] Failed to attach storage listener:', e);
    }
  }

  return () => {
    inMemoryListeners.delete(listener);

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      typeof window.removeEventListener === 'function'
    ) {
      if (broadcastChannel && typeof broadcastChannel.removeEventListener === 'function' && handleBroadcastMessage) {
        broadcastChannel.removeEventListener('message', handleBroadcastMessage);
      }
      if (handleStorageEvent) {
        try {
          window.removeEventListener('storage', handleStorageEvent);
        } catch (e) {}
      }
    }
  };
}
