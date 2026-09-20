/**
 * Saboot Live Resend Email Verification Script
 * 
 * Verifies the complete live transactional email workflow:
 * 1. Initiates doorstep verification attempt on DEL-ASR-01 (Customer: Abhinav Kamutala, abhinavkx@gmail.com)
 * 2. Deterministic verification evaluates to REVIEW due to ambiguous GPS uncertainty (Scenario C)
 * 3. Customer confirmation is automatically required
 * 4. NotificationService invokes ResendEmailProvider with live API key
 * 5. Resend API accepts email for delivery and returns message ID
 * 6. Audit timeline records CUSTOMER_EMAIL_SENT
 * 7. Customer verification URL is validated and returns 200 OK
 */

const http = require('http');
const assert = require('assert');

const PORT = 3001;

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
          } else {
            resolve({ status: res.statusCode, headers: res.headers, data: body });
          }
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runLiveTest() {
  console.log('======================================================');
  console.log('🚀 SABOOT LIVE RESEND EMAIL DELIVERY VERIFICATION');
  console.log('======================================================\n');

  const deliveryId = 'DEL-ASR-01';
  const customerEmail = 'abhinavkx@gmail.com';

  console.log(`1. Target Delivery: ${deliveryId}`);
  console.log(`   Customer: Abhinav Kamutala`);
  console.log(`   Trusted Recipient Email: ${customerEmail}`);

  // Step 1: Ensure DEL-ASR-01 is loaded and has customer email configured
  const getInitialRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/api/deliveries',
    method: 'GET'
  });

  const order = getInitialRes.data.find(d => d.id === deliveryId);
  assert.ok(order, `Delivery ${deliveryId} must exist in server database`);

  // Ensure customer email is set to abhinavkx@gmail.com
  if (!order.customer || order.customer.email !== customerEmail) {
    order.customer = order.customer || {};
    order.customer.email = customerEmail;
    await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/deliveries/${deliveryId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { customer: order.customer });
  }

  // Step 2: Trigger deterministic verification attempt producing REVIEW
  console.log('\n2. Submitting verification attempt to POST /api/verify (ambiguous GPS telemetry -> REVIEW)...');
  const verifyRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/api/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    deliveryId,
    isSimulatedDemo: true,
    simulationPresetId: 'SCENARIO_C',
    telephonyHistory: { attempted: true, durationSeconds: 45 },
    currentGpsPoint: { latitude: 12.9080, longitude: 77.6475, accuracy: 68 }
  });

  assert.strictEqual(verifyRes.status, 200, `POST /api/verify failed with HTTP ${verifyRes.status}`);
  console.log(`  ✅ Deterministic Decision: ${verifyRes.data.decision}`);
  assert.strictEqual(verifyRes.data.decision, 'REVIEW', 'Scenario C must evaluate to REVIEW');

  // Step 3: Query server ledger to inspect customer notification status
  console.log('\n3. Verifying authoritative server ledger state and live Resend dispatch...');
  const getUpdatedRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/api/deliveries',
    method: 'GET'
  });

  const liveOrder = getUpdatedRes.data.find(d => d.id === deliveryId);
  assert.ok(liveOrder, 'Order must exist in deliveries list');
  console.log(`  Decision: ${liveOrder.decision}`);
  console.log(`  Requires Customer Confirmation: ${liveOrder.requiresCustomerConfirmation}`);

  const notif = liveOrder.customerNotification;
  assert.ok(notif, 'customerNotification record must exist on delivery');
  console.log(`  Notification Channel: ${notif.channel}`);
  console.log(`  Notification Provider: ${notif.provider}`);
  console.log(`  Notification Status: ${notif.status}`);
  console.log(`  Recipient: ${notif.recipientEmail}`);
  console.log(`  Provider Message ID: ${notif.providerMessageId || 'N/A'}`);

  assert.strictEqual(notif.provider, 'resend', 'Provider must be real live Resend');
  assert.strictEqual(notif.status, 'SENT', 'Email must have SENT status from live Resend API');
  assert.ok(notif.providerMessageId, 'Must have received a genuine message ID from Resend API');

  // Step 4: Verify Audit Timeline
  console.log('\n4. Verifying Audit Timeline for email events...');
  const timelineEvents = liveOrder.auditTimeline.map(e => e.event);
  assert.ok(timelineEvents.includes('CUSTOMER_EMAIL_NOTIFICATION_CREATED'), 'Must log NOTIFICATION_CREATED');
  assert.ok(timelineEvents.includes('CUSTOMER_EMAIL_SEND_REQUESTED'), 'Must log SEND_REQUESTED');
  assert.ok(timelineEvents.includes('CUSTOMER_EMAIL_SENT'), 'Must log CUSTOMER_EMAIL_SENT');
  console.log('  ✅ Audit timeline confirmed: CUSTOMER_EMAIL_SENT recorded');

  // Step 5: Verify Customer Verification Portal endpoint from generated URL
  console.log('\n5. Verifying Customer Portal endpoint from generated URL...');
  console.log(`  Portal URL: ${liveOrder.verificationUrl}`);
  const portalRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: `/verify/${deliveryId}`,
    method: 'GET'
  });

  assert.strictEqual(portalRes.status, 200, `Customer portal must return 200 OK, got ${portalRes.status}`);
  assert.ok(portalRes.data.includes('Did you receive your package?'), 'Portal must contain customer verification question');
  assert.ok(portalRes.data.includes('I RECEIVED THE PACKAGE'), 'Portal must contain confirmation option');
  console.log('  ✅ Customer verification portal opens successfully with full interactive workflow');

  console.log('\n======================================================');
  console.log('🎉 100% SUCCESS: REAL LIVE RESEND EMAIL SENT & VERIFIED');
  console.log(`   Message ID: ${notif.providerMessageId}`);
  console.log(`   Recipient:  ${notif.recipientEmail}`);
  console.log('======================================================\n');
}

runLiveTest().catch(err => {
  console.error('\n❌ Live Resend verification failed:', err);
  process.exit(1);
});
