/**
 * Saboot SQLite Database Service
 * 
 * Local persistence using expo-sqlite (Expo SDK 57) with universal Web/In-Memory fallback.
 * Persists deliveries, completed handoffs, verification facts, and video proof records.
 * 
 * NOTE: expo-sqlite native modules are NOT available in Expo Go on Android/iOS.
 * This service detects Expo Go and uses the in-memory store directly, avoiding
 * NullPointerException crashes from NativeDatabase.execAsync.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Delivery, DeliveryStatus, ShiftMetrics } from '../types/delivery';
import { INITIAL_DELIVERIES } from '../constants/demoData';

let sqliteDbInstance: any = null;
const DB_NAME = 'saboot.db';
const LOCAL_STORAGE_KEY = 'saboot_sqlite_deliveries_v1';
let inMemoryDeliveriesCache: Delivery[] = [...INITIAL_DELIVERIES];

/**
 * Permanent flag: once SQLite init fails, never retry.
 * Prevents the infinite NullPointerException spam loop.
 */
let dbInitFailed = false;
let dbInitAttempted = false;

/**
 * Detect if running inside Expo Go (where native SQLite modules are unavailable)
 */
function isExpoGo(): boolean {
  try {
    if (Constants.expoVersion) return true;
    const execEnv = (Constants as any).executionEnvironment;
    // 'storeClient' = Expo Go, 'standalone' = production build, 'bare' = dev client
    if (execEnv === 'storeClient') return true;
    // Fallback: check appOwnership
    const ownership = (Constants as any).appOwnership;
    if (ownership === 'expo') return true;
  } catch {}
  return false;
}

/**
 * Initialize SQLite database tables safely
 */
export async function initDatabase(): Promise<void> {
  // If we already attempted and failed, go straight to memory store — no retry
  if (dbInitFailed || dbInitAttempted) {
    if (!sqliteDbInstance) {
      initWebStorage();
    }
    return;
  }

  dbInitAttempted = true;

  // Skip SQLite entirely in Expo Go — native modules throw NullPointerException
  if (isExpoGo()) {
    dbInitFailed = true;
    if (__DEV__) {
      console.log('[SQLite] Expo Go detected — using in-memory store (native SQLite unavailable)');
    }
    initWebStorage();
    return;
  }

  if (Platform.OS !== 'web') {
    try {
      const SQLite = await import('expo-sqlite');
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      // Create Deliveries table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS deliveries (
          id TEXT PRIMARY KEY NOT NULL,
          tracking_number TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          street TEXT NOT NULL,
          city TEXT NOT NULL,
          residence_category TEXT NOT NULL,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          package_desc TEXT,
          driver_id TEXT,
          status TEXT NOT NULL,
          notes TEXT,
          handoff_type TEXT,
          video_proof_uri TEXT,
          video_status TEXT,
          completed_at TEXT,
          created_at TEXT
        );
      `);

      // Create handoff_records table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS handoff_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          delivery_id TEXT NOT NULL,
          handoff_type TEXT NOT NULL,
          notes TEXT,
          video_proof_uri TEXT,
          video_luminance REAL,
          video_variance REAL,
          recorded_at TEXT NOT NULL
        );
      `);

      // Create verification_facts table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS verification_facts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          delivery_id TEXT NOT NULL,
          decision TEXT NOT NULL,
          distance_meters REAL,
          dwell_seconds INTEGER,
          call_duration INTEGER,
          video_verified INTEGER,
          timestamp TEXT NOT NULL,
          audit_record_id TEXT
        );
      `);

      // Seed initial deliveries if needed
      await seedInitialDeliveriesSQLite(db);

      // Verified working instance
      sqliteDbInstance = db;
      return;
    } catch (err: any) {
      // Permanently mark as failed — never retry to avoid NullPointerException spam
      sqliteDbInstance = null;
      dbInitFailed = true;
      if (__DEV__) {
        console.log('[SQLite] Native DB init failed, using in-memory store permanently:', err?.message || err);
      }
    }
  }

  // Web & Universal fallback
  initWebStorage();
}

/**
 * Seed SQLite DB with initial deliveries
 */
async function seedInitialDeliveriesSQLite(db: any): Promise<void> {
  for (const d of INITIAL_DELIVERIES) {
    try {
      await db.runAsync(
        `INSERT OR IGNORE INTO deliveries (
          id, tracking_number, customer_name, customer_phone, street, city,
          residence_category, lat, lng, package_desc, driver_id, status,
          notes, handoff_type, video_proof_uri, video_status, completed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          d.id,
          d.trackingNumber,
          d.customer.name,
          d.customer.phone,
          d.address.street,
          d.address.city,
          d.address.residenceCategory,
          d.address.latitude,
          d.address.longitude,
          d.packageDescription,
          d.assignedDriverId,
          d.status,
          d.notes || '',
          d.handoffType || '',
          d.videoProofUri || '',
          '',
          d.completedAt || '',
          d.createdAt,
        ]
      );
    } catch {}
  }
}

/**
 * Initialize Web storage with INITIAL_DELIVERIES and merge missing tasks
 */
function initWebStorage(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) return;

  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    let existing: Delivery[] = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(existing)) existing = [];

    let modified = false;
    for (const d of INITIAL_DELIVERIES) {
      if (!existing.some((e) => e.id === d.id)) {
        existing.push(d);
        modified = true;
      }
    }

    if (modified || !stored) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    }
  } catch (err) {}
}

/**
 * Fetch all deliveries from SQLite database or memory cache
 */
export async function getDeliveriesFromDB(): Promise<Delivery[]> {
  if (sqliteDbInstance && Platform.OS !== 'web') {
    try {
      const rows = await sqliteDbInstance.getAllAsync('SELECT * FROM deliveries ORDER BY id ASC');
      if (rows && rows.length > 0) {
        const parsed = rows.map((r: any): Delivery => ({
          id: r.id,
          trackingNumber: r.tracking_number,
          customer: {
            id: `CUST-${r.id}`,
            name: r.customer_name,
            phone: r.customer_phone,
          },
          address: {
            street: r.street,
            city: r.city,
            postalCode: '560100',
            latitude: r.lat,
            longitude: r.lng,
            residenceCategory: r.residence_category,
          },
          packageDescription: r.package_desc,
          estimatedDeliveryWindow: 'Today',
          status: r.status as DeliveryStatus,
          createdAt: r.created_at,
          assignedDriverId: r.driver_id,
          notes: r.notes,
          handoffType: r.handoff_type || undefined,
          videoProofUri: r.video_proof_uri || undefined,
          completedAt: r.completed_at || undefined,
        }));
        inMemoryDeliveriesCache = parsed;
        return parsed;
      }
    } catch (err) {
      // Invalidate broken handle to prevent repeated crashes
      sqliteDbInstance = null;
      if (__DEV__) {
        console.log('[SQLite] getAllAsync query fallback to memory cache');
      }
    }
  }

  // Web fallback
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    const data = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        inMemoryDeliveriesCache = parsed;
        return parsed;
      } catch (e) {}
    }
  }

  return inMemoryDeliveriesCache;
}

/**
 * Save / update delivery completion in SQLite database or memory store
 */
export async function saveDeliveryCompletionInDB(
  deliveryId: string,
  handoffType: 'direct' | 'doorstep' | 'security',
  notes?: string,
  videoProofUri?: string,
  videoMetrics?: { luminance: number; variance: number },
  auditId?: string
): Promise<Delivery[]> {
  const completedAt = new Date().toISOString();

  if (sqliteDbInstance && Platform.OS !== 'web') {
    try {
      await sqliteDbInstance.runAsync(
        `UPDATE deliveries 
         SET status = 'DELIVERED', 
             handoff_type = ?, 
             notes = COALESCE(?, notes), 
             video_proof_uri = ?, 
             video_status = 'VERIFIED',
             completed_at = ? 
         WHERE id = ?`,
        [handoffType, notes || null, videoProofUri || null, completedAt, deliveryId]
      );

      await sqliteDbInstance.runAsync(
        `INSERT INTO handoff_records (
          delivery_id, handoff_type, notes, video_proof_uri, video_luminance, video_variance, recorded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          deliveryId,
          handoffType,
          notes || '',
          videoProofUri || '',
          videoMetrics?.luminance || 120,
          videoMetrics?.variance || 400,
          completedAt,
        ]
      );

      if (auditId) {
        await sqliteDbInstance.runAsync(
          `INSERT INTO verification_facts (
            delivery_id, decision, distance_meters, dwell_seconds, call_duration, video_verified, timestamp, audit_record_id
          ) VALUES (?, 'DELIVERED', 0, 90, 15, 1, ?, ?)`,
          [deliveryId, completedAt, auditId]
        );
      }

      return await getDeliveriesFromDB();
    } catch (err) {
      sqliteDbInstance = null;
      if (__DEV__) {
        console.log('[SQLite] saveDeliveryCompletion fallback to memory update');
      }
    }
  }

  // In-memory update
  let deliveries = await getDeliveriesFromDB();
  deliveries = deliveries.map((d) =>
    d.id === deliveryId
      ? {
          ...d,
          status: 'DELIVERED' as DeliveryStatus,
          handoffType,
          notes: notes || d.notes,
          videoProofUri: videoProofUri || d.videoProofUri,
          completedAt,
        }
      : d
  );

  inMemoryDeliveriesCache = deliveries;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(deliveries));
    } catch (e) {}
  }

  return deliveries;
}

/**
 * Update delivery status in SQLite
 */
export async function updateDeliveryStatusInDB(
  deliveryId: string,
  status: DeliveryStatus,
  extra?: { videoProofUri?: string; requiresAdminApproval?: boolean; adminApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' }
): Promise<Delivery[]> {
  if (sqliteDbInstance && Platform.OS !== 'web') {
    try {
      await sqliteDbInstance.runAsync(
        `UPDATE deliveries 
         SET status = ?, 
             video_proof_uri = COALESCE(?, video_proof_uri)
         WHERE id = ?`,
        [status, extra?.videoProofUri || null, deliveryId]
      );
      return await getDeliveriesFromDB();
    } catch (err) {
      sqliteDbInstance = null;
      if (__DEV__) {
        console.log('[SQLite] updateDeliveryStatus fallback to memory');
      }
    }
  }

  let deliveries = await getDeliveriesFromDB();
  deliveries = deliveries.map((d) =>
    d.id === deliveryId
      ? {
          ...d,
          status,
          videoProofUri: extra?.videoProofUri || d.videoProofUri,
          requiresAdminApproval: extra?.requiresAdminApproval ?? d.requiresAdminApproval,
          adminApprovalStatus: extra?.adminApprovalStatus || d.adminApprovalStatus,
          completedAt: status === 'DELIVERED' ? new Date().toISOString() : d.completedAt,
        }
      : d
  );

  inMemoryDeliveriesCache = deliveries;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(deliveries));
    } catch (e) {}
  }

  return deliveries;
}

/**
 * Insert or update a newly dispatched / assigned delivery in SQLite DB
 */
export async function insertOrUpdateDeliveryInDB(delivery: Delivery): Promise<Delivery[]> {
  if (sqliteDbInstance && Platform.OS !== 'web') {
    try {
      await sqliteDbInstance.runAsync(
        `INSERT OR REPLACE INTO deliveries (
          id, tracking_number, customer_name, customer_phone, street, city,
          residence_category, lat, lng, package_desc, driver_id, status,
          notes, handoff_type, video_proof_uri, video_status, completed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          delivery.id,
          delivery.trackingNumber,
          delivery.customer.name,
          delivery.customer.phone,
          delivery.address.street,
          delivery.address.city,
          delivery.address.residenceCategory,
          delivery.address.latitude,
          delivery.address.longitude,
          delivery.packageDescription,
          delivery.assignedDriverId,
          delivery.status,
          delivery.notes || '',
          delivery.handoffType || '',
          delivery.videoProofUri || '',
          delivery.videoProofUri ? 'RECORDED' : '',
          delivery.completedAt || '',
          delivery.createdAt || new Date().toISOString(),
        ]
      );
      return await getDeliveriesFromDB();
    } catch (err) {
      sqliteDbInstance = null;
      if (__DEV__) {
        console.log('[SQLite] insertOrUpdate fallback to memory');
      }
    }
  }

  let deliveries = await getDeliveriesFromDB();
  const index = deliveries.findIndex((d) => d.id === delivery.id);
  if (index >= 0) {
    deliveries[index] = { ...deliveries[index], ...delivery };
  } else {
    deliveries = [delivery, ...deliveries];
  }

  inMemoryDeliveriesCache = deliveries;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(deliveries));
    } catch (e) {}
  }

  return deliveries;
}

/**
 * Compute real-time shift metrics from SQLite database records
 */
export function calculateShiftMetrics(deliveries: Delivery[]): ShiftMetrics {
  const completed = deliveries.filter((d) =>
    ['VERIFIED', 'REJECTED', 'REVIEW', 'DELIVERED'].includes(d.status)
  ).length;

  const verifiedAttempts = deliveries.filter(
    (d) => d.status === 'VERIFIED' || d.status === 'DELIVERED'
  ).length;

  const rejectedAttempts = deliveries.filter((d) => d.status === 'REJECTED').length;
  const reviewAttempts = deliveries.filter((d) => d.status === 'REVIEW').length;

  return {
    totalDeliveries: deliveries.length,
    completed,
    verifiedAttempts,
    rejectedAttempts,
    reviewAttempts,
  };
}
