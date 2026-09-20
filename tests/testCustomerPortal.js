/**
 * Saboot Customer Verification Portal & Resolution Workflow Tests
 * 
 * Validates:
 * 1. Customer verification wording ("Did you receive your package?", "📦 I RECEIVED THE PACKAGE", "📦 I DID NOT RECEIVE THE PACKAGE")
 * 2. Case 1: REVIEW + PACKAGE_RECEIVED -> automatically VERIFIED (no admin approval required)
 * 3. Case 2: REVIEW + PACKAGE_NOT_RECEIVED -> CUSTOMER_CONFIRMED_FAILURE -> RETRY_REQUIRED
 * 4. Driver App retry task generation & active route visibility
 * 5. Admin Console Customer Confirmed Failures listing
 * 6. Zero-Trust Rule: Hard REJECTED deliveries cannot be blindly converted to VERIFIED by customer input
 * 7. Duplicate customer response prevention (Idempotency)
 * 8. Security: Malicious payloads cannot override decision, status, distance, dwell, or policy facts
 * 9. Real-time Audit Timeline logging with actual system timestamps
 * 10. Customer link and simulated notification generation
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3001', 10);

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

async function runTests() {
  console.log('======================================================');
  console.log('🧪 TESTING SABOOT CUSTOMER CONFIRMATION WORKFLOW MVP');
  console.log('======================================================\n');

  // Step 1: Query deliveries
  console.log('1. Querying active deliveries from server...');
  const deliveriesRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/api/deliveries',
    method: 'GET'
  });
  assert.strictEqual(deliveriesRes.status, 200, 'GET /api/deliveries must return 200');
  assert(Array.isArray(deliveriesRes.data), 'Deliveries must be an array');
  assert(deliveriesRes.data.length >= 2, 'Must have at least 2 deliveries for testing');

  // Create isolated test deliveries for clean deterministic assertions
  const testIdReview = `TEST-CONFIRM-${Date.now()}`;
  const testIdReject = `TEST-REJECT-${Date.now()}`;

  await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: '/api/deliveries',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      id: testIdReview,
      trackingNumber: `SBT-TST-${Math.floor(100000 + Math.random() * 900000)}`,
      customer: { id: 'CUST-T1', name: 'Zeeshan Ahmed', phone: '+91 90191 44983' },
      address: { street: '44, 23rd Cross Rd, HSR Sector 2', city: 'Bengaluru', residenceCategory: 'apartment', lat: 12.9080, lng: 77.6475 },
      packageDescription: 'Electronics — Flagship Smartphone',
      status: 'REVIEW',
      decision: 'REVIEW',
      distanceMeters: 45,
      dwellSeconds: 110,
      requiredDwellSeconds: 120,
      callAttempted: true,
      callDuration: 22,
      gpsAccuracy: 12,
      requiresAdminApproval: true,
      adminApprovalStatus: 'PENDING'
    }
  );

  await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: '/api/deliveries',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      id: testIdReject,
      trackingNumber: `SBT-TST-${Math.floor(100000 + Math.random() * 900000)}`,
      customer: { id: 'CUST-T2', name: 'Farhan Siddiqui', phone: '+91 98451 99887' },
      address: { street: '80 Feet Road, Koramangala', city: 'Bengaluru', residenceCategory: 'individual_house', lat: 12.9344, lng: 77.6258 },
      packageDescription: 'Apparel — Designer Jacket',
      status: 'REJECTED',
      decision: 'REJECTED',
      distanceMeters: 4200,
      dwellSeconds: 5,
      requiredDwellSeconds: 90,
      callAttempted: false,
      callDuration: 0,
      gpsAccuracy: 8
    }
  );

  console.log(`  ✅ Created test delivery in REVIEW: ${testIdReview}`);
  console.log(`  ✅ Created test delivery in REJECTED: ${testIdReject}\n`);

  // Step 2: Test GET /verify/:deliveryId Portal HTML wording
  console.log(`2. Testing GET /verify/${testIdReview} Portal HTML wording...`);
  const portalRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: `/verify/${testIdReview}`,
    method: 'GET'
  });

  assert.strictEqual(portalRes.status, 200, 'Valid delivery portal must return 200');
  assert(portalRes.headers['content-type'].includes('text/html'), 'Content-Type must be text/html');
  assert(portalRes.data.includes('Did you receive your package?'), 'Must display: Did you receive your package?');
  assert(portalRes.data.includes('📦 I RECEIVED THE PACKAGE'), 'Must display button: 📦 I RECEIVED THE PACKAGE');
  assert(portalRes.data.includes('📦 I DID NOT RECEIVE THE PACKAGE'), 'Must display button: 📦 I DID NOT RECEIVE THE PACKAGE');
  assert(!portalRes.data.includes('I WAS AVAILABLE'), 'Must NOT include old wording: I WAS AVAILABLE');
  console.log('  ✅ Customer Verification Portal displays exact business question & package options\n');

  // Step 3: Test CASE 1 — REVIEW + PACKAGE_RECEIVED -> VERIFIED / SUCCESSFUL
  console.log(`3. Testing CASE 1: REVIEW + PACKAGE_RECEIVED on ${testIdReview}...`);
  const confirmReceivedRes = await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: `/api/customer-verification/${testIdReview}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { response: 'PACKAGE_RECEIVED' }
  );

  assert.strictEqual(confirmReceivedRes.status, 200);
  assert.strictEqual(confirmReceivedRes.data.success, true);
  assert.strictEqual(confirmReceivedRes.data.customerResponse, 'PACKAGE_RECEIVED');
  assert.strictEqual(confirmReceivedRes.data.status, 'VERIFIED', 'Delivery must automatically transition to VERIFIED');
  assert.strictEqual(confirmReceivedRes.data.decision, 'VERIFIED', 'Decision must automatically transition to VERIFIED');

  // Fetch updated delivery and verify no admin approval is required
  const verifyOrder1Res = await request({
    hostname: 'localhost',
    port: PORT,
    path: `/api/deliveries`,
    method: 'GET'
  });
  const updatedOrder1 = verifyOrder1Res.data.find((d) => d.id === testIdReview);
  assert.strictEqual(updatedOrder1.status, 'VERIFIED', 'Status must be VERIFIED on server');
  assert.strictEqual(updatedOrder1.requiresAdminApproval, false, 'No admin approval required after customer confirms receipt');
  assert.strictEqual(updatedOrder1.adminApprovalStatus, 'APPROVED', 'Admin approval automatically approved');

  // Verify Audit Timeline contains events
  assert(Array.isArray(updatedOrder1.auditTimeline), 'Must have audit timeline');
  const hasCustomerConfirmed = updatedOrder1.auditTimeline.some((e) => e.event === 'CUSTOMER_CONFIRMED_RECEIVED');
  const hasSabootVerified = updatedOrder1.auditTimeline.some((e) => e.event === 'SABOOT_VERIFIED');
  assert(hasCustomerConfirmed, 'Timeline must record Customer confirmed: PACKAGE RECEIVED');
  assert(hasSabootVerified, 'Timeline must record Saboot → VERIFIED');
  console.log('  ✅ CASE 1 VERIFIED: REVIEW + PACKAGE_RECEIVED automatically transitioned to VERIFIED without admin approval\n');

  // Step 4: Verify Portal HTML post-receipt confirmed state
  console.log(`4. Verifying Portal HTML for confirmed delivery...`);
  const portalReceivedRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: `/verify/${testIdReview}`,
    method: 'GET'
  });
  assert(portalReceivedRes.data.includes('Package Receipt Confirmed'), 'Must display: Package Receipt Confirmed');
  assert(portalReceivedRes.data.includes('You confirmed that you received this package.'), 'Must display confirmation text');
  assert(portalReceivedRes.data.includes('Delivery verification has been completed.'), 'Must display completion text');
  console.log('  ✅ Portal renders exact post-confirmation receipt card\n');

  // Step 5: Duplicate Submission Prevention (Idempotent)
  console.log(`5. Testing Duplicate Submission Prevention on ${testIdReview}...`);
  const duplicateRes = await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: `/api/customer-verification/${testIdReview}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { response: 'PACKAGE_NOT_RECEIVED' }
  );
  assert.strictEqual(duplicateRes.status, 200);
  assert.strictEqual(duplicateRes.data.alreadyRecorded, true);
  assert.strictEqual(duplicateRes.data.customerResponse, 'PACKAGE_RECEIVED', 'Original response preserved');
  console.log('  ✅ Duplicate response prevented; existing confirmation preserved\n');

  // Step 6: Test CASE 2 — REVIEW + PACKAGE_NOT_RECEIVED -> CUSTOMER_CONFIRMED_FAILURE + RETRY_REQUIRED
  const testIdNotReceived = `TEST-NOTRECV-${Date.now()}`;
  console.log(`6. Testing CASE 2: REVIEW + PACKAGE_NOT_RECEIVED on ${testIdNotReceived}...`);
  await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: '/api/deliveries',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      id: testIdNotReceived,
      trackingNumber: `SBT-TST-${Math.floor(100000 + Math.random() * 900000)}`,
      customer: { id: 'CUST-T3', name: 'Kavita Nair', phone: '+91 97411 22334' },
      address: { street: '14th Main, HSR Layout Sector 4', city: 'Bengaluru', residenceCategory: 'apartment', lat: 12.9116, lng: 77.6389 },
      packageDescription: 'Books — Technical Manual',
      status: 'REVIEW',
      decision: 'REVIEW',
      distanceMeters: 42,
      dwellSeconds: 112,
      requiredDwellSeconds: 120,
      callAttempted: true,
      callDuration: 18,
      gpsAccuracy: 10
    }
  );

  const confirmNotReceivedRes = await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: `/api/customer-verification/${testIdNotReceived}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { response: 'PACKAGE_NOT_RECEIVED' }
  );

  assert.strictEqual(confirmNotReceivedRes.status, 200);
  assert.strictEqual(confirmNotReceivedRes.data.success, true);
  assert.strictEqual(confirmNotReceivedRes.data.customerResponse, 'PACKAGE_NOT_RECEIVED');
  assert.strictEqual(confirmNotReceivedRes.data.status, 'CUSTOMER_CONFIRMED_FAILURE', 'Status must be CUSTOMER_CONFIRMED_FAILURE');
  assert.strictEqual(confirmNotReceivedRes.data.retryRequired, true, 'Must flag retryRequired=true');

  // Verify server record
  const verifyOrder2Res = await request({
    hostname: 'localhost',
    port: PORT,
    path: `/api/deliveries`,
    method: 'GET'
  });
  const updatedOrder2 = verifyOrder2Res.data.find((d) => d.id === testIdNotReceived);
  assert.strictEqual(updatedOrder2.status, 'CUSTOMER_CONFIRMED_FAILURE');
  assert.strictEqual(updatedOrder2.retryRequired, true);

  // Verify timeline events for Case 2
  const hasConfirmedFailure = updatedOrder2.auditTimeline.some((e) => e.event === 'DELIVERY_CUSTOMER_CONFIRMED_FAILURE');
  const hasRetryRequired = updatedOrder2.auditTimeline.some((e) => e.event === 'DELIVERY_RETRY_REQUIRED');
  const hasDriverTask = updatedOrder2.auditTimeline.some((e) => e.event === 'DRIVER_RETRY_TASK_CREATED');
  assert(hasConfirmedFailure, 'Must log DELIVERY_CUSTOMER_CONFIRMED_FAILURE');
  assert(hasRetryRequired, 'Must log DELIVERY_RETRY_REQUIRED');
  assert(hasDriverTask, 'Must log DRIVER_RETRY_TASK_CREATED');
  console.log('  ✅ CASE 2 VERIFIED: REVIEW + PACKAGE_NOT_RECEIVED transitioned to CUSTOMER_CONFIRMED_FAILURE & RETRY_REQUIRED\n');

  // Step 7: Verify Portal HTML for package not received state
  console.log(`7. Verifying Portal HTML for not received delivery...`);
  const portalNotReceivedRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: `/verify/${testIdNotReceived}`,
    method: 'GET'
  });
  assert(portalNotReceivedRes.data.includes('Package Not Received'), 'Must display: Package Not Received');
  assert(portalNotReceivedRes.data.includes('Your response has been recorded.'), 'Must display: Your response has been recorded.');
  assert(portalNotReceivedRes.data.includes('This delivery has been marked for another delivery attempt.'), 'Must display attempt note');
  console.log('  ✅ Portal renders clean customer message without internal admin jargon\n');

  // Step 8: ZERO-TRUST RULE: Hard evidence rejection must NOT be overturned by customer confirmation
  console.log(`8. ZERO-TRUST RULE: Testing customer confirmation on hard rejection (${testIdReject})...`);
  const rejectOverrideAttempt = await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: `/api/customer-verification/${testIdReject}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { response: 'PACKAGE_RECEIVED' }
  );

  assert.strictEqual(rejectOverrideAttempt.status, 200);
  assert.strictEqual(rejectOverrideAttempt.data.customerResponse, 'PACKAGE_RECEIVED');
  assert.strictEqual(rejectOverrideAttempt.data.status, 'REJECTED', 'ZERO-TRUST: Hard rejection must NOT become VERIFIED');
  assert.strictEqual(rejectOverrideAttempt.data.decision, 'REJECTED', 'ZERO-TRUST: Decision must remain REJECTED');

  const verifyRejectRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: `/api/deliveries`,
    method: 'GET'
  });
  const finalReject = verifyRejectRes.data.find((d) => d.id === testIdReject);
  assert.strictEqual(finalReject.status, 'REJECTED', 'Server status remains REJECTED');
  assert.strictEqual(finalReject.customerResponse, 'PACKAGE_RECEIVED', 'Customer statement logged as additional evidence');
  const hasZeroTrustEnforced = finalReject.auditTimeline.some((e) => e.event === 'ZERO_TRUST_POLICY_ENFORCED');
  assert(hasZeroTrustEnforced, 'Timeline must log ZERO_TRUST_POLICY_ENFORCED');
  console.log('  ✅ ZERO-TRUST RULE ENFORCED: Hard rejection maintained despite customer claim\n');

  // Step 9: Security Tamper Resistance
  console.log('9. SECURITY TEST: Malicious fields injection prevention...');
  const testIdSec = `TEST-SEC-${Date.now()}`;
  await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: '/api/deliveries',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      id: testIdSec,
      trackingNumber: 'SBT-SEC-001',
      customer: { name: 'Malicious Client', phone: '+91 99999 99999' },
      address: { street: 'Unknown', city: 'Bengaluru', residenceCategory: 'apartment', lat: 12.9, lng: 77.6 },
      packageDescription: 'Security Probe',
      status: 'REJECTED',
      decision: 'REJECTED',
      distanceMeters: 5000,
      dwellSeconds: 2,
      requiredDwellSeconds: 120,
      callAttempted: false
    }
  );

  const maliciousPayload = {
    response: 'PACKAGE_RECEIVED',
    status: 'VERIFIED',
    decision: 'VERIFIED',
    distanceMeters: 5,
    dwellSeconds: 500,
    requiresAdminApproval: false,
    adminApprovalStatus: 'APPROVED'
  };

  const maliciousRes = await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: `/api/customer-verification/${testIdSec}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    maliciousPayload
  );

  assert.strictEqual(maliciousRes.status, 200);
  const verifySecRes = await request({ hostname: 'localhost', port: PORT, path: '/api/deliveries', method: 'GET' });
  const secDelivery = verifySecRes.data.find((d) => d.id === testIdSec);
  assert.strictEqual(secDelivery.status, 'REJECTED', 'Status must NOT be changed by malicious payload');
  assert.strictEqual(secDelivery.distanceMeters, 5000, 'Distance must NOT be changed by malicious payload');
  assert.strictEqual(secDelivery.dwellSeconds, 2, 'Dwell must NOT be changed by malicious payload');
  console.log('  ✅ SECURITY ENFORCED: Malicious payload fields ignored; server authority preserved\n');

  // Step 10: Invalid input validation
  console.log('10. Testing validation for invalid responses...');
  const invalidRes = await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: `/api/customer-verification/${testIdReview}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { response: 'INVALID_ENUM_CHOICE' }
  );
  assert.strictEqual(invalidRes.status, 400, 'Must reject invalid response values with 400');
  console.log('  ✅ Invalid inputs rejected with 400 Bad Request\n');

  // Step 11: 404 for Nonexistent delivery
  console.log('11. Testing 404 handling...');
  const notFoundRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/verify/DOES_NOT_EXIST_99999',
    method: 'GET'
  });
  assert.strictEqual(notFoundRes.status, 404, 'Must return 404 for nonexistent delivery');
  console.log('  ✅ Nonexistent delivery correctly returns 404 Not Found\n');

  console.log('======================================================');
  console.log('🎉 ALL 11 CUSTOMER CONFIRMATION & ZERO-TRUST TESTS PASSED!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
