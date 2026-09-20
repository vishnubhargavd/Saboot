/**
 * Test Suite: QR URL Resolution, Physical-Device Host Routing & Customer Verification
 * 
 * Verifies:
 * 1. Explicit PUBLIC_BASE_URL (HTTPS production)
 * 2. Explicit LAN URL (http://192.168.1.105:3001)
 * 3. Normalization of trailing slashes (e.g. http://192.168.1.105:3001/)
 * 4. Production HTTPS preservation (no HTTP downgrade)
 * 5. Dynamic local LAN IP detection when no env is set
 * 6. Customer submission via /verify/:deliveryId or /api/customer-verification/:id NEVER returns INVALID_TOKEN
 * 7. Real physical-device delivery (e.g. DEL-ASR-10) confirmation flow
 */

const assert = require('assert');
const http = require('http');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3098';

const { resolvePublicBaseUrl, getLocalLanIp, server } = require('../admin/server');
const db = require('../admin/services/database');

async function runTests() {
  console.log('\n================================================================');
  console.log('🧪 TESTING QR URL RESOLUTION & CUSTOMER VERIFICATION FLOW');
  console.log('================================================================\n');

  // Backup original env vars
  const origPublicBaseUrl = process.env.PUBLIC_BASE_URL;
  const origCustPortalUrl = process.env.CUSTOMER_PORTAL_BASE_URL;

  try {
    // -------------------------------------------------------------
    // Test 1: Explicit PUBLIC_BASE_URL (Production HTTPS)
    // -------------------------------------------------------------
    console.log('[Test 1] Explicit PUBLIC_BASE_URL=https://saboot.example.com ...');
    process.env.PUBLIC_BASE_URL = 'https://saboot.example.com';
    const res1 = resolvePublicBaseUrl();
    assert.strictEqual(res1, 'https://saboot.example.com', 'Must match configured production URL');
    console.log(`  ✅ Resolved: ${res1} -> ${res1}/v/test-token\n`);

    // -------------------------------------------------------------
    // Test 2: Explicit LAN URL
    // -------------------------------------------------------------
    console.log('[Test 2] Explicit LAN PUBLIC_BASE_URL=http://192.168.1.105:3001 ...');
    process.env.PUBLIC_BASE_URL = 'http://192.168.1.105:3001';
    const res2 = resolvePublicBaseUrl();
    assert.strictEqual(res2, 'http://192.168.1.105:3001', 'Must match configured LAN base URL');
    console.log(`  ✅ Resolved: ${res2} -> ${res2}/v/test-token\n`);

    // -------------------------------------------------------------
    // Test 3: Trailing slash normalization
    // -------------------------------------------------------------
    console.log('[Test 3] Trailing slash normalization (http://192.168.1.105:3001/) ...');
    process.env.PUBLIC_BASE_URL = 'http://192.168.1.105:3001///';
    const res3 = resolvePublicBaseUrl();
    assert.strictEqual(res3, 'http://192.168.1.105:3001', 'Trailing slashes must be stripped');
    const tokenUrl = `${res3}/v/tok_abc123`;
    assert.strictEqual(tokenUrl, 'http://192.168.1.105:3001/v/tok_abc123');
    console.log(`  ✅ Normalized: ${tokenUrl}\n`);

    // -------------------------------------------------------------
    // Test 4: Production HTTPS is preserved without downgrade
    // -------------------------------------------------------------
    console.log('[Test 4] Production HTTPS is preserved ...');
    process.env.PUBLIC_BASE_URL = 'https://verify.saboot.org';
    const res4 = resolvePublicBaseUrl();
    assert.ok(res4.startsWith('https://'), 'Must maintain HTTPS protocol');
    console.log(`  ✅ Verified: ${res4}\n`);

    // -------------------------------------------------------------
    // Test 5: Dynamic Local LAN IP Detection (when env var is empty)
    // -------------------------------------------------------------
    console.log('[Test 5] Dynamic LAN IP resolution (when PUBLIC_BASE_URL is not set) ...');
    delete process.env.PUBLIC_BASE_URL;
    delete process.env.CUSTOMER_PORTAL_BASE_URL;
    // Set NODE_ENV to development to test physical device resolution
    process.env.NODE_ENV = 'development';

    const lanIp = getLocalLanIp();
    const res5 = resolvePublicBaseUrl();
    console.log(`  Local LAN IP detected: ${lanIp}`);
    console.log(`  Resolved Base URL:     ${res5}`);
    if (lanIp) {
      assert.ok(!res5.includes('localhost'), 'Must NOT resolve to localhost when valid LAN IP exists');
      assert.ok(!res5.includes('127.0.0.1'), 'Must NOT resolve to 127.0.0.1 when valid LAN IP exists');
      assert.ok(res5.includes(lanIp), `Resolved URL must include detected LAN IP ${lanIp}`);
    }
    console.log('  ✅ Dynamic LAN resolution passed without localhost leakage\n');

    // -------------------------------------------------------------
    // Test 6: Verification Submission for DEL-ASR-10 (Fix INVALID_TOKEN)
    // -------------------------------------------------------------
    console.log('[Test 6] Verification submission for DEL-ASR-10 (Fixing INVALID_TOKEN bug) ...');
    process.env.NODE_ENV = 'test';

    // Seed delivery in REVIEW state
    const testDelId = 'DEL-ASR-10';
    db.upsertDelivery({
      id: testDelId,
      trackingNumber: 'SBT-BLR-550110',
      customer: { id: 'CUST-ASR-10', name: 'Meera Krishnan', phone: '+91 98808 11223' },
      address: {
        street: '44, 23rd Cross Rd, Parangi Palaya, Sector 2, HSR Layout',
        city: 'Bengaluru',
        residenceCategory: 'apartment'
      },
      status: 'REVIEW',
      decision: 'REVIEW',
      assignedDriverId: 'DRV-BLR-09'
    });

    // Directly consume via atomic database service using deliveryId (simulating submission from /verify/DEL-ASR-10)
    const consumeResult = db.consumeVerificationSessionAtomic({
      deliveryId: testDelId,
      response: 'PACKAGE_RECEIVED',
      ip: '192.168.1.15',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
    });

    assert.strictEqual(consumeResult.success, true, `Consumption must succeed, received: ${JSON.stringify(consumeResult)}`);
    assert.strictEqual(consumeResult.status, 'VERIFIED', 'REVIEW + PACKAGE_RECEIVED must become VERIFIED');
    assert.notStrictEqual(consumeResult.error, 'INVALID_TOKEN', 'Must NOT fail with INVALID_TOKEN');
    console.log('  ✅ DEL-ASR-10 receipt verified and atomic status transitioned to VERIFIED\n');

    // -------------------------------------------------------------
    // Test 7: Submission to /api/customer-verification/:deliveryId via HTTP
    // -------------------------------------------------------------
    console.log('[Test 7] HTTP POST to /api/customer-verification/:deliveryId endpoint ...');
    const testDel2 = 'DEL-HTTP-TEST-01';
    db.upsertDelivery({
      id: testDel2,
      trackingNumber: 'SBT-HTTP-990011',
      customer: { id: 'CUST-HTTP', name: 'Test Recipient', phone: '+91 90000 00000' },
      address: { street: 'Indiranagar 100ft Rd', city: 'Bengaluru', residenceCategory: 'apartment' },
      status: 'REVIEW',
      decision: 'REVIEW',
      assignedDriverId: 'DRV-BLR-09'
    });

    // Start server if not already listening
    if (!server.listening) {
      await new Promise((resolve) => server.listen(3098, '0.0.0.0', resolve));
    }

    const postData = JSON.stringify({ response: 'PACKAGE_RECEIVED', deliveryId: testDel2 });
    const httpRes = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 3098,
          path: `/api/customer-verification/${testDel2}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, data: JSON.parse(body || '{}') });
          });
        }
      );
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    assert.strictEqual(httpRes.statusCode, 200, `HTTP status must be 200, got ${httpRes.statusCode}`);
    assert.strictEqual(httpRes.data.success, true, `Response must be success: true, got ${JSON.stringify(httpRes.data)}`);
    assert.strictEqual(httpRes.data.status, 'VERIFIED');
    assert.notStrictEqual(httpRes.data.error, 'INVALID_TOKEN');
    console.log('  ✅ HTTP POST /api/customer-verification/:deliveryId succeeded without INVALID_TOKEN error\n');

    console.log('================================================================');
    console.log('🎉 ALL 7 QR URL RESOLUTION & CUSTOMER VERIFICATION TESTS PASSED!');
    console.log('================================================================\n');
  } finally {
    // Restore env vars
    if (origPublicBaseUrl !== undefined) process.env.PUBLIC_BASE_URL = origPublicBaseUrl;
    else delete process.env.PUBLIC_BASE_URL;

    if (origCustPortalUrl !== undefined) process.env.CUSTOMER_PORTAL_BASE_URL = origCustPortalUrl;
    else delete process.env.CUSTOMER_PORTAL_BASE_URL;

    if (server.listening) {
      server.close();
    }
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
