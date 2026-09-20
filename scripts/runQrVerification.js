// Real-Time QR Customer Verification Live Runner
const http = require('http');
const QRCode = require('qrcode');

const SERVER_URL = 'http://localhost:3001';
const DELIVERY_ID = 'DEL-1003';

async function request(path, options = {}) {
  const url = new URL(path, SERVER_URL);
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function listenToEvents(onEvent) {
  const url = new URL('/api/events', SERVER_URL);
  const req = http.request(url, {
    method: 'GET',
    headers: { 'Accept': 'text/event-stream' }
  }, (res) => {
    res.setEncoding('utf8');
    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            onEvent(parsed);
          } catch (e) {}
        }
      }
    });
  });
  req.on('error', () => {});
  req.end();
  return req;
}

async function main() {
  console.log('\n======================================================');
  console.log('📱 SABOOT — REAL-TIME QR CUSTOMER VERIFICATION RUNNER');
  console.log('======================================================\n');

  // 1. Reset DEL-1003 to REVIEW
  await request(`/api/deliveries/${DELIVERY_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'REVIEW',
      decision: 'REVIEW',
      customerResponse: null,
      customerResponseAt: null,
      customerResponseSource: null,
      qrStatus: null,
      verificationToken: null,
      requiresAdminApproval: true,
      adminApprovalStatus: 'PENDING',
      decisionReason: 'Customer Unavailable claim: Doorstep footage attached. Awaiting verification.',
    })
  });

  // 2. Generate live QR token
  console.log(`1. Generating secure QR Token for delivery: ${DELIVERY_ID}...`);
  const qrRes = await request(`/api/deliveries/${DELIVERY_ID}/customer-verification/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (qrRes.status !== 200 || !qrRes.data.token) {
    console.error('❌ Failed to generate QR token:', qrRes.data);
    process.exit(1);
  }

  const { token, verificationUrl, expiresAt } = qrRes.data;
  console.log(`   ✅ Token Generated: ${token}`);
  console.log(`   🕒 Token Expires At: ${new Date(expiresAt).toLocaleTimeString()} (5-min TTL)`);
  console.log(`   🔗 Direct Portal URL: ${verificationUrl}\n`);

  // 3. Render ASCII QR Code
  console.log('2. Displaying driver phone QR code (Scan with your phone camera):\n');
  const qrAscii = await QRCode.toString(verificationUrl, { type: 'terminal', small: true });
  console.log(qrAscii);

  console.log('\n------------------------------------------------------');
  console.log(`👉 BROWSER URL: ${verificationUrl}`);
  console.log('👉 ADMIN OPERATIONS CONSOLE: http://localhost:3001/admin');
  console.log('------------------------------------------------------\n');
  console.log('📡 Listening for real-time customer scan and response events...\n');

  // 4. Listen for real-time SSE events
  listenToEvents((event) => {
    if (event.type === 'CUSTOMER_QR_SCANNED' && event.deliveryId === DELIVERY_ID) {
      console.log(`\n📷 [REAL-TIME EVENT] Customer opened verification portal!`);
      console.log(`   Scanned At: ${event.scannedAt}`);
      console.log(`   Delivery ID: ${event.deliveryId}\n`);
    } else if (event.type === 'CUSTOMER_RESPONSE_RECORDED' && event.deliveryId === DELIVERY_ID) {
      console.log(`\n✅ [REAL-TIME EVENT] Customer response received!`);
      console.log(`   Customer Response: ${event.customerResponse}`);
      console.log(`   Resolution Status: ${event.status}`);
      console.log(`   Final Decision: ${event.decision}`);
      console.log(`   Audit Time: ${event.recordedAt}`);
      console.log('\n🎉 Real-time QR Verification flow completed successfully!\n');
      process.exit(0);
    }
  });

  // Keep process alive for 60 seconds or until scan/response occurs
  setTimeout(() => {
    console.log('\n⏱️ Session timed out after 60s. Token remains valid until 5-min expiry.');
    process.exit(0);
  }, 60000);
}

main().catch(err => {
  console.error('Error running QR verification:', err);
  process.exit(1);
});
