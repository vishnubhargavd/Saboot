/**
 * Saboot Customer Notification Service
 * 
 * Provider Architecture:
 *   NotificationService
 *          │
 *          ├── ResendEmailProvider (Official Resend SDK)
 *          └── DemoEmailProvider   (Zero-cost, local simulation)
 * 
 * Strict Zero-Trust Security Rules:
 * - Credentials never leak to browser, logs, or customer payloads
 * - Recipient address strictly derived from trusted server-side delivery record
 * - Verification URL is delivery-specific (/verify/:deliveryId)
 * - Duplicate email protection via attempt-scoped idempotency keys
 * - Fail-safe: Resend errors never crash server or alter deterministic verification
 */

const fs = require('fs');
const path = require('path');
const { generateCustomerVerificationEmail } = require('./emailTemplate');

// Auto-load .env if present (zero-dependency loader)
function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (key && process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      });
    } catch (e) {}
  }
}
loadEnv();

/**
 * Demo Email Provider
 * Simulates email delivery without making external network calls.
 * Status is strictly 'SIMULATED' (never 'SENT').
 */
class DemoEmailProvider {
  constructor() {
    this.name = 'demo';
  }

  async sendEmail({ to, subject, html, text, verificationUrl, deliveryId }) {
    console.log(`\n========================================`);
    console.log(`EMAIL — DEMO MODE`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Your delivery requires confirmation.`);
    console.log(`Verify: ${verificationUrl}`);
    console.log(`Status: SIMULATED`);
    console.log(`========================================\n`);

    return {
      success: true,
      status: 'SIMULATED',
      provider: 'demo',
      providerMessageId: `demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      sentAt: new Date().toISOString()
    };
  }
}

/**
 * Resend Email Provider
 * Uses the official Resend Node.js SDK to send transactional emails.
 */
class ResendEmailProvider {
  constructor({ apiKey, fromEmail, client } = {}) {
    this.name = 'resend';
    this.apiKey = (apiKey !== undefined && apiKey !== null) ? apiKey : (process.env.RESEND_API_KEY || '');
    this.fromEmail = fromEmail || process.env.EMAIL_FROM || 'Saboot Verification <onboarding@resend.dev>';

    if (client) {
      this.resendClient = client;
    } else if (this.apiKey) {
      try {
        const { Resend } = require('resend');
        this.resendClient = new Resend(this.apiKey);
      } catch (err) {
        console.warn('[ResendEmailProvider] Could not initialize Resend SDK:', err.message);
        this.resendClient = null;
      }
    } else {
      this.resendClient = null;
    }
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.apiKey || !this.resendClient) {
      return {
        success: false,
        status: 'FAILED',
        provider: 'resend',
        reason: 'invalid_configuration',
        error: 'Missing or unconfigured RESEND_API_KEY',
        sentAt: new Date().toISOString()
      };
    }

    try {
      const response = await this.resendClient.emails.send({
        from: this.fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text
      });

      if (response && response.error) {
        return {
          success: false,
          status: 'FAILED',
          provider: 'resend',
          reason: response.error.name || 'provider_rejected',
          error: response.error.message || 'Resend API rejected message',
          sentAt: new Date().toISOString()
        };
      }

      return {
        success: true,
        status: 'SENT',
        provider: 'resend',
        providerMessageId: response?.data?.id || `resend_${Date.now()}`,
        sentAt: new Date().toISOString()
      };
    } catch (err) {
      return {
        success: false,
        status: 'FAILED',
        provider: 'resend',
        reason: 'provider_unavailable',
        error: err.message || 'Resend service connection failed',
        sentAt: new Date().toISOString()
      };
    }
  }
}

/**
 * Notification Service Facade
 */
class NotificationService {
  constructor(options = {}) {
    this.providerType = options.providerType || process.env.EMAIL_PROVIDER || 'demo';
    this.baseUrl = options.baseUrl || process.env.PUBLIC_BASE_URL || process.env.CUSTOMER_PORTAL_BASE_URL || 'http://localhost:3001';
    this.fromEmail = options.fromEmail || process.env.EMAIL_FROM || 'Saboot Verification <onboarding@resend.dev>';
    this.onEvent = options.onEvent || null;

    // Initialize provider implementations
    this.demoProvider = new DemoEmailProvider();
    this.resendProvider = new ResendEmailProvider({
      apiKey: options.resendApiKey || process.env.RESEND_API_KEY,
      fromEmail: this.fromEmail,
      client: options.resendClient
    });

    // In-memory set to prevent duplicate sends across operations
    this.sentIdempotencyKeys = new Set();
  }

  /**
   * Set or update active provider ('demo' | 'resend')
   */
  setProvider(type) {
    this.providerType = type;
  }

  /**
   * Get current active email provider instance
   */
  getProvider() {
    if (this.providerType === 'resend') {
      return this.resendProvider;
    }
    return this.demoProvider;
  }

  /**
   * Build delivery-specific verification URL
   */
  getVerificationUrl(deliveryId) {
    const cleanBase = (this.baseUrl || 'http://localhost:3001').replace(/\/+$/, '');
    return `${cleanBase}/verify/${encodeURIComponent(deliveryId)}`;
  }

  /**
   * Main entry point to send customer verification email
   * 
   * @param {Object} params
   * @param {Object} params.delivery - Server-side delivery record
   * @param {string} [params.attemptId] - Optional attempt identifier for idempotency
   * @param {boolean} [params.force] - Bypass duplicate check if explicitly requested
   * @returns {Promise<Object>}
   */
  async sendCustomerVerificationEmail({ delivery, attemptId = '1', force = false }) {
    if (!delivery || !delivery.id) {
      return { success: false, status: 'FAILED', reason: 'invalid_delivery' };
    }

    const idempotencyKey = `${delivery.id}:${attemptId}:EMAIL`;

    // 1. Idempotency Check: Prevent duplicate email sends
    if (!force) {
      if (this.sentIdempotencyKeys.has(idempotencyKey) ||
          (delivery.customerNotification &&
           (delivery.customerNotification.status === 'SENT' || delivery.customerNotification.status === 'SIMULATED') &&
           delivery.customerNotification.idempotencyKey === idempotencyKey)) {
        return {
          success: true,
          status: delivery.customerNotification?.status || 'ALREADY_SENT',
          alreadySent: true,
          provider: delivery.customerNotification?.provider || this.providerType,
          idempotencyKey
        };
      }
    }

    if (!delivery.auditTimeline) delivery.auditTimeline = [];

    // 2. Resolve trusted recipient email from server-side record
    const recipientEmail = delivery.customer?.email?.trim();
    const recipientName = delivery.customer?.name || 'Customer';
    const verificationUrl = this.getVerificationUrl(delivery.id);
    delivery.verificationUrl = verificationUrl;

    const now = new Date().toISOString();

    // Audit: Notification created
    delivery.auditTimeline.push({
      timestamp: now,
      event: 'CUSTOMER_EMAIL_NOTIFICATION_CREATED',
      description: 'Customer email notification created'
    });

    // 3. Handle missing customer email safely (EMAIL_NOT_CONFIGURED)
    if (!recipientEmail) {
      const failureResult = {
        channel: 'EMAIL',
        provider: this.providerType,
        status: 'FAILED',
        reason: 'EMAIL_NOT_CONFIGURED',
        deliveryId: delivery.id,
        recipientEmail: null,
        recipientName,
        verificationUrl,
        idempotencyKey,
        sentAt: now
      };

      delivery.customerNotification = failureResult;

      delivery.auditTimeline.push({
        timestamp: new Date().toISOString(),
        event: 'CUSTOMER_EMAIL_FAILED',
        description: 'Customer email failed: EMAIL_NOT_CONFIGURED'
      });

      if (this.onEvent) {
        this.onEvent({
          type: 'CUSTOMER_EMAIL_FAILED',
          deliveryId: delivery.id,
          notification: failureResult,
          auditTimeline: delivery.auditTimeline
        });
      }

      return {
        success: false,
        status: 'FAILED',
        reason: 'EMAIL_NOT_CONFIGURED',
        notification: failureResult
      };
    }

    // Audit: Send requested
    delivery.auditTimeline.push({
      timestamp: new Date().toISOString(),
      event: 'CUSTOMER_EMAIL_SEND_REQUESTED',
      description: `Customer email send requested (${this.providerType === 'resend' ? 'Resend' : 'Demo'})`
    });

    // 4. Generate clean email content
    const emailContent = generateCustomerVerificationEmail({
      customerName: recipientName,
      deliveryId: delivery.id,
      trackingNumber: delivery.trackingNumber,
      packageDescription: delivery.packageDescription,
      verificationUrl
    });

    // 5. Send via active provider
    const provider = this.getProvider();
    const sendResult = await provider.sendEmail({
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      verificationUrl,
      deliveryId: delivery.id
    });

    const finalTimestamp = sendResult.sentAt || new Date().toISOString();

    const notificationRecord = {
      channel: 'EMAIL',
      provider: sendResult.provider || this.providerType,
      status: sendResult.status,
      deliveryId: delivery.id,
      recipientEmail,
      recipientName,
      subject: emailContent.subject,
      verificationUrl,
      idempotencyKey,
      sentAt: finalTimestamp,
      reason: sendResult.reason || null,
      providerMessageId: sendResult.providerMessageId || null
    };

    delivery.customerNotification = notificationRecord;

    // Also populate backwards-compatible simulatedNotification for existing UI/tests
    if (!delivery.simulatedNotification || delivery.simulatedNotification.channel === 'SMS') {
      delivery.simulatedNotification = {
        channel: 'EMAIL',
        provider: sendResult.provider || this.providerType,
        status: sendResult.status,
        recipientPhone: delivery.customer?.phone || '+91 90191 44983',
        recipientEmail,
        recipientName,
        sentAt: finalTimestamp,
        message: `SABOOT: Your delivery requires confirmation. Verify here: ${verificationUrl}`,
        verificationUrl
      };
    }

    // 6. Record appropriate Audit Event
    if (sendResult.status === 'SENT') {
      this.sentIdempotencyKeys.add(idempotencyKey);
      delivery.auditTimeline.push({
        timestamp: finalTimestamp,
        event: 'CUSTOMER_EMAIL_SENT',
        description: 'Customer email sent'
      });

      if (this.onEvent) {
        this.onEvent({
          type: 'CUSTOMER_EMAIL_SENT',
          deliveryId: delivery.id,
          notification: notificationRecord,
          auditTimeline: delivery.auditTimeline
        });
      }
    } else if (sendResult.status === 'SIMULATED') {
      this.sentIdempotencyKeys.add(idempotencyKey);
      delivery.auditTimeline.push({
        timestamp: finalTimestamp,
        event: 'CUSTOMER_EMAIL_SIMULATED',
        description: 'Customer email simulated (demo mode)'
      });

      if (this.onEvent) {
        this.onEvent({
          type: 'CUSTOMER_EMAIL_SIMULATED',
          deliveryId: delivery.id,
          notification: notificationRecord,
          auditTimeline: delivery.auditTimeline
        });
      }
    } else {
      delivery.auditTimeline.push({
        timestamp: finalTimestamp,
        event: 'CUSTOMER_EMAIL_FAILED',
        description: `Customer email failed: ${sendResult.reason || 'provider_error'}`
      });

      if (this.onEvent) {
        this.onEvent({
          type: 'CUSTOMER_EMAIL_FAILED',
          deliveryId: delivery.id,
          notification: notificationRecord,
          auditTimeline: delivery.auditTimeline
        });
      }
    }

    return {
      success: sendResult.success,
      status: sendResult.status,
      provider: notificationRecord.provider,
      notification: notificationRecord
    };
  }
}

module.exports = {
  NotificationService,
  ResendEmailProvider,
  DemoEmailProvider
};
