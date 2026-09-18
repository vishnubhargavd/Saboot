/**
 * Saboot Real-Time Synchronization Service
 * 
 * Synchronizes delivery status updates, completed handoffs with video proof,
 * and admin decisions between the Driver App and the Admin Operations Portal.
 * Uses BroadcastChannel with window storage event fallback.
 */

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

let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch (err) {
    console.warn('[RealtimeSync] BroadcastChannel not supported:', err);
  }
}

/**
 * Broadcast an event to all listening apps (Driver App & Admin Portal)
 */
export function broadcastRealtimeEvent(event: RealtimeSyncEvent): void {
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage(event);
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        STORAGE_EVENT_KEY,
        JSON.stringify({ ...event, _t: Date.now() })
      );
    }
  } catch (err) {
    console.warn('[RealtimeSync] Broadcast failed:', err);
  }
}

/**
 * Subscribe to real-time events across windows / tabs
 */
export function subscribeToRealtimeEvents(
  listener: (event: RealtimeSyncEvent) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleBroadcastMessage = (msgEvent: MessageEvent) => {
    if (msgEvent && msgEvent.data) {
      listener(msgEvent.data);
    }
  };

  const handleStorageEvent = (storageEvent: StorageEvent) => {
    if (storageEvent.key === STORAGE_EVENT_KEY && storageEvent.newValue) {
      try {
        const parsed = JSON.parse(storageEvent.newValue);
        listener(parsed);
      } catch (err) {
        console.error('[RealtimeSync] Failed to parse storage event:', err);
      }
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  window.addEventListener('storage', handleStorageEvent);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
    window.removeEventListener('storage', handleStorageEvent);
  };
}
