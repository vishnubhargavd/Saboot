/**
 * Saboot Transactional Customer Email Template
 * 
 * Strict Zero-Trust Delivery Attestation Guidelines:
 * - Clean, professional, neutral styling matching Saboot portal
 * - Provides both HTML and Plain-Text representations
 * - Exposes ONLY public delivery identification & verification URL
 * - Strictly NO AI terminology, NO chatbot phrasing, NO internal operational telemetry (GPS, dwell, distance)
 */

function generateCustomerVerificationEmail({ customerName, deliveryId, trackingNumber, packageDescription, verificationUrl }) {
  const safeName = customerName || 'Customer';
  const safeTracking = trackingNumber || deliveryId;
  const safeUrl = verificationUrl;

  const subject = 'Saboot — Delivery Confirmation Required';

  const text = `Saboot — Delivery Confirmation Required

Hello ${safeName},

Your delivery requires confirmation.

Please confirm whether you received your package.

Tracking Number: ${safeTracking}
${packageDescription ? `Package: ${packageDescription}\n` : ''}
Verify your delivery:
${safeUrl}

This link is specific to your delivery.

Saboot Delivery Attestation
`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 560px;
      margin: 40px auto;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header {
      background-color: #0F172A;
      padding: 24px 32px;
      text-align: left;
    }
    .header-logo {
      color: #FFFFFF;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin: 0;
    }
    .header-sub {
      color: #94A3B8;
      font-size: 11px;
      letter-spacing: 0.5px;
      margin-top: 4px;
      text-transform: uppercase;
    }
    .content {
      padding: 32px;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #0F172A;
      margin: 0 0 16px;
      line-height: 1.3;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
      margin: 0 0 16px;
    }
    .order-box {
      background-color: #F1F5F9;
      border-left: 3px solid #0F172A;
      padding: 12px 16px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    .order-box-row {
      font-size: 12px;
      color: #475569;
      margin: 4px 0;
    }
    .order-box-row strong {
      color: #0F172A;
    }
    .btn-container {
      margin: 28px 0;
      text-align: left;
    }
    .btn-verify {
      display: inline-block;
      background-color: #0F172A;
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      padding: 12px 28px;
      border-radius: 6px;
      letter-spacing: 0.3px;
    }
    .footer-note {
      font-size: 12px;
      color: #64748B;
      line-height: 1.5;
      border-top: 1px solid #E2E8F0;
      padding-top: 20px;
      margin-top: 28px;
    }
    .link-fallback {
      font-size: 11px;
      color: #64748B;
      word-break: break-all;
      margin-top: 8px;
    }
    .footer-brand {
      background-color: #F8FAFC;
      padding: 16px 32px;
      text-align: center;
      border-top: 1px solid #E2E8F0;
      font-size: 11px;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">Saboot</div>
      <div class="header-sub">Delivery Attestation</div>
    </div>
    <div class="content">
      <h1>Delivery Confirmation Required</h1>
      <p>Hello ${escapeHtml(safeName)},</p>
      <p>Your delivery requires confirmation. Please confirm whether you received your package.</p>
      
      <div class="order-box">
        <div class="order-box-row"><strong>Tracking #:</strong> ${escapeHtml(safeTracking)}</div>
        ${packageDescription ? `<div class="order-box-row"><strong>Item:</strong> ${escapeHtml(packageDescription)}</div>` : ''}
      </div>

      <div class="btn-container">
        <a href="${safeUrl}" class="btn-verify" target="_blank" rel="noopener noreferrer">Verify Delivery</a>
      </div>

      <div class="footer-note">
        This link is specific to your delivery and allows you to confirm package receipt directly.
        <div class="link-fallback">If the button above does not work, copy and paste this URL into your browser:<br><a href="${safeUrl}" style="color: #2563EB;">${safeUrl}</a></div>
      </div>
    </div>
    <div class="footer-brand">
      &copy; ${new Date().getFullYear()} Saboot. Secure Zero-Trust Delivery Attestation.
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  generateCustomerVerificationEmail,
  escapeHtml
};
