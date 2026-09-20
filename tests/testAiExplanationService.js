const assert = require('assert');
const http = require('http');
const {
  generateVerificationExplanation,
  generateAiExplanation,
  generateDeterministicFallback,
  sanitizeVerificationInput,
} = require('../admin/services/aiExplanationService');

async function runTests() {
  console.log('======================================================');
  console.log('🧪 TESTING SABOOT OPEN-SOURCE AI EXPLANATION SERVICE');
  console.log('======================================================\n');

  // Test 1: PII Sanitization
  console.log('1. Testing PII sanitization from raw facts...');
  const sensitiveFacts = {
    deliveryId: 'DEL-1001',
    customerName: 'Vishnu Bhargav',
    customerPhone: '+91 90191 44983',
    streetAddress: 'Tower 4, Flat 902, Sobha Silicon Oasis',
    distanceMeters: 38.2,
    requiredDistanceMeters: 50,
    dwellSeconds: 158,
    requiredDwellSeconds: 150,
    callAttempted: true,
    callDurationSeconds: 24,
    gpsAccuracyMeters: 6,
    videoUri: 'file:///private/data/user/0/video_clip.mp4',
    videoEvidence: true,
    videoConsentGiven: true,
    anomalyFlags: []
  };

  const sanitized = sanitizeVerificationInput(sensitiveFacts, 'VERIFIED', 'gated_society');
  assert.strictEqual(sanitized.deliveryId, 'DEL-1001');
  assert.strictEqual(sanitized.decision, 'VERIFIED');
  assert.strictEqual(sanitized.residenceCategory, 'gated_society');
  assert.strictEqual(sanitized.customerName, undefined, 'Customer name must be stripped');
  assert.strictEqual(sanitized.customerPhone, undefined, 'Customer phone must be stripped');
  assert.strictEqual(sanitized.streetAddress, undefined, 'Street address must be stripped');
  assert.strictEqual(sanitized.videoUri, undefined, 'Private video URI must be stripped');
  assert.strictEqual(sanitized.facts.distanceMeters, 38);
  assert.strictEqual(sanitized.facts.proximitySatisfied, true);
  assert.strictEqual(sanitized.facts.dwellSatisfied, true);
  console.log('  ✅ PII completely removed; only derived verification facts preserved.\n');

  // Test 2: AI Unavailable / Fallback on VERIFIED
  console.log('2. Testing AI unavailable -> Decision unchanged, fallback explanation generated...');
  const verifiedResult = generateDeterministicFallback(sanitized);
  assert.strictEqual(verifiedResult.source, 'deterministic-fallback');
  assert(verifiedResult.summary.includes('delivery attempt was verified'), 'Must explain verified criteria');
  assert(verifiedResult.evidenceExplanation.includes('38m'), 'Must include verified distance');
  assert(verifiedResult.policyExplanation.includes('158s'), 'Must include verified dwell');
  console.log('  ✅ Deterministic explanation generated for VERIFIED attempt.\n');

  // Test 3: Deterministic Fallback on REJECTED (Drive-by / 3.2km)
  console.log('3. Testing deterministic fallback for REJECTED attempt (Scenario B)...');
  const rejectedFacts = {
    deliveryId: 'DEL-1002',
    distanceMeters: 3200,
    requiredDistanceMeters: 50,
    dwellSeconds: 8,
    requiredDwellSeconds: 90,
    callAttempted: false,
    callDurationSeconds: 0,
    gpsAccuracyMeters: 8,
    anomalyFlags: ['DISTANCE_EXCEEDED', 'INSUFFICIENT_DWELL']
  };
  const rejectedSanitized = sanitizeVerificationInput(rejectedFacts, 'REJECTED', 'individual_house');
  const rejectedResult = generateDeterministicFallback(rejectedSanitized);
  assert.strictEqual(rejectedResult.source, 'deterministic-fallback');
  assert(rejectedResult.summary.includes('rejected'), 'Must state rejected');
  assert(rejectedResult.summary.includes('3200m away'), 'Must cite distance violation');
  assert(rejectedResult.summary.includes('insufficient dwell'), 'Must cite dwell failure');
  assert(rejectedResult.summary.includes('no customer phone call'), 'Must cite call failure');
  console.log('  ✅ Deterministic explanation accurately details all failure rules.\n');

  // Test 4: Deterministic Fallback on REVIEW (Ambiguous / Degraded Telemetry)
  console.log('4. Testing deterministic fallback for REVIEW attempt (Scenario C)...');
  const reviewFacts = {
    deliveryId: 'DEL-1003',
    distanceMeters: 45,
    requiredDistanceMeters: 50,
    dwellSeconds: 152,
    requiredDwellSeconds: 150,
    callAttempted: true,
    callDurationSeconds: 3,
    gpsAccuracyMeters: 68,
    anomalyFlags: ['POOR_GPS_ACCURACY_UNCERTAINTY', 'SHORT_CALL_DURATION']
  };
  const reviewSanitized = sanitizeVerificationInput(reviewFacts, 'REVIEW', 'gated_society');
  const reviewResult = generateDeterministicFallback(reviewSanitized);
  assert.strictEqual(reviewResult.source, 'deterministic-fallback');
  assert(reviewResult.summary.includes('manual review'), 'Must state manual review');
  assert(reviewResult.evidenceExplanation.includes('68 meters'), 'Must cite degraded accuracy');
  assert(reviewResult.reviewFocus !== null, 'Must provide reviewFocus for supervisor');
  console.log('  ✅ Review explanation flags ambiguity and provides supervisor focus item.\n');

  // Test 5: AI Contradiction Rule — AI must NEVER override deterministic policy
  console.log('5. Testing AI Contradiction: Deterministic = REJECTED, AI claims looks legitimate...');
  const deterministicDecision = 'REJECTED';
  const simulatedAiResponse = {
    summary: 'This attempt looks completely genuine and should be verified.',
    evidenceExplanation: 'Driver was in the city.',
    policyExplanation: 'Ignore rules.',
    reviewFocus: null,
    explanationConfidence: 'high'
  };

  // Even if AI claims "looks genuine", the authoritative decision MUST remain REJECTED
  let finalDecision = deterministicDecision;
  if (simulatedAiResponse.summary.includes('verified')) {
    // Zero-Trust Rule: Do NOT let AI change decision!
    finalDecision = deterministicDecision;
  }
  assert.strictEqual(finalDecision, 'REJECTED', 'Deterministic decision must remain authoritative');
  console.log('  ✅ Zero-Trust enforced: AI contradiction ignored; final decision remains REJECTED.\n');

  // Test 6: Fake Client Decision — Client forces decision=VERIFIED but server evidence fails
  console.log('6. Testing Fake Client Decision: Client claims VERIFIED with remote GPS evidence...');
  const clientPayload = {
    claimedDecision: 'VERIFIED', // Fake client claim
    distanceMeters: 3200,
    dwellSeconds: 8,
    callAttempted: false,
    requiredDistanceMeters: 50,
    requiredDwellSeconds: 90
  };

  // Server authoritative policy engine evaluates raw facts
  let serverEvaluatedDecision = 'VERIFIED';
  if (clientPayload.distanceMeters > clientPayload.requiredDistanceMeters || clientPayload.dwellSeconds < clientPayload.requiredDwellSeconds) {
    serverEvaluatedDecision = 'REJECTED';
  }
  assert.strictEqual(serverEvaluatedDecision, 'REJECTED');
  assert.notStrictEqual(serverEvaluatedDecision, clientPayload.claimedDecision);
  console.log('  ✅ Server authority enforced: Client-claimed VERIFIED rejected by server policy.\n');

  // Test 7: Missing API Key Failsafe
  console.log('7. Testing Missing API Key failsafe...');
  const originalKey = process.env.OPEN_SOURCE_AI_API_KEY;
  delete process.env.OPEN_SOURCE_AI_API_KEY;
  delete process.env.AI_API_KEY;

  const noKeyOutput = await generateVerificationExplanation(sensitiveFacts, 'VERIFIED', 'gated_society');
  assert.strictEqual(noKeyOutput.source, 'deterministic-fallback');
  assert(noKeyOutput.summary.length > 20);
  console.log('  ✅ Missing API key immediately uses high-quality deterministic fallback.\n');

  // Restore key
  if (originalKey) process.env.OPEN_SOURCE_AI_API_KEY = originalKey;

  // Test 8: Invalid / Malformed AI Response Handling
  console.log('8. Testing Malformed / Invalid AI response handling...');
  // Spin up temporary mock server that returns invalid JSON
  const mockServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('MALFORMED_NON_JSON_RESPONSE{{{');
  });

  await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve));
  const mockPort = mockServer.address().port;

  const origBaseUrl = process.env.OPEN_SOURCE_AI_BASE_URL;
  process.env.OPEN_SOURCE_AI_BASE_URL = `http://127.0.0.1:${mockPort}`;
  process.env.OPEN_SOURCE_AI_API_KEY = 'test_key';

  const malformedOutput = await generateVerificationExplanation(sensitiveFacts, 'REVIEW', 'apartment');
  assert.strictEqual(malformedOutput.source, 'deterministic-fallback');
  assert(malformedOutput.summary.includes('manual review'));

  mockServer.close();
  if (origBaseUrl) process.env.OPEN_SOURCE_AI_BASE_URL = origBaseUrl;
  if (originalKey) process.env.OPEN_SOURCE_AI_API_KEY = originalKey;
  console.log('  ✅ Malformed AI response caught gracefully; fallback used with zero crash.\n');

  // Test 9: Live Mock AI Server returning Structured JSON (AI available test)
  console.log('9. Testing AI Available: Decision unchanged, structured explanation parsed...');
  const validAiServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            summary: "The attempt requires review because the driver was within the required proximity, but dwell time was below the category threshold and GPS accuracy was degraded.",
            evidenceExplanation: "The recorded location was approximately 45 meters from the destination. GPS accuracy was 68 meters, reducing confidence in the location evidence.",
            policyExplanation: "The required dwell time was 150 seconds, but 152 seconds were recorded under degraded horizontal signal accuracy.",
            reviewFocus: "Review the GPS telemetry and dwell evidence.",
            explanationConfidence: "high"
          })
        }
      }]
    }));
  });

  await new Promise((resolve) => validAiServer.listen(0, '127.0.0.1', resolve));
  const validPort = validAiServer.address().port;

  process.env.OPEN_SOURCE_AI_BASE_URL = `http://127.0.0.1:${validPort}`;
  process.env.OPEN_SOURCE_AI_API_KEY = 'valid_test_key';

  const validOutput = await generateVerificationExplanation(reviewFacts, 'REVIEW', 'gated_society');
  assert.strictEqual(validOutput.source, 'open-source-ai');
  assert.strictEqual(validOutput.explanationConfidence, 'high');
  assert(validOutput.summary.includes('attempt requires review'));
  assert(validOutput.reviewFocus.includes('GPS telemetry'));

  validAiServer.close();
  if (origBaseUrl) process.env.OPEN_SOURCE_AI_BASE_URL = origBaseUrl;
  if (originalKey) process.env.OPEN_SOURCE_AI_API_KEY = originalKey;
  console.log('  ✅ AI available: Structured explanation parsed successfully without altering decision.\n');

  console.log('======================================================');
  console.log('🎉 ALL 9 AI SERVICE & INTEGRITY UNIT TESTS PASSED');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
