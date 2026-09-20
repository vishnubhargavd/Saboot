/**
 * Saboot Customer Verification Portal MVP
 * 
 * Generates the clean, evidence-oriented verification portal for customers
 * following Saboot's legitimate operational design language.
 */

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Returns clean human-readable flag explanation based on factual policy data
 */
function getFlagReason(delivery) {
  if (delivery.decisionReason && delivery.decisionReason.trim()) {
    return delivery.decisionReason;
  }

  const distance = typeof delivery.distanceMeters === 'number' ? delivery.distanceMeters : 999;
  const dwell = typeof delivery.dwellSeconds === 'number' ? delivery.dwellSeconds : 0;
  const reqDwell = typeof delivery.requiredDwellSeconds === 'number' ? delivery.requiredDwellSeconds : 120;
  const call = delivery.callAttempted;

  if (distance > 50) {
    return `Driver was recorded at ${distance}m from the delivery doorstep (geofence threshold: 50m).`;
  }
  if (dwell < reqDwell) {
    return `The recorded dwell time (${dwell}s) was below the required verification threshold (${reqDwell}s).`;
  }
  if (!call) {
    return 'No customer contact attempt was registered during the verification window.';
  }
  return 'Evidence profile requires supervisor review to confirm delivery legitimacy.';
}

/**
 * Formats status for the customer verification banner
 */
function getStatusBadge(delivery) {
  const status = (delivery.status || delivery.decision || 'REVIEW').toUpperCase();
  if (status === 'VERIFIED' || status === 'DELIVERED') {
    return {
      text: 'ATTEMPT VERIFIED',
      pillClass: 'badge-verified',
      icon: '✓'
    };
  }
  if (status === 'REJECTED') {
    return {
      text: 'ATTEMPT REJECTED',
      pillClass: 'badge-rejected',
      icon: '✕'
    };
  }
  return {
    text: 'UNDER REVIEW',
    pillClass: 'badge-review',
    icon: '●'
  };
}

/**
 * Generates the complete HTML document for a valid delivery
 */
function renderCustomerPortalHtml(delivery) {
  const badge = getStatusBadge(delivery);
  const flagReason = getFlagReason(delivery);
  const distance = typeof delivery.distanceMeters === 'number' ? delivery.distanceMeters : 38;
  const dwell = typeof delivery.dwellSeconds === 'number' ? delivery.dwellSeconds : 0;
  const reqDwell = typeof delivery.requiredDwellSeconds === 'number' ? delivery.requiredDwellSeconds : 120;
  const callAttempted = !!delivery.callAttempted;
  const callDuration = typeof delivery.callDuration === 'number' ? delivery.callDuration : (delivery.callDurationSeconds || 0);
  const hasVideoProof = !!(delivery.videoProofUri || delivery.videoFileName);
  
  const customerName = delivery.customer?.name || 'Customer';
  const customerResponse = delivery.customerResponse || null;
  const customerResponseAt = delivery.customerResponseAt ? new Date(delivery.customerResponseAt).toLocaleString() : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delivery Verification #${escapeHtml(delivery.id)} — Saboot</title>
  <style>
    :root {
      --primary: #D94A27;
      --primary-dark: #B83818;
      --slate-900: #0F172A;
      --slate-800: #1E293B;
      --slate-700: #334155;
      --slate-600: #475569;
      --slate-500: #64748B;
      --slate-200: #E2E8F0;
      --slate-100: #F1F5F9;
      --slate-50: #F8FAFC;
      --green-700: #15803D;
      --green-100: #DCFCE7;
      --green-50: #F0FDF4;
      --amber-700: #B45309;
      --amber-100: #FEF3C7;
      --amber-50: #FFFBEB;
      --red-700: #B91C1C;
      --red-100: #FEE2E2;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    body {
      background-color: var(--slate-50);
      color: var(--slate-900);
      line-height: 1.5;
      padding: 24px 16px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .portal-container {
      width: 100%;
      max-width: 540px;
      background: #FFFFFF;
      border: 1px solid var(--slate-200);
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
      overflow: hidden;
    }

    /* Top Brand Bar */
    .brand-header {
      background: #FFFFFF;
      border-bottom: 2px solid var(--primary);
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand-title {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-subtitle {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--slate-500);
    }

    /* Delivery Info Header */
    .delivery-summary-hero {
      padding: 24px;
      border-bottom: 1px solid var(--slate-200);
      background: #FFFFFF;
    }

    .order-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--slate-500);
      margin-bottom: 4px;
    }

    .order-id {
      font-size: 24px;
      font-weight: 900;
      color: var(--slate-900);
      letter-spacing: -0.5px;
      margin-bottom: 14px;
    }

    /* Status Badges */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }

    .badge-review {
      background: var(--amber-100);
      color: var(--amber-700);
      border: 1px solid #FDE68A;
    }

    .badge-verified {
      background: var(--green-100);
      color: var(--green-700);
      border: 1px solid #BBF7D0;
    }

    .badge-rejected {
      background: var(--red-100);
      color: var(--red-700);
      border: 1px solid #FECACA;
    }

    /* Section Cards */
    .section-card {
      padding: 20px 24px;
      border-bottom: 1px solid var(--slate-200);
    }

    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--slate-500);
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Fact Grid */
    .facts-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .fact-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--slate-100);
    }

    .fact-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .fact-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--slate-600);
    }

    .fact-value-box {
      text-align: right;
    }

    .fact-value-main {
      font-size: 13px;
      font-weight: 800;
      color: var(--slate-900);
    }

    .fact-value-sub {
      font-size: 11px;
      color: var(--slate-500);
      margin-top: 1px;
    }

    /* Flag Explanation Box */
    .flag-box {
      background: var(--amber-50);
      border: 1px solid #FDE68A;
      border-left: 4px solid var(--amber-700);
      border-radius: 4px;
      padding: 14px 16px;
      margin-top: 6px;
    }

    .flag-text {
      font-size: 13px;
      font-weight: 600;
      color: #78350F;
      line-height: 1.5;
    }

    /* Customer Response Interactive Section */
    .response-section {
      padding: 24px;
      background: #FAFAFA;
    }

    .question-prompt {
      font-size: 15px;
      font-weight: 800;
      color: var(--slate-900);
      margin-bottom: 8px;
    }

    .question-helper {
      font-size: 12px;
      color: var(--slate-600);
      margin-bottom: 16px;
      line-height: 1.4;
    }

    .btn-group {
      display: flex;
      gap: 12px;
      flex-direction: column;
    }

    @media (min-width: 480px) {
      .btn-group {
        flex-direction: row;
      }
    }

    .response-btn {
      flex: 1;
      padding: 14px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .btn-available {
      background: var(--green-700);
      color: #FFFFFF;
      border: 1px solid var(--green-700);
    }

    .btn-available:hover:not(:disabled) {
      background: #166534;
    }

    .btn-unavailable {
      background: #FFFFFF;
      color: var(--slate-800);
      border: 1.5px solid var(--slate-200);
    }

    .btn-unavailable:hover:not(:disabled) {
      background: var(--slate-100);
      border-color: var(--slate-500);
    }

    .response-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Response Recorded State */
    .recorded-card {
      background: var(--green-50);
      border: 1.5px solid #BBF7D0;
      border-radius: 6px;
      padding: 16px 18px;
    }

    .recorded-header {
      font-size: 13px;
      font-weight: 800;
      color: var(--green-700);
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }

    .recorded-value {
      font-size: 16px;
      font-weight: 900;
      color: var(--slate-900);
      margin-bottom: 6px;
    }

    .recorded-subtext {
      font-size: 11px;
      color: var(--slate-600);
      line-height: 1.4;
    }

    /* Footer */
    .portal-footer {
      padding: 18px 24px;
      text-align: center;
      font-size: 11px;
      color: var(--slate-500);
      background: #FFFFFF;
      border-top: 1px solid var(--slate-200);
    }

    .portal-footer strong {
      color: var(--slate-700);
    }
  </style>
</head>
<body>

  <div class="portal-container">
    <!-- Brand Header -->
    <header class="brand-header">
      <div class="brand-title">
        <span>🛡️</span>
        <span>SABOOT</span>
      </div>
      <div class="brand-subtitle">Delivery Verification</div>
    </header>

    <!-- Delivery Hero -->
    <div class="delivery-summary-hero">
      <div class="order-label">Recipient: ${escapeHtml(customerName)}</div>
      <div class="order-id">Delivery #${escapeHtml(delivery.id)}</div>
      <div>
        <span class="status-badge ${badge.pillClass}">
          <span>${badge.icon}</span>
          <span>${badge.text}</span>
        </span>
      </div>
    </div>

    <!-- Verification Details -->
    <section class="section-card">
      <div class="section-title">Verification Details</div>
      <div class="facts-grid">
        <div class="fact-row">
          <div class="fact-label">Location</div>
          <div class="fact-value-box">
            <div class="fact-value-main">${distance} m from doorstep</div>
            <div class="fact-value-sub">${distance <= 50 ? 'Inside 50m geofence' : 'Outside 50m geofence'}</div>
          </div>
        </div>

        <div class="fact-row">
          <div class="fact-label">Time at location</div>
          <div class="fact-value-box">
            <div class="fact-value-main">${dwell} sec</div>
            <div class="fact-value-sub">Required: ${reqDwell} sec</div>
          </div>
        </div>

        <div class="fact-row">
          <div class="fact-label">Customer call</div>
          <div class="fact-value-box">
            <div class="fact-value-main">${callAttempted ? 'Attempted' : 'Not Attempted'}</div>
            <div class="fact-value-sub">${callAttempted ? (callDuration + 's logged') : '0s'}</div>
          </div>
        </div>

        <div class="fact-row">
          <div class="fact-label">Evidence</div>
          <div class="fact-value-box">
            <div class="fact-value-main">${hasVideoProof ? 'Video Proof Recorded' : 'GPS Telemetry Recorded'}</div>
            <div class="fact-value-sub">Cryptographically signed</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Why was this attempt flagged? -->
    <section class="section-card">
      <div class="section-title">Why was this attempt flagged?</div>
      <div class="flag-box">
        <p class="flag-text">${escapeHtml(flagReason)}</p>
      </div>
    </section>

    <!-- Customer Confirmation -->
    <section class="response-section" id="customerResponseContainer">
      ${customerResponse ? `
        <div class="recorded-card">
          <div class="recorded-header">
            <span>✓</span>
            <span>Your response has been recorded</span>
          </div>
          <div class="recorded-value">
            ${customerResponse === 'CUSTOMER_AVAILABLE' ? 'I WAS AVAILABLE' : 'I WAS NOT AVAILABLE'}
          </div>
          <div class="recorded-subtext">
            Recorded at ${escapeHtml(customerResponseAt || 'recently')}.<br>
            Your response has been added as additional delivery verification evidence in the audit log.
          </div>
        </div>
      ` : `
        <div class="question-prompt">Were you available to receive this delivery?</div>
        <div class="question-helper">
          Please confirm your availability during the attempt window. Your response will be appended directly to the delivery audit record.
        </div>
        <div class="btn-group" id="responseButtonGroup">
          <button type="button" class="response-btn btn-available" id="btnAvailable" onclick="submitCustomerResponse('CUSTOMER_AVAILABLE')">
            ✓ I WAS AVAILABLE
          </button>
          <button type="button" class="response-btn btn-unavailable" id="btnUnavailable" onclick="submitCustomerResponse('CUSTOMER_UNAVAILABLE')">
            ✕ I WAS NOT AVAILABLE
          </button>
        </div>
        <div id="responseStatusMsg" style="margin-top: 12px; font-size: 12px; font-weight: 700; color: var(--slate-600); display: none;"></div>
      `}
    </section>

    <!-- Footer -->
    <footer class="portal-footer">
      <strong>Saboot Verification Platform</strong> • Independent Delivery Attestation & Audit Trail
    </footer>
  </div>

  <script>
    async function submitCustomerResponse(responseType) {
      const btnAvail = document.getElementById('btnAvailable');
      const btnUnavail = document.getElementById('btnUnavailable');
      const statusMsg = document.getElementById('responseStatusMsg');
      const container = document.getElementById('customerResponseContainer');

      if (btnAvail) btnAvail.disabled = true;
      if (btnUnavail) btnUnavail.disabled = true;
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.innerText = 'Transmitting verification response...';
      }

      try {
        const res = await fetch('/api/customer-verification/${encodeURIComponent(delivery.id)}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response: responseType })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          const choiceText = responseType === 'CUSTOMER_AVAILABLE' ? 'I WAS AVAILABLE' : 'I WAS NOT AVAILABLE';
          const timeText = data.recordedAt ? new Date(data.recordedAt).toLocaleString() : new Date().toLocaleString();

          container.innerHTML = \`
            <div class="recorded-card">
              <div class="recorded-header">
                <span>✓</span>
                <span>Your response has been recorded</span>
              </div>
              <div class="recorded-value">\${choiceText}</div>
              <div class="recorded-subtext">
                Recorded at \${timeText}.<br>
                Your response has been added as additional delivery verification evidence in the audit log.
              </div>
            </div>
          \`;
        } else {
          if (statusMsg) {
            statusMsg.innerText = 'Error: ' + (data.error || 'Failed to submit response.');
            statusMsg.style.color = '#B91C1C';
          }
          if (btnAvail) btnAvail.disabled = false;
          if (btnUnavail) btnUnavail.disabled = false;
        }
      } catch (err) {
        if (statusMsg) {
          statusMsg.innerText = 'Network error. Please try again.';
          statusMsg.style.color = '#B91C1C';
        }
        if (btnAvail) btnAvail.disabled = false;
        if (btnUnavail) btnUnavail.disabled = false;
      }
    }
  </script>
</body>
</html>`;
}

/**
 * Generates 404 HTML for missing delivery
 */
function renderCustomerNotFoundHtml(deliveryId) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delivery Not Found — Saboot</title>
  <style>
    body {
      background: #F8FAFC;
      color: #0F172A;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      padding: 32px 24px;
      max-width: 440px;
      width: 100%;
    }
    .logo {
      font-size: 16px;
      font-weight: 900;
      color: #D94A27;
      letter-spacing: 1.5px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 8px;
    }
    p {
      font-size: 14px;
      color: #64748B;
      line-height: 1.5;
    }
    .id-tag {
      font-family: monospace;
      font-weight: 700;
      background: #F1F5F9;
      padding: 2px 6px;
      border-radius: 4px;
      color: #0F172A;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🛡️ SABOOT</div>
    <h1>Delivery Not Found</h1>
    <p>We could not find delivery <span class="id-tag">${escapeHtml(deliveryId || 'ID')}</span> in our active verification records. Please verify the URL or contact logistics dispatch.</p>
  </div>
</body>
</html>`;
}

module.exports = {
  renderCustomerPortalHtml,
  renderCustomerNotFoundHtml,
  getFlagReason,
  getStatusBadge
};
