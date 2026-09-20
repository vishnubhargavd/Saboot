/**
 * Saboot Dedicated AI Explanation Service
 * 
 * Generates human-readable explanations and supervisor audit summaries for
 * delivery verification outcomes WITHOUT compromising Zero-Trust principles.
 * 
 * CORE PRINCIPLE:
 * Evidence + deterministic policy = truth. AI = explanation only.
 * 
 * ZERO-TRUST CONSTRAINTS:
 * 1. AI NEVER determines, changes, or overrides the verification decision.
 * 2. The decision is 100% evaluated by the deterministic policy engine before AI is contacted.
 * 3. All input to the AI is strictly sanitized — zero customer names, phone numbers, or exact addresses.
 * 4. Failsafe: If the AI API times out (>4s), errors, or returns invalid output,
 *    the system seamlessly falls back to the deterministic explanation generator.
 */

const fs = require('fs');
const path = require('path');

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
          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    } catch (e) {}
  }
}

loadEnv();

/**
 * Strips all Personally Identifiable Information (PII) before sending to AI
 */
function sanitizeVerificationInput(facts, decision, residenceCategory) {
  const cat = residenceCategory || facts.residenceCategory || 'standard';
  return {
    deliveryId: facts.deliveryId || 'STOP-TASK',
    residenceCategory: cat,
    decision: decision, // Immutable: 'VERIFIED' | 'REJECTED' | 'REVIEW'
    facts: {
      distanceMeters: Math.round(facts.distanceMeters ?? 0),
      requiredDistanceMeters: facts.requiredDistanceMeters || 50,
      proximitySatisfied: (facts.distanceMeters ?? 999) <= (facts.requiredDistanceMeters || 50),
      dwellSeconds: Math.round(facts.dwellSeconds ?? 0),
      requiredDwellSeconds: facts.requiredDwellSeconds || 120,
      dwellSatisfied: (facts.dwellSeconds ?? 0) >= (facts.requiredDwellSeconds || 120),
      callAttempted: Boolean(facts.callAttempted),
      callDurationSeconds: Math.round(facts.callDurationSeconds ?? 0),
      callSatisfied: Boolean(facts.callAttempted) && (facts.callDurationSeconds ?? 0) >= 3,
      gpsAccuracyMeters: Math.round(facts.gpsAccuracyMeters ?? 10),
      gpsAccuracyHighConfidence: (facts.gpsAccuracyMeters ?? 10) <= 30,
      videoEvidence: Boolean(facts.videoEvidence || facts.videoUri),
      videoConsentGiven: Boolean(facts.videoConsentGiven),
      videoConsentRequested: Boolean(facts.videoConsentRequested),
      anomalyFlags: Array.isArray(facts.anomalyFlags) ? facts.anomalyFlags : []
    }
  };
}

/**
 * Deterministic explanation generator (guaranteed zero-latency offline fallback)
 */
function generateDeterministicFallback(sanitized) {
  const { decision, facts, residenceCategory } = sanitized;
  const categoryLabel = residenceCategory.replace(/_/g, ' ').toUpperCase();

  let summary = '';
  let evidenceExplanation = '';
  let policyExplanation = '';
  let reviewFocus = null;
  let reviewReasons = [];

  if (decision === 'VERIFIED') {
    summary = `The delivery attempt was verified because the driver was within the required geofence, satisfied the residence-specific dwell requirement, and provided the required evidence.`;
    evidenceExplanation = `Recorded location was ${facts.distanceMeters}m from customer door (limit: ${facts.requiredDistanceMeters}m). GPS signal accuracy was ±${facts.gpsAccuracyMeters}m. Telephony call attempt was logged with ${facts.callDurationSeconds}s duration.`;
    policyExplanation = `Deterministic policy verified all mandatory attempt criteria for ${categoryLabel}: dwell duration of ${facts.dwellSeconds}s met the mandatory ${facts.requiredDwellSeconds}s threshold.`;
    reviewFocus = null;
  } else if (decision === 'REJECTED') {
    const failures = [];
    if (!facts.proximitySatisfied) failures.push(`excessive distance (${facts.distanceMeters}m away, limit ${facts.requiredDistanceMeters}m)`);
    if (!facts.dwellSatisfied) failures.push(`insufficient dwell time (${facts.dwellSeconds}s vs ${facts.requiredDwellSeconds}s required)`);
    if (!facts.callAttempted) failures.push('no customer phone call was logged');

    summary = `The delivery attempt was rejected because one or more mandatory verification conditions were not satisfied (${failures.join('; ')}).`;
    evidenceExplanation = `Recorded distance was ${facts.distanceMeters}m from destination. Recorded dwell was ${facts.dwellSeconds}s. Telephony call logged: ${facts.callAttempted ? `${facts.callDurationSeconds}s` : 'None'}.`;
    policyExplanation = `Mandatory policy rules failed: Physical proximity and dwell requirements were breached.`;
    reviewFocus = 'Inspect driver GPS track history and verify physical proximity to customer premises.';
  } else {
    // REVIEW
    if (!facts.gpsAccuracyHighConfidence) reviewReasons.push(`GPS horizontal uncertainty was degraded (±${facts.gpsAccuracyMeters}m)`);
    if (!facts.dwellSatisfied) reviewReasons.push(`dwell time (${facts.dwellSeconds}s) was below category requirement (${facts.requiredDwellSeconds}s)`);
    if (facts.callDurationSeconds < 8) reviewReasons.push(`call duration was short (${facts.callDurationSeconds}s)`);
    if (facts.videoEvidence) reviewReasons.push('customer absence video proof requires visual supervisor sign-off');

    summary = `The delivery attempt requires manual review because the available evidence is incomplete, inconsistent, or ambiguous (${reviewReasons.join('; ')}).`;
    evidenceExplanation = `The recorded location was approximately ${facts.distanceMeters} meters from the destination. GPS accuracy was ${facts.gpsAccuracyMeters} meters.`;
    policyExplanation = `The required dwell time was ${facts.requiredDwellSeconds} seconds, but ${facts.dwellSeconds} seconds were recorded.`;
    reviewFocus = facts.videoEvidence
      ? 'Review the uploaded doorstep video proof in the console to confirm customer absence.'
      : 'Review the GPS telemetry, dwell duration, and call evidence.';
  }

  const supervisorSummary = decision === 'VERIFIED'
    ? `All conditions met: ≤${facts.requiredDistanceMeters}m geofence, ≥${facts.requiredDwellSeconds}s dwell, and valid customer call. Verified for delivery SLA credit.`
    : decision === 'REJECTED'
    ? `Attempt rejected by rule engine (${facts.distanceMeters}m distance, ${facts.dwellSeconds}s dwell). Non-compliant attempt.`
    : `Manual review required (${reviewReasons ? reviewReasons.join(', ') : 'telemetry ambiguity'}). Awaiting supervisor sign-off.`;

  const evidenceSummary = `Distance: ${facts.distanceMeters}m | Dwell: ${facts.dwellSeconds}s/${facts.requiredDwellSeconds}s | Call: ${facts.callAttempted ? `${facts.callDurationSeconds}s` : 'None'} | GPS: ±${facts.gpsAccuracyMeters}m`;

  return {
    summary,
    evidenceExplanation,
    policyExplanation,
    reviewFocus,
    explanationConfidence: 'high',
    explanation: summary, // alias for backward compatibility
    evidenceSummary,
    supervisorSummary,
    recommendedFocus: reviewFocus,
    source: 'deterministic-fallback',
    modelUsed: null,
    sanitizedInput: sanitized
  };
}

/**
 * Calls the configured Open-Source AI API to generate an explanatory breakdown.
 * If anything fails or times out, seamlessly falls back to the deterministic generator.
 */
async function generateVerificationExplanation(facts, decision, residenceCategory) {
  const sanitized = sanitizeVerificationInput(facts, decision, residenceCategory);

  const apiKey = process.env.OPEN_SOURCE_AI_API_KEY || process.env.AI_API_KEY;
  const baseUrl = (process.env.OPEN_SOURCE_AI_BASE_URL || process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
  const model = process.env.OPEN_SOURCE_AI_MODEL || process.env.AI_MODEL || 'llama-3.1-8b-instant';

  // If no API key configured, return deterministic fallback immediately
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_KEY_HERE') {
    return generateDeterministicFallback(sanitized);
  }

  const systemPrompt = `You are Saboot's Verification Explanation Assistant. Saboot is a zero-trust delivery attempt verification system. You do NOT make verification decisions. The decision supplied to you has already been determined by Saboot's deterministic verification policy. Your only responsibility is to explain the supplied evidence and the already-established decision. Allowed decisions are: VERIFIED REJECTED REVIEW Never change, override, reinterpret, or recommend changing the decision. Never invent evidence. Never invent GPS coordinates. Never invent call records. Never claim video evidence exists unless the input explicitly states that it exists. Never claim customer consent unless the input explicitly states that consent was recorded. Never infer malicious intent. Never accuse the driver of fraud. Explain: 1. What evidence was collected. 2. Which policy conditions passed. 3. Which conditions failed. 4. Which conditions were ambiguous. 5. Why the existing deterministic decision follows from the supplied facts. Keep the explanation concise and suitable for a delivery operations supervisor. Return structured JSON only matching this schema:
{
  "summary": "<1-2 sentence overall explanation of why the attempt resulted in the established decision>",
  "evidenceExplanation": "<1-2 sentences detailing physical location, GPS accuracy, and telephony evidence>",
  "policyExplanation": "<1-2 sentences detailing dwell time vs category threshold and rule checks>",
  "reviewFocus": "<Specific evidence items for supervisor to inspect if REVIEW, or null if VERIFIED/REJECTED>",
  "explanationConfidence": "high"
}`;

  const userPrompt = `Evaluation Input:
${JSON.stringify(sanitized, null, 2)}

Produce the JSON explanation for decision: ${sanitized.decision}.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second strict cutoff

    const endpoint = `${baseUrl}/chat/completions`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      // Non-200 response -> fallback
      return generateDeterministicFallback(sanitized);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      return generateDeterministicFallback(sanitized);
    }

    // Parse AI output
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    // Safety guard: ensure required fields exist
    const summary = parsed.summary || parsed.explanation;
    if (!summary || typeof summary !== 'string') {
      return generateDeterministicFallback(sanitized);
    }

    const evidenceSummary = `Distance: ${sanitized.facts.distanceMeters}m | Dwell: ${sanitized.facts.dwellSeconds}s/${sanitized.facts.requiredDwellSeconds}s | Call: ${sanitized.facts.callAttempted ? `${sanitized.facts.callDurationSeconds}s` : 'None'} | GPS: ±${sanitized.facts.gpsAccuracyMeters}m`;

    return {
      summary: summary.trim(),
      evidenceExplanation: (parsed.evidenceExplanation || `Distance: ${sanitized.facts.distanceMeters}m, GPS accuracy: ±${sanitized.facts.gpsAccuracyMeters}m.`).trim(),
      policyExplanation: (parsed.policyExplanation || `Dwell duration: ${sanitized.facts.dwellSeconds}s / ${sanitized.facts.requiredDwellSeconds}s required.`).trim(),
      reviewFocus: sanitized.decision === 'REVIEW' ? (parsed.reviewFocus || parsed.recommendedFocus || 'Review GPS telemetry and dwell duration').trim() : null,
      explanationConfidence: parsed.explanationConfidence || 'high',
      explanation: summary.trim(), // alias
      evidenceSummary,
      supervisorSummary: summary.trim(),
      recommendedFocus: sanitized.decision === 'REVIEW' ? (parsed.reviewFocus || parsed.recommendedFocus || 'Review GPS telemetry and dwell duration').trim() : null,
      source: 'open-source-ai',
      modelUsed: model,
      sanitizedInput: sanitized
    };
  } catch (err) {
    // Network error, timeout, or aborted -> fallback safely
    return generateDeterministicFallback(sanitized);
  }
}

module.exports = {
  generateVerificationExplanation,
  generateAiExplanation: generateVerificationExplanation, // Backward compatibility alias
  generateDeterministicFallback,
  sanitizeVerificationInput,
};
