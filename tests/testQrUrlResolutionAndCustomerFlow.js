/**
 * Test Suite: QR URL Resolution, Physical-Device Host Routing & Customer Verification
 * 
 * Verifies all requirements from prompt:
 * - Test A: PUBLIC_BASE_URL=http://192.168.1.105:3001 -> http://192.168.1.105:3001/v/<token>
 * - Test B: Trailing slash PUBLIC_BASE_URL=http://192.168.1.105:3001/ -> http://192.168.1.105:3001/v/<token>
 * - Test C: Ensure generated QR URL does not contain localhost when LAN PUBLIC_BASE_URL is configured
 * - Test D: Never use localhost for physical customer QR: loopback rejected when PHYSICAL_DEVICE_LAN_MODE is active
 * - Test E: Authoritative resolveCustomerVerificationUrl helper
 * - Test F: Dynamic local LAN IP detection when no env is set
 * - Test G: Production HTTPS preserved without downgrade
 * - Test H: Delivery verification persistence & HTTP endpoints
 */

const assert = require('assert');
const http = require('http');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3098';

const {
  resolvePublicBaseUrl,
  resolveCustomerVerificationUrl,
  isLoopbackAddress,
  getLocalLanIp,
  createCustomerVerificationToken,
  server
} = require('../admin/server');
const db = require('../admin/services/database');

async function runTests() {
  console.log('\n================================================================');
  console.log('🧪 TESTING QR URL RESOLUTION & CUSTOMER VERIFICATION FLOW');
  console.log('================================================================\n');

  // Backup original env vars
  const origPublicBaseUrl = process.env.PUBLIC_BASE_URL;
  const origCustPortalUrl = process.env.CUSTOMER_PORTAL_BASE_URL;
  const origLanMode = process.env.PHYSICAL_DEVICE_LAN_MODE;
  const origNodeEnv = process.env.NODE_ENV;

  try {
    // -------------------------------------------------------------
    // Test A: Explicit LAN URL (PUBLIC_BASE_URL=http://192.168.1.105:3001)
    // -------------------------------------------------------------
    console.log('[Test A] PUBLIC_BASE_URL=http://192.168.1.105:3001 ...');
    process.env.PUBLIC_BASE_URL = 'http://192.168.1.105:3001';
    const baseUrlA = resolvePublicBaseUrl();
    assert.strictEqual(baseUrlA, 'http://192.168.1.105:3001', 'Must match configured LAN base URL');
    const tokenA = 'tok_secure_test_123';
    const qrUrlA = resolveCustomerVerificationUrl(tokenA);
    assert.strictEqual(qrUrlA, `http://192.168.1.105:3001/v/${tokenA}`, 'QR URL must be http://192.168.1.105:3001/v/<token>');
    console.log(`  ✅ Resolved: ${qrUrlA}\n`);

    // -------------------------------------------------------------
    // Test B: Trailing Slash Normalization (PUBLIC_BASE_URL=http://192.168.1.105:3001/)
    // -------------------------------------------------------------
    console.log('[Test B] Trailing slash normalization (PUBLIC_BASE_URL=http://192.168.1.105:3001/) ...');
    process.env.PUBLIC_BASE_URL = 'http://192.168.1.105:3001/';
    const baseUrlB = resolvePublicBaseUrl();
    assert.strictEqual(baseUrlB, 'http://192.168.1.105:3001', 'Trailing slash must be stripped');
    const qrUrlB = resolveCustomerVerificationUrl('token-xyz');
    assert.strictEqual(qrUrlB, 'http://192.168.1.105:3001/v/token-xyz', 'Output must be http://192.168.1.105:3001/v/<token>');
    
    // Test multiple trailing slashes
    process.env.PUBLIC_BASE_URL = 'http://192.168.1.105:3001///';
    const baseUrlMultiSlash = resolvePublicBaseUrl();
    assert.strictEqual(baseUrlMultiSlash, 'http://192.168.1.105:3001');
    assert.strictEqual(resolveCustomerVerificationUrl('multi-slash'), 'http://192.168.1.105:3001/v/multi-slash');
    console.log(`  ✅ Normalized: ${qrUrlB}\n`);

    // -------------------------------------------------------------
    // Test C: Ensure generated QR URL does NOT contain 'localhost' when LAN PUBLIC_BASE_URL is configured
    // -------------------------------------------------------------
    console.log('[Test C] Verify generated QR URL never contains localhost when LAN PUBLIC_BASE_URL is set ...');
    process.env.PUBLIC_BASE_URL = 'http://192.168.1.105:3001';
    delete process.env.CUSTOMER_PORTAL_BASE_URL;

    const dummyDelivery = {
      id: 'DEL-TEST-C-01',
      trackingNumber: 'SBT-C-01',
      customer: { id: 'CUST-C', name: 'Test C', phone: '+91 99999 11111' },
      address: { street: 'Main St', city: 'Bengaluru', residenceCategory: 'apartment' },
      status: 'REVIEW',
      decision: 'REVIEW',
      assignedDriverId: 'DRV-BLR-09'
    };
    db.upsertDelivery(dummyDelivery);

    const qrTokenResult = await createCustomerVerificationToken(dummyDelivery, null, 'ATT-TEST-C');
    assert.ok(qrTokenResult.verificationUrl, 'Must return verificationUrl');
    assert.ok(!qrTokenResult.verificationUrl.includes('localhost'), 'Must NOT contain localhost');
    assert.ok(!qrTokenResult.verificationUrl.includes('127.0.0.1'), 'Must NOT contain 127.0.0.1');
    assert.ok(!qrTokenResult.verificationUrl.includes('0.0.0.0'), 'Must NOT contain 0.0.0.0');
    assert.ok(qrTokenResult.verificationUrl.startsWith('http://192.168.1.105:3001/v/'), 'Must start with LAN base URL');
    console.log(`  ✅ Generated QR URL: ${qrTokenResult.verificationUrl}`);
    console.log('  ✅ Confirmed no localhost/127.0.0.1 leakage in QR URL\n');

    // -------------------------------------------------------------
    // Test D: Never use localhost for physical customer QR:
    //         Reject or prevent customer QR generation if resolved URL contains localhost/127.0.0.1
    //         when physical-device LAN mode is enabled, unless running inside isolated automated test
    // -------------------------------------------------------------
    console.log('[Test D] Physical-device LAN mode loopback rejection ...');
    process.env.PUBLIC_BASE_URL = 'http://localhost:3001';
    process.env.PHYSICAL_DEVICE_LAN_MODE = 'true';

    // 1. In development mode (NODE_ENV != 'test'), loopback MUST be rejected
    process.env.NODE_ENV = 'development';
    let rejectedAsExpected = false;
    try {
      await createCustomerVerificationToken(dummyDelivery, null, 'ATT-TEST-D-DEV');
    } catch (err) {
      if (err.code === 'INVALID_PHYSICAL_QR_URL') {
        rejectedAsExpected = true;
        console.log(`  ✅ Correctly rejected in development mode with INVALID_PHYSICAL_QR_URL: ${err.message}`);
      } else {
        throw err;
      }
    }
    assert.strictEqual(rejectedAsExpected, true, 'Must reject loopback QR generation in physical-device LAN mode');

    // 2. In isolated automated test mode (NODE_ENV == 'test'), loopback is allowed to preserve existing tests
    process.env.NODE_ENV = 'test';
    const testModeToken = await createCustomerVerificationToken(dummyDelivery, null, 'ATT-TEST-D-TEST');
    assert.ok(testModeToken.token, 'Must allow token generation in test mode');
    console.log('  ✅ Automated test mode correctly permits test executions without failure\n');

    // Reset env vars for subsequent tests
    delete process.env.PHYSICAL_DEVICE_LAN_MODE;
    process.env.NODE_ENV = 'test';

    // -------------------------------------------------------------
    // Test E: Authoritative resolveCustomerVerificationUrl Helper
    // -------------------------------------------------------------
    console.log('[Test E] Single authoritative customer verification URL resolver ...');
    process.env.PUBLIC_BASE_URL = 'http://10.0.0.42:3001';
    const testToken = 'abcXYZ_12345';
    const resolvedUrl = resolveCustomerVerificationUrl(testToken);
    assert.strictEqual(resolvedUrl, `http://10.0.0.42:3001/v/${testToken}`);
    assert.strictEqual(isLoopbackAddress('http://localhost:3001'), true);
    assert.strictEqual(isLoopbackAddress('http://127.0.0.1:3001'), true);
    assert.strictEqual(isLoopbackAddress('http://0.0.0.0:3001'), true);
    assert.strictEqual(isLoopbackAddress('http://192.168.1.105:3001'), false);
    assert.strictEqual(isLoopbackAddress('https://verify.saboot.org'), false);
    console.log('  ✅ Authoritative resolver & loopback detector verified\n');

    // -------------------------------------------------------------
    // Test F: Dynamic Local LAN IP Detection (when PUBLIC_BASE_URL is not set)
    // -------------------------------------------------------------
    console.log('[Test F] Dynamic LAN IP resolution (when env var is empty) ...');
    delete process.env.PUBLIC_BASE_URL;
    delete process.env.CUSTOMER_PORTAL_BASE_URL;
    process.env.NODE_ENV = 'development';

    const lanIp = getLocalLanIp();
    const resLan = resolvePublicBaseUrl();
    console.log(`  Local LAN IP detected: ${lanIp}`);
    console.log(`  Resolved Base URL:     ${resLan}`);
    if (lanIp) {
      assert.ok(!resLan.includes('localhost'), 'Must NOT resolve to localhost when valid LAN IP exists');
      assert.ok(!resLan.includes('127.0.0.1'), 'Must NOT resolve to 127.0.0.1 when valid LAN IP exists');
      assert.ok(resLan.includes(lanIp), `Resolved URL must include detected LAN IP ${lanIp}`);
    }
    console.log('  ✅ Dynamic LAN resolution passed without localhost leakage\n');

    // -------------------------------------------------------------
    // Test G: Production HTTPS is preserved without downgrade
    // -------------------------------------------------------------
    console.log('[Test G] Production HTTPS is preserved ...');
    process.env.PUBLIC_BASE_URL = 'https://verify.saboot.org';
    const resHttps = resolvePublicBaseUrl();
    assert.ok(resHttps.startsWith('https://'), 'Must maintain HTTPS protocol');
    assert.strictEqual(resolveCustomerVerificationUrl('secure-tok'), 'https://verify.saboot.org/v/secure-tok');
    console.log(`  ✅ Verified: ${resHttps}\n`);

    // -------------------------------------------------------------
    // Test H: Customer submission via /verify/:deliveryId or /api/customer-verification/:id
    // -------------------------------------------------------------
    console.log('[Test H] Verification submission for DEL-ASR-10 & HTTP POST ...');
    process.env.NODE_ENV = 'test';

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

    const consumeResult = db.consumeVerificationSessionAtomic({
      deliveryId: testDelId,
      response: 'PACKAGE_RECEIVED',
      ip: '192.168.1.15',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
    });

    assert.strictEqual(consumeResult.success, true);
    assert.strictEqual(consumeResult.status, 'VERIFIED');
    assert.notStrictEqual(consumeResult.error, 'INVALID_TOKEN');
    console.log('  ✅ DEL-ASR-10 receipt verified and atomic status transitioned to VERIFIED\n');

    // Start server if not already listening
    if (!server.listening) {
      await new Promise((resolve) => server.listen(3098, '0.0.0.0', resolve));
    }

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

    assert.strictEqual(httpRes.statusCode, 200);
    assert.strictEqual(httpRes.data.success, true);
    assert.strictEqual(httpRes.data.status, 'VERIFIED');
    assert.notStrictEqual(httpRes.data.error, 'INVALID_TOKEN');
    console.log('  ✅ HTTP POST /api/customer-verification/:deliveryId succeeded\n');

    console.log('================================================================');
    console.log('🎉 ALL QR URL RESOLUTION & CUSTOMER VERIFICATION TESTS PASSED!');
    console.log('================================================================\n');
  } finally {
    // Restore env vars
    if (origPublicBaseUrl !== undefined) process.env.PUBLIC_BASE_URL = origPublicBaseUrl;
    else delete process.env.PUBLIC_BASE_URL;

    if (origCustPortalUrl !== undefined) process.env.CUSTOMER_PORTAL_BASE_URL = origCustPortalUrl;
    else delete process.env.CUSTOMER_PORTAL_BASE_URL;

    if (origLanMode !== undefined) process.env.PHYSICAL_DEVICE_LAN_MODE = origLanMode;
    else delete process.env.PHYSICAL_DEVICE_LAN_MODE;

    process.env.NODE_ENV = origNodeEnv || 'development';

    if (server.listening) {
      server.close();
    }
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
