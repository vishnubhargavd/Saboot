/**
 * Saboot Authoritative SQLite Database Service
 * 
 * Production ACID persistent storage for deliveries, attempts,
 * customer verification sessions, and authoritative audit events.
 * Uses Node.js built-in `node:sqlite` (DatabaseSync) with WAL mode.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'saboot.db');
let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    // Performance and concurrency settings
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
    dbInstance.exec('PRAGMA busy_timeout = 5000;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db) {
  // 1. Deliveries table
  db.exec(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      tracking_number TEXT NOT NULL,
      current_attempt_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      customer_json TEXT,
      address_json TEXT,
      package_description TEXT,
      estimated_delivery_window TEXT,
      status TEXT NOT NULL,
      decision TEXT NOT NULL,
      decision_reason TEXT,
      driver TEXT,
      assigned_driver_id TEXT,
      distance_meters REAL,
      dwell_seconds INTEGER DEFAULT 0,
      required_dwell_seconds INTEGER DEFAULT 90,
      call_attempted INTEGER DEFAULT 0,
      call_duration INTEGER DEFAULT 0,
      gps_accuracy REAL DEFAULT 5,
      audit_id TEXT,
      video_proof_uri TEXT,
      handoff_type TEXT,
      requires_admin_approval INTEGER DEFAULT 0,
      admin_approval_status TEXT,
      requires_customer_confirmation INTEGER DEFAULT 0,
      customer_response TEXT,
      customer_response_at TEXT,
      customer_response_source TEXT,
      retry_required INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      extra_json TEXT
    );
  `);

  // 2. Delivery Attempts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_attempts (
      attempt_id TEXT PRIMARY KEY,
      delivery_id TEXT NOT NULL,
      attempt_number INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL,
      decision TEXT NOT NULL,
      decision_reason TEXT,
      facts_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
    );
  `);

  // 3. Customer Verification Sessions (QR Sessions) table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_verification_sessions (
      id TEXT PRIMARY KEY,
      delivery_id TEXT NOT NULL,
      attempt_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- CREATED, ACTIVE, OPENED, CONSUMED, EXPIRED, REVOKED
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      opened_at TEXT,
      consumed_at TEXT,
      response TEXT,
      response_at TEXT,
      client_ip TEXT,
      user_agent TEXT,
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON customer_verification_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_delivery_attempt ON customer_verification_sessions(delivery_id, attempt_id);
  `);

  // 4. Authoritative Audit Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_id TEXT NOT NULL,
      attempt_id TEXT,
      event TEXT NOT NULL,
      description TEXT,
      metadata_json TEXT,
      timestamp TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_delivery ON audit_events(delivery_id);
  `);
}

// Format SQLite row into clean Delivery JS object
function rowToDelivery(row, db) {
  if (!row) return null;
  const customer = row.customer_json ? JSON.parse(row.customer_json) : {
    name: row.customer_name || 'Customer',
    phone: row.customer_phone || '',
    email: row.customer_email || ''
  };
  const parsedAddress = row.address_json ? JSON.parse(row.address_json) : {};
  const address = {
    street: parsedAddress.street || 'Delivery Address',
    city: parsedAddress.city || 'Bengaluru',
    postalCode: parsedAddress.postalCode || '560102',
    latitude: parsedAddress.latitude || 12.9719,
    longitude: parsedAddress.longitude || 77.6412,
    ...parsedAddress,
    residenceCategory: parsedAddress.residenceCategory || 'apartment'
  };
  const extra = row.extra_json ? JSON.parse(row.extra_json) : {};

  // Retrieve authoritative audit timeline
  const auditRows = db.prepare(
    'SELECT event, description, timestamp, metadata_json FROM audit_events WHERE delivery_id = ? ORDER BY id ASC'
  ).all(row.id);

  const auditTimeline = auditRows.map(a => ({
    event: a.event,
    description: a.description,
    timestamp: a.timestamp,
    metadata: a.metadata_json ? JSON.parse(a.metadata_json) : undefined
  }));

  // Retrieve current active session if any
  const activeSession = db.prepare(`
    SELECT status, expires_at, opened_at, consumed_at, response, response_at
    FROM customer_verification_sessions
    WHERE delivery_id = ? AND status IN ('ACTIVE', 'OPENED')
    ORDER BY created_at DESC LIMIT 1
  `).get(row.id);

  return {
    id: row.id,
    trackingNumber: row.tracking_number,
    attemptId: row.current_attempt_id,
    currentAttemptId: row.current_attempt_id,
    customer,
    address,
    packageDescription: row.package_description,
    estimatedDeliveryWindow: row.estimated_delivery_window || '10:00 AM - 12:00 PM',
    status: row.status,
    decision: row.decision,
    decisionReason: row.decision_reason,
    driver: row.driver,
    assignedDriverId: row.assigned_driver_id,
    distanceMeters: row.distance_meters,
    dwellSeconds: row.dwell_seconds,
    requiredDwellSeconds: row.required_dwell_seconds,
    callAttempted: Boolean(row.call_attempted),
    callDuration: row.call_duration,
    gpsAccuracy: row.gps_accuracy,
    auditId: row.audit_id,
    videoProofUri: row.video_proof_uri,
    handoffType: row.handoff_type,
    requiresAdminApproval: Boolean(row.requires_admin_approval),
    adminApprovalStatus: row.admin_approval_status,
    requiresCustomerConfirmation: Boolean(row.requires_customer_confirmation),
    customerResponse: row.customer_response,
    customerResponseAt: row.customer_response_at,
    customerResponseSource: row.customer_response_source,
    retryRequired: Boolean(row.retry_required),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    qrStatus: activeSession ? activeSession.status : (row.customer_response ? 'CONSUMED' : null),
    qrExpiresAt: activeSession ? activeSession.expires_at : null,
    auditTimeline,
    ...extra
  };
}

// Delivery CRUD
function getDelivery(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id);
  return rowToDelivery(row, db);
}

function getAllDeliveries() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM deliveries ORDER BY created_at DESC').all();
  return rows.map(r => rowToDelivery(r, db));
}

function upsertDelivery(delivery) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = delivery.id;
  const trackingNumber = delivery.trackingNumber || `SBT-BLR-${Math.floor(100000 + Math.random() * 900000)}`;
  const currentAttemptId = delivery.attemptId || delivery.currentAttemptId || delivery.auditId || `ATT-${id}-${Date.now().toString(36)}`;
  const customerName = delivery.customer?.name || 'Customer';
  const customerPhone = delivery.customer?.phone || '';
  const customerEmail = delivery.customer?.email || '';
  const customerJson = JSON.stringify(delivery.customer || {});
  const addressJson = JSON.stringify(delivery.address || {});
  const packageDesc = delivery.packageDescription || 'Delivery Package';
  const windowStr = delivery.estimatedDeliveryWindow || '10:00 AM - 12:00 PM';
  const status = delivery.status || 'IN_TRANSIT';
  const decision = delivery.decision || status;
  const decisionReason = delivery.decisionReason || delivery.notes || '';
  const driver = delivery.driver || 'Ramesh Kumar (Unit 24 - DRV-BLR-09)';
  const assignedDriverId = delivery.assignedDriverId || 'DRV-BLR-09';
  const distanceMeters = delivery.distanceMeters ?? 25;
  const dwellSeconds = delivery.dwellSeconds ?? 0;
  const requiredDwellSeconds = delivery.requiredDwellSeconds ?? 90;
  const callAttempted = delivery.callAttempted ? 1 : 0;
  const callDuration = delivery.callDuration ?? 0;
  const gpsAccuracy = delivery.gpsAccuracy ?? 5;
  const auditId = delivery.auditId || currentAttemptId;
  const videoProofUri = delivery.videoProofUri || null;
  const handoffType = delivery.handoffType || null;
  const requiresAdminApproval = delivery.requiresAdminApproval ? 1 : 0;
  const adminApprovalStatus = delivery.adminApprovalStatus || null;
  const requiresCustConfirm = (delivery.requiresCustomerConfirmation || status === 'REVIEW') ? 1 : 0;
  const customerResponse = delivery.customerResponse || null;
  const customerResponseAt = delivery.customerResponseAt || null;
  const customerResponseSource = delivery.customerResponseSource || null;
  const retryRequired = delivery.retryRequired ? 1 : 0;
  const createdAt = delivery.createdAt || now;

  const stmt = db.prepare(`
    INSERT INTO deliveries (
      id, tracking_number, current_attempt_id, customer_name, customer_phone, customer_email,
      customer_json, address_json, package_description, estimated_delivery_window,
      status, decision, decision_reason, driver, assigned_driver_id, distance_meters,
      dwell_seconds, required_dwell_seconds, call_attempted, call_duration, gps_accuracy,
      audit_id, video_proof_uri, handoff_type, requires_admin_approval, admin_approval_status,
      requires_customer_confirmation, customer_response, customer_response_at, customer_response_source,
      retry_required, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      tracking_number = excluded.tracking_number,
      current_attempt_id = COALESCE(excluded.current_attempt_id, deliveries.current_attempt_id),
      customer_name = excluded.customer_name,
      customer_phone = excluded.customer_phone,
      customer_email = excluded.customer_email,
      customer_json = excluded.customer_json,
      address_json = excluded.address_json,
      package_description = excluded.package_description,
      estimated_delivery_window = excluded.estimated_delivery_window,
      status = excluded.status,
      decision = excluded.decision,
      decision_reason = excluded.decision_reason,
      driver = excluded.driver,
      assigned_driver_id = excluded.assigned_driver_id,
      distance_meters = excluded.distance_meters,
      dwell_seconds = excluded.dwell_seconds,
      required_dwell_seconds = excluded.required_dwell_seconds,
      call_attempted = excluded.call_attempted,
      call_duration = excluded.call_duration,
      gps_accuracy = excluded.gps_accuracy,
      audit_id = excluded.audit_id,
      video_proof_uri = COALESCE(excluded.video_proof_uri, deliveries.video_proof_uri),
      handoff_type = COALESCE(excluded.handoff_type, deliveries.handoff_type),
      requires_admin_approval = excluded.requires_admin_approval,
      admin_approval_status = COALESCE(excluded.admin_approval_status, deliveries.admin_approval_status),
      requires_customer_confirmation = excluded.requires_customer_confirmation,
      customer_response = COALESCE(excluded.customer_response, deliveries.customer_response),
      customer_response_at = COALESCE(excluded.customer_response_at, deliveries.customer_response_at),
      customer_response_source = COALESCE(excluded.customer_response_source, deliveries.customer_response_source),
      retry_required = excluded.retry_required,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    id, trackingNumber, currentAttemptId, customerName, customerPhone, customerEmail,
    customerJson, addressJson, packageDesc, windowStr,
    status, decision, decisionReason, driver, assignedDriverId, distanceMeters,
    dwellSeconds, requiredDwellSeconds, callAttempted, callDuration, gpsAccuracy,
    auditId, videoProofUri, handoffType, requiresAdminApproval, adminApprovalStatus,
    requiresCustConfirm, customerResponse, customerResponseAt, customerResponseSource,
    retryRequired, createdAt, now
  );

  return getDelivery(id);
}

function deleteDelivery(id) {
  const db = getDb();
  db.prepare('DELETE FROM audit_events WHERE delivery_id = ?').run(id);
  db.prepare('DELETE FROM customer_verification_sessions WHERE delivery_id = ?').run(id);
  db.prepare('DELETE FROM delivery_attempts WHERE delivery_id = ?').run(id);
  db.prepare('DELETE FROM deliveries WHERE id = ?').run(id);
}

// Audit Events
function addAuditEvent(deliveryId, attemptId, event, description, metadata = null) {
  const db = getDb();
  const timestamp = new Date().toISOString();
  const metadataJson = metadata ? JSON.stringify(metadata) : null;
  db.prepare(`
    INSERT INTO audit_events (delivery_id, attempt_id, event, description, metadata_json, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(deliveryId, attemptId || null, event, description, metadataJson, timestamp);

  return { event, description, timestamp, metadata };
}

function getAuditEvents(deliveryId) {
  const db = getDb();
  return db.prepare('SELECT event, description, timestamp, metadata_json FROM audit_events WHERE delivery_id = ? ORDER BY id ASC').all(deliveryId);
}

// Customer Verification Sessions (QR Sessions)
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Creates a new active QR session.
 * Automatically revokes any prior active sessions for this attempt.
 * Stores ONLY the SHA-256 hash in the database, never the raw token.
 */
function createVerificationSession({ deliveryId, attemptId, rawToken, tokenHash, ttlSeconds = 300, ip = null, userAgent = null }) {
  const db = getDb();
  const sessionId = `QRS-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const finalHash = tokenHash || (rawToken ? hashToken(rawToken) : null);
  if (!finalHash) {
    throw new Error('rawToken or tokenHash must be provided to createVerificationSession');
  }
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

  // Atomically revoke prior active sessions for this attempt
  db.prepare(`
    UPDATE customer_verification_sessions
    SET status = 'REVOKED'
    WHERE delivery_id = ? AND attempt_id = ? AND status IN ('CREATED', 'ACTIVE', 'OPENED')
  `).run(deliveryId, attemptId);

  // Insert new active session
  db.prepare(`
    INSERT INTO customer_verification_sessions (
      id, delivery_id, attempt_id, token_hash, status, created_at, expires_at, client_ip, user_agent
    ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)
  `).run(sessionId, deliveryId, attemptId, finalHash, now.toISOString(), expiresAt, ip, userAgent);

  // Update delivery
  db.prepare(`
    UPDATE deliveries
    SET current_attempt_id = ?, requires_customer_confirmation = 1, updated_at = ?
    WHERE id = ?
  `).run(attemptId, now.toISOString(), deliveryId);

  // Authoritative server audit event
  addAuditEvent(
    deliveryId,
    attemptId,
    'CUSTOMER_QR_GENERATED',
    `Customer verification QR generated (expires in ${Math.round(ttlSeconds / 60)}m)`
  );

  return {
    sessionId,
    deliveryId,
    attemptId,
    tokenHash,
    status: 'ACTIVE',
    createdAt: now.toISOString(),
    expiresAt,
    expiresInSeconds: ttlSeconds
  };
}

function getVerificationSessionByHash(tokenHash) {
  const db = getDb();
  const session = db.prepare('SELECT * FROM customer_verification_sessions WHERE token_hash = ?').get(tokenHash);
  if (!session) return null;

  // Check if expired
  if (session.status !== 'CONSUMED' && session.status !== 'REVOKED') {
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      db.prepare("UPDATE customer_verification_sessions SET status = 'EXPIRED' WHERE id = ?").run(session.id);
      session.status = 'EXPIRED';
    }
  }

  return session;
}

function getActiveVerificationSessionForAttempt(deliveryId, attemptId) {
  const db = getDb();
  const session = db.prepare(`
    SELECT * FROM customer_verification_sessions
    WHERE delivery_id = ? AND attempt_id = ? AND status IN ('ACTIVE', 'OPENED')
    ORDER BY created_at DESC LIMIT 1
  `).get(deliveryId, attemptId);

  if (!session) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    db.prepare("UPDATE customer_verification_sessions SET status = 'EXPIRED' WHERE id = ?").run(session.id);
    return null;
  }
  return session;
}

/**
 * Marks customer verification session as opened (first time customer accesses webpage).
 */
function markVerificationSessionOpened(sessionOrTokenHash, ip = null, userAgent = null) {
  const db = getDb();
  let session = typeof sessionOrTokenHash === 'string'
    ? db.prepare('SELECT * FROM customer_verification_sessions WHERE token_hash = ?').get(sessionOrTokenHash)
    : sessionOrTokenHash;

  if (session && session.status === 'ACTIVE') {
    const now = new Date().toISOString();
    db.prepare("UPDATE customer_verification_sessions SET status = 'OPENED', opened_at = ?, client_ip = COALESCE(?, client_ip), user_agent = COALESCE(?, user_agent) WHERE id = ?").run(now, ip, userAgent, session.id);
    addAuditEvent(session.delivery_id, session.attempt_id, 'CUSTOMER_VERIFICATION_OPENED', 'Customer opened verification portal');
    session.status = 'OPENED';
    session.opened_at = now;
  }
  return session;
}

/**
 * Consumes the token atomically with ACID replay protection.
 * First valid customer submission wins.
 */
function consumeVerificationSessionAtomic({ tokenHash, response, ip = null, userAgent = null }) {
  const db = getDb();
  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE;');
  try {
    const session = db.prepare('SELECT * FROM customer_verification_sessions WHERE token_hash = ?').get(tokenHash);
    if (!session) {
      db.exec('ROLLBACK;');
      return { success: false, error: 'INVALID_TOKEN', code: 404, message: 'Invalid verification token' };
    }

    if (session.status === 'CONSUMED') {
      db.exec('ROLLBACK;');
      return {
        success: false,
        error: 'ALREADY_CONSUMED',
        code: 409,
        message: 'This verification request was already completed. Responses cannot be modified.'
      };
    }

    if (session.status === 'REVOKED') {
      db.exec('ROLLBACK;');
      return { success: false, error: 'TOKEN_REVOKED', code: 410, message: 'This verification session was revoked.' };
    }

    if (new Date(session.expires_at).getTime() <= Date.now() || session.status === 'EXPIRED') {
      db.prepare("UPDATE customer_verification_sessions SET status = 'EXPIRED' WHERE id = ?").run(session.id);
      db.exec('COMMIT;');
      return { success: false, error: 'TOKEN_EXPIRED', code: 410, message: 'Verification QR expired. Please ask driver for a new QR.' };
    }

    if (session.status !== 'ACTIVE' && session.status !== 'OPENED') {
      db.exec('ROLLBACK;');
      return { success: false, error: 'INVALID_SESSION_STATE', code: 400, message: `Session is ${session.status}` };
    }

    // Validate allowed customer response values
    if (response !== 'PACKAGE_RECEIVED' && response !== 'PACKAGE_NOT_RECEIVED') {
      db.exec('ROLLBACK;');
      return { success: false, error: 'INVALID_RESPONSE_VALUE', code: 400, message: 'Invalid response choice' };
    }

    // 1. Consume session
    db.prepare(`
      UPDATE customer_verification_sessions
      SET status = 'CONSUMED', consumed_at = ?, response = ?, response_at = ?, client_ip = ?, user_agent = ?
      WHERE id = ?
    `).run(now, response, now, ip, userAgent, session.id);

    // 2. Fetch authoritative delivery
    const deliveryRow = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(session.delivery_id);
    if (!deliveryRow) {
      db.exec('ROLLBACK;');
      return { success: false, error: 'DELIVERY_NOT_FOUND', code: 404, message: 'Delivery not found' };
    }

    // Prevent mutating finalized delivery
    if (deliveryRow.status === 'DELIVERED') {
      db.exec('ROLLBACK;');
      return { success: false, error: 'DELIVERY_ALREADY_FINALIZED', code: 409, message: 'Delivery already delivered and finalized' };
    }

    const currentDecision = deliveryRow.decision || deliveryRow.status;
    let newStatus = deliveryRow.status;
    let newDecision = currentDecision;
    let newReason = deliveryRow.decision_reason;
    let retryRequired = deliveryRow.retry_required;

    const isPackageReceived = response === 'PACKAGE_RECEIVED';

    // Saboot Decision Rules
    if (currentDecision === 'REVIEW') {
      if (isPackageReceived) {
        // CASE 1: REVIEW + PACKAGE_RECEIVED -> VERIFIED (No admin approval required)
        newStatus = 'VERIFIED';
        newDecision = 'VERIFIED';
        newReason = 'Customer confirmed package receipt. Multi-modal attestation completed.';
        retryRequired = 0;
      } else {
        // CASE 2: REVIEW + PACKAGE_NOT_RECEIVED -> CUSTOMER_CONFIRMED_FAILURE & RETRY_REQUIRED
        newStatus = 'RETRY_REQUIRED';
        newDecision = 'CUSTOMER_CONFIRMED_FAILURE';
        newReason = 'Customer reported package was not received. Dispatch re-attempt required.';
        retryRequired = 1;
      }
    } else if (currentDecision === 'REJECTED') {
      // ZERO-TRUST RULE: Hard physical rejection cannot be overridden by customer claim
      newStatus = 'REJECTED';
      newDecision = 'REJECTED';
      newReason = deliveryRow.decision_reason; // Preserved
    }

    // Update delivery record
    db.prepare(`
      UPDATE deliveries
      SET status = ?, decision = ?, decision_reason = ?, customer_response = ?,
          customer_response_at = ?, customer_response_source = 'qr_portal',
          retry_required = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, newDecision, newReason, response, now, retryRequired, now, session.delivery_id);

    // Audit logs
    addAuditEvent(
      session.delivery_id,
      session.attempt_id,
      isPackageReceived ? 'CUSTOMER_CONFIRMED_RECEIVED' : 'CUSTOMER_CONFIRMED_NOT_RECEIVED',
      `Customer confirmed: ${isPackageReceived ? 'PACKAGE RECEIVED' : 'PACKAGE NOT RECEIVED'}`
    );

    if (currentDecision === 'REVIEW') {
      if (isPackageReceived) {
        addAuditEvent(session.delivery_id, session.attempt_id, 'VERIFIED', 'Attempt verified via customer QR confirmation');
      } else {
        addAuditEvent(session.delivery_id, session.attempt_id, 'CUSTOMER_CONFIRMED_FAILURE', 'Customer reported failure to receive');
        addAuditEvent(session.delivery_id, session.attempt_id, 'RETRY_REQUIRED', 'Delivery marked for supervisor re-dispatch / retry');
      }
    } else if (currentDecision === 'REJECTED') {
      addAuditEvent(
        session.delivery_id,
        session.attempt_id,
        'ZERO_TRUST_POLICY_ENFORCED',
        'Zero-Trust Rule: Hard physical evidence rejection remains authoritative over customer claim'
      );
    }

    db.exec('COMMIT;');

    const updatedDelivery = rowToDelivery(db.prepare('SELECT * FROM deliveries WHERE id = ?').get(session.delivery_id), db);

    return {
      success: true,
      deliveryId: session.delivery_id,
      attemptId: session.attempt_id,
      customerResponse: response,
      status: newStatus,
      decision: newDecision,
      retryRequired: Boolean(retryRequired),
      recordedAt: now,
      delivery: updatedDelivery
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('[DB Atomic Transaction Error]:', err);
    return { success: false, error: 'DB_ERROR', code: 500, message: err.message };
  }
}

// Development / Testing Seeding
function seedIfEmpty(seedDeliveries = []) {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as count FROM deliveries').get().count;
  if (count === 0 && Array.isArray(seedDeliveries) && seedDeliveries.length > 0) {
    console.log(`[DB] Seeding ${seedDeliveries.length} initial development deliveries...`);
    seedDeliveries.forEach(d => upsertDelivery(d));
  }
}

module.exports = {
  getDb,
  getDelivery,
  getAllDeliveries,
  upsertDelivery,
  deleteDelivery,
  addAuditEvent,
  getAuditEvents,
  hashToken,
  createVerificationSession,
  getVerificationSessionByHash,
  getActiveVerificationSessionForAttempt,
  markVerificationSessionOpened,
  consumeVerificationSessionAtomic,
  seedIfEmpty
};
