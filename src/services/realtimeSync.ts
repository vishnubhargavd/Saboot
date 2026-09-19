/**
 * Saboot Real-Time Synchronization Service
 * 
 * Synchronizes delivery status updates, completed handoffs with video proof,
 * newly dispatched tasks, and admin decisions between the Driver App and the Admin Operations Portal.
 * Uses HTTP REST + Server-Sent Events (SSE) & polling across all platforms (iOS/Android/Web)
 * with fast in-memory dispatch and web BroadcastChannel / localStorage fallback.
 */

import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

export type RealtimeEventType = 
  | 'DELIVERY_COMPLETED'
  | 'DELIVERY_ATTESTED'
  | 'ADMIN_DECISION_UPDATED'
  | 'ORDER_DISPATCHED'
  | 'TASK_ASSIGNED'
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
    // silently ignore
  }
}

/**
 * Determine the Saboot Admin & Sync server base URL dynamically
 * Automatically resolves physical Android phone Wi-Fi connection to host machine
 */
export function getSyncServerUrl(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      return `http://${window.location.hostname}:3000`;
    }
    return 'http://localhost:3000';
  }

  // React Native Native (iOS / Android / Expo Go)
  // 1. Try extracting Metro bundler host IP from Expo Constants
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
      (Constants as any).experienceUrl;
    if (hostUri) {
      const cleaned = hostUri.replace(/^[a-z]+:\/\//, '');
      const ip = cleaned.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:3000`;
      }
    }
  } catch (e) {}

  // 2. Try SourceCode scriptURL
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return `http://${match[1]}:3000`;
      }
    }
  } catch (e) {}

  // 3. Fallback for physical device on LAN
  if (Platform.OS === 'android') {
    return 'http://192.168.1.6:3000';
  }
  return 'http://localhost:3000';
}

/**
 * Fetch all deliveries from the sync server
 */
export async function fetchServerDeliveries(): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const url = `${getSyncServerUrl()}/api/deliveries`;
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Server unreachable or offline — silently fallback to local database
    if (__DEV__) {
      console.log('[RealtimeSync] Sync server offline or unreachable (using local storage)');
    }
  }
  return [];
}

/**
 * Post a new delivery or update to the sync server
 */
export async function postServerDelivery(delivery: any): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const url = `${getSyncServerUrl()}/api/deliveries`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(delivery),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Update an existing delivery on the sync server
 */
export async function updateServerDelivery(id: string, updates: any): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const url = `${getSyncServerUrl()}/api/deliveries/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Broadcast an event to all listening apps (Driver App & Admin Portal)
 */
export function broadcastRealtimeEvent(event: RealtimeSyncEvent): void {
  try {
    // 1. Notify local in-memory listeners
    inMemoryListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.warn('[RealtimeSync] in-memory listener error:', err);
      }
    });

    // 2. Web BroadcastChannel & localStorage sync
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

    // 3. Post to HTTP Sync Server
    const serverUrl = `${getSyncServerUrl()}/api/events`;
    fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {});
  } catch (err) {
    console.warn('[RealtimeSync] Broadcast failed:', err);
  }
}

/**
 * Subscribe to real-time events across native hooks, HTTP server SSE, and web windows
 */
export function subscribeToRealtimeEvents(
  listener: (event: RealtimeSyncEvent) => void
): () => void {
  // Always register for in-memory events
  inMemoryListeners.add(listener);

  let handleBroadcastMessage: any = null;
  let handleStorageEvent: any = null;
  let sseSource: any = null;
  let pollTimer: any = null;
  let lastPolledTimestamp = Date.now() - 10000;

  // 1. Setup DOM listeners on Web
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

  // 2. Setup Server-Sent Events (SSE) if available
  if (typeof window !== 'undefined' && 'EventSource' in window) {
    try {
      const sseUrl = `${getSyncServerUrl()}/api/events`;
      sseSource = new (window as any).EventSource(sseUrl);
      sseSource.onmessage = (msg: any) => {
        try {
          const data = JSON.parse(msg.data);
          if (data && data.type) {
            listener(data);
          }
        } catch (e) {}
      };
      sseSource.onerror = () => {
        // EventSource will auto-reconnect
      };
    } catch (err) {
      console.warn('[RealtimeSync] SSE connection error:', err);
    }
  }

  // 3. Setup lightweight background polling (1.5s interval)
  // Ensures physical mobile phones on LAN and background tabs receive events reliably
  const doPoll = async () => {
    try {
      const pollUrl = `${getSyncServerUrl()}/api/events/poll?since=${lastPolledTimestamp}`;
      const res = await fetch(pollUrl);
      if (res.ok) {
        const body = await res.json();
        if (body && Array.isArray(body.events)) {
          body.events.forEach((evt: RealtimeSyncEvent) => {
            listener(evt);
          });
        }
        if (body && body.now) {
          lastPolledTimestamp = body.now;
        }
      }
    } catch (e) {
      // Server may be offline or starting, silently retry next interval
    }
  };

  pollTimer = setInterval(doPoll, 1500);

  return () => {
    inMemoryListeners.delete(listener);

    if (pollTimer) {
      clearInterval(pollTimer);
    }

    if (sseSource && typeof sseSource.close === 'function') {
      sseSource.close();
    }

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

/**
 * Upload raw authentic video proof file to the server for persistent backend storage without watermarks
 */
export async function uploadVideoProofFile(
  fileUri: string,
  preferredFileName?: string
): Promise<string | null> {
  try {
    const serverUrl = `${getSyncServerUrl()}/api/upload`;
    const fileName = preferredFileName || fileUri.split('/').pop()?.split('?')[0] || `proof_${Date.now()}.mp4`;

    // 1. On native mobile (iOS/Android), use FileSystem.uploadAsync for streaming local file:// URIs
    if (Platform.OS !== 'web' && typeof FileSystem.uploadAsync === 'function') {
      const response = await FileSystem.uploadAsync(serverUrl, fileUri, {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        parameters: { filename: fileName },
      });
      if (response.status >= 200 && response.status < 300) {
        try {
          const data = JSON.parse(response.body);
          if (data && data.url) {
            return data.url;
          }
        } catch (e) {}
        return `/api/uploads/${fileName}`;
      }
    }

    // 2. Web or fallback: standard fetch with FormData
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: 'video/mp4',
    } as any);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(serverUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    if (__DEV__) {
      console.log('[RealtimeSync] Video proof stored locally (server upload deferred):', err);
    }
  }
  return null;
}

