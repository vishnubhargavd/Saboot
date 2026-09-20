/**
 * Saboot Customer Verification Portal MVP & Zero-Trust Integrity Tests
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
  console.log('🧪 TESTING SABOOT CUSTOMER VERIFICATION PORTAL MVP');
  console.log('======================================================\n');

  // Step 1: Query existing deliveries to pick a test delivery
  console.log('1. Querying active deliveries from server...');
  const deliveriesRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/api/deliveries',
    method: 'GET'
  });
  assert.strictEqual(deliveriesRes.status, 200, 'GET /api/deliveries must return 200');
  assert(Array.isArray(deliveriesRes.data), 'Deliveries must be an array');
  assert(deliveriesRes.data.length > 0, 'Must have active deliveries');

  const testOrder = deliveriesRes.data[0];
  const testDeliveryId = testOrder.id;

  // Reset any previous customer response so test runs cleanly and idempotently
  await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: `/api/deliveries/${testDeliveryId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      customerResponse: null,
      customerResponseAt: null,
      customerResponseSource: null
    }
  );

  console.log(`  ✅ Found test delivery: ${testDeliveryId} (Status: ${testOrder.status})\n`);

  // Step 2: Test GET /verify/:deliveryId with a valid delivery
  console.log(`2. Testing GET /verify/${testDeliveryId} (Valid Delivery)...`);
  const portalRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: `/verify/${testDeliveryId}`,
    method: 'GET'
  });

  assert.strictEqual(portalRes.status, 200, 'Valid delivery portal must return 200');
  assert(portalRes.headers['content-type'].includes('text/html'), 'Content-Type must be text/html');
  assert(portalRes.data.includes(`Delivery #${testDeliveryId}`), 'Portal HTML must render delivery ID');
  assert(portalRes.data.includes('Verification Details'), 'Portal HTML must render Verification Details');
  assert(portalRes.data.includes('Why was this attempt flagged?'), 'Portal HTML must render flag reason section');
  assert(portalRes.data.includes('Were you available to receive this delivery?'), 'Portal HTML must render confirmation prompt');
  console.log('  ✅ Valid delivery verification portal rendered with 200 OK and complete factual details\n');

  // Step 3: Test GET /verify/:deliveryId with a nonexistent delivery (404)
  console.log('3. Testing GET /verify/NONEXISTENT-DEL-9999 (Invalid Delivery)...');
  const notFoundRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/verify/NONEXISTENT-DEL-9999',
    method: 'GET'
  });

  assert.strictEqual(notFoundRes.status, 404, 'Nonexistent delivery must return 404');
  assert(notFoundRes.data.includes('Delivery Not Found'), 'Must display Delivery Not Found message');
  console.log('  ✅ Nonexistent delivery returns clean 404 Delivery Not Found page\n');

  // Step 4: Test POST /api/customer-verification/:deliveryId (Valid submission)
  console.log(`4. Testing POST /api/customer-verification/${testDeliveryId} (CUSTOMER_AVAILABLE)...`);
  const submitRes = await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: `/api/customer-verification/${testDeliveryId}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { response: 'CUSTOMER_AVAILABLE' }
  );

  assert.strictEqual(submitRes.status, 200, 'Customer verification submission must return 200');
  assert.strictEqual(submitRes.data.success, true, 'Response must indicate success');
  assert.strictEqual(submitRes.data.customerResponse, 'CUSTOMER_AVAILABLE', 'Customer response must match');
  assert(submitRes.data.recordedAt, 'Response must include recordedAt timestamp');
  console.log(`  ✅ Customer response recorded: ${submitRes.data.customerResponse} at ${submitRes.data.recordedAt}\n`);

  // Step 5: Test Duplicate Submission Prevention (Idempotent response)
  console.log('5. Testing Duplicate Submission Prevention...');
  const duplicateRes = await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: `/api/customer-verification/${testDeliveryId}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { response: 'CUSTOMER_UNAVAILABLE' }
  );

  assert.strictEqual(duplicateRes.status, 200, 'Duplicate submission must return 200 with alreadyRecorded');
  assert.strictEqual(duplicateRes.data.alreadyRecorded, true, 'Must flag alreadyRecorded=true');
  assert.strictEqual(duplicateRes.data.customerResponse, 'CUSTOMER_AVAILABLE', 'Previous response must not be overwritten');
  console.log('  ✅ Duplicate submission caught gracefully; initial response preserved\n');

  // Step 6: Test Portal HTML after response is recorded
  console.log('6. Verifying Portal HTML after response is recorded...');
  const updatedPortalRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: `/verify/${testDeliveryId}`,
    method: 'GET'
  });

  assert(updatedPortalRes.data.includes('Your response has been recorded'), 'Portal must show recorded state');
  assert(updatedPortalRes.data.includes('I WAS AVAILABLE'), 'Portal must display the recorded response choice');
  console.log('  ✅ Portal displays recorded confirmation badge and lock state\n');

  // Step 7: Test Validation on Invalid Response values
  console.log('7. Testing validation on invalid response body...');
  const invalidRes = await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: `/api/customer-verification/${testDeliveryId}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { response: 'MALICIOUS_INPUT' }
  );

  assert.strictEqual(invalidRes.status, 400, 'Invalid response choice must return 400');
  assert.strictEqual(invalidRes.data.success, false);
  console.log('  ✅ Invalid response choices properly rejected with 400 Bad Request\n');

  // Step 8: Test POST /api/customer-verification on nonexistent delivery
  console.log('8. Testing POST /api/customer-verification on nonexistent delivery...');
  const notFoundPost = await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: '/api/customer-verification/NONEXISTENT-9999',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { response: 'CUSTOMER_AVAILABLE' }
  );

  assert.strictEqual(notFoundPost.status, 404, 'Nonexistent delivery must return 404');
  console.log('  ✅ Nonexistent delivery correctly rejected with 404 Not Found\n');

  // Step 9: ZERO-TRUST INTEGRITY TEST (Tamper resistance)
  console.log('9. ZERO-TRUST INTEGRITY: Customer attempting to override decision or telemetry...');
  // Use a second order
  const secondOrder = deliveriesRes.data[1] || testOrder;
  const originalStatus = secondOrder.status;
  const originalDecision = secondOrder.decision;
  const originalDistance = secondOrder.distanceMeters;

  const tamperRes = await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: `/api/customer-verification/${secondOrder.id}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      response: 'CUSTOMER_UNAVAILABLE',
      status: 'VERIFIED',
      decision: 'VERIFIED',
      distanceMeters: 0,
      dwellSeconds: 9999,
      policyResult: 'SUPER_PASS'
    }
  );

  assert.strictEqual(tamperRes.status, 200, 'Customer response accepted as evidence');

  // Fetch from server and verify no fields were tampered
  const verifyTamperRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/api/deliveries',
    method: 'GET'
  });
  const updatedSecond = verifyTamperRes.data.find((d) => d.id === secondOrder.id);
  assert.strictEqual(updatedSecond.customerResponse, 'CUSTOMER_UNAVAILABLE', 'Customer response evidence must be logged');
  assert.strictEqual(updatedSecond.status, originalStatus, 'ZERO-TRUST: Status must NOT be modified by customer');
  assert.strictEqual(updatedSecond.decision, originalDecision, 'ZERO-TRUST: Decision must NOT be modified by customer');
  assert.strictEqual(updatedSecond.distanceMeters, originalDistance, 'ZERO-TRUST: Distance must NOT be modified by customer');
  console.log('  ✅ ZERO-TRUST ENFORCED: Customer endpoint cannot modify status, decision, or telemetry facts!\n');

  // Step 10: Verify persistence to disk
  console.log('10. Verifying physical persistence to disk (admin/data/deliveries.json)...');
  const diskPath = path.join(__dirname, '../admin/data/deliveries.json');
  assert(fs.existsSync(diskPath), 'admin/data/deliveries.json must exist');
  const diskContent = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
  const diskOrder = diskContent.find((d) => d.id === testDeliveryId);
  assert(diskOrder, 'Order must be saved on disk');
  assert.strictEqual(diskOrder.customerResponse, 'CUSTOMER_AVAILABLE', 'Customer response must be physically saved to disk');
  console.log('  ✅ Customer verification response physically persisted on disk\n');

  // Cleanup test deliveries
  await request(
    {
      hostname: 'localhost',
      port: PORT,
      path: `/api/deliveries/${testDeliveryId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      customerResponse: null,
      customerResponseAt: null,
      customerResponseSource: null
    }
  );
  if (secondOrder.id !== testDeliveryId) {
    await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/deliveries/${secondOrder.id}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        customerResponse: null,
        customerResponseAt: null,
        customerResponseSource: null
      }
    );
  }
  console.log('  ✅ Cleaned up test delivery responses for idempotency\n');

  console.log('======================================================');
  console.log('🎉 ALL 10 CUSTOMER PORTAL & INTEGRITY TESTS PASSED!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
