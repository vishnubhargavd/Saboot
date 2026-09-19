const http = require('http');

async function request(options, bodyData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function run() {
  console.log('======================================================');
  console.log('🧪 TESTING VIDEO PROOF SUBMISSION & ADMIN REVIEW FLOW');
  console.log('======================================================');

  const deliveryId = 'DEL-1001';
  const videoFileName = '29244fe4-3b68-4695-9983-c74ea26b3123.mp4';

  // Step 1: Submit delivery completion with video proof
  console.log('\n1. Driver submits delivery handoff with video proof...');
  const submitRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/events',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      type: 'DELIVERY_COMPLETED',
      deliveryId,
      status: 'REVIEW',
      handoffType: 'doorstep',
      videoProofUri: `/api/uploads/${videoFileName}`,
      timestamp: new Date().toISOString(),
      auditId: 'AUD-AUTO-TEST',
      extra: {
        customerName: 'Vishnu Bhargav',
        requiresAdminApproval: true,
        adminApprovalStatus: 'PENDING',
        decisionReason: 'Doorstep handoff video submitted. Awaiting supervisor review to confirm legitimacy.',
      },
    }
  );

  if (submitRes.status !== 200 || !submitRes.data.success) {
    throw new Error('Failed to post DELIVERY_COMPLETED event: ' + JSON.stringify(submitRes));
  }
  console.log('  ✅ Delivery completion event received and broadcasted by server');

  // Step 2: Verify order state in GET /api/deliveries
  console.log('\n2. Verifying server persistence in GET /api/deliveries...');
  const getRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/deliveries',
    method: 'GET',
  });

  const order = getRes.data.find((o) => o.id === deliveryId);
  if (!order) throw new Error('Order DEL-1001 not found');

  console.log('  Status:', order.status);
  console.log('  Requires Admin Approval:', order.requiresAdminApproval);
  console.log('  Admin Approval Status:', order.adminApprovalStatus);
  console.log('  Video Proof URI:', order.videoProofUri);

  if (order.status !== 'REVIEW') throw new Error(`Expected REVIEW, got ${order.status}`);
  if (order.requiresAdminApproval !== true) throw new Error('Expected requiresAdminApproval to be true');
  if (order.adminApprovalStatus !== 'PENDING') throw new Error(`Expected PENDING, got ${order.adminApprovalStatus}`);
  console.log('  ✅ Order successfully queued in Admin Operations Console under REVIEW');

  // Step 3: Supervisor reviews and confirms legitimacy
  console.log('\n3. Supervisor inspects video footage and confirms delivery legitimacy...');
  const approveRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/deliveries/${deliveryId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      status: 'VERIFIED',
      decision: 'VERIFIED',
      adminApprovalStatus: 'APPROVED',
      decisionReason: 'Delivery verified & confirmed by supervisor. Video proof inspected & authenticated.',
    }
  );

  if (approveRes.status !== 200 || !approveRes.data.success) {
    throw new Error('Failed to update delivery approval: ' + JSON.stringify(approveRes));
  }
  console.log('  Status after supervisor approval:', approveRes.data.delivery.status);
  console.log('  Approval status:', approveRes.data.delivery.adminApprovalStatus);

  if (approveRes.data.delivery.status !== 'VERIFIED') throw new Error('Expected VERIFIED status');
  if (approveRes.data.delivery.adminApprovalStatus !== 'APPROVED') throw new Error('Expected APPROVED status');
  console.log('  ✅ Supervisor legitimacy confirmation successfully committed and saved to disk');

  // Step 4: Reset order back to IN_TRANSIT for user testing
  await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/deliveries/${deliveryId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      status: 'IN_TRANSIT',
      decision: 'REVIEW',
      requiresAdminApproval: false,
      adminApprovalStatus: null,
      videoProofUri: null,
      handoffType: null,
      decisionReason: 'Order active on route.',
    }
  );
  console.log('\n4. Cleaned up and reset DEL-1001 to IN_TRANSIT for user interactive session.');

  console.log('\n======================================================');
  console.log('🎉 ALL VIDEO SUBMISSION & ADMIN REVIEW TESTS PASSED!');
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
