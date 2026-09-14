// This runs on Vercel's server, never in the customer's browser.
// Uses the same Resend API key already set up for quote requests (RESEND_API_KEY).

const { Resend } = require('resend');

// Where new-order notifications should land.
const ORDER_RECIPIENT = 'sales@1sparepart.com';

// Verified sender domain (same as send-quote.js).
const FROM_ADDRESS = 'OneSparePart Website <orders@1sparepart.com>';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Don't fail the customer's order over this — just log it and move on.
    console.error('RESEND_API_KEY not set — skipping order notification email.');
    res.status(200).json({ success: false, skipped: true });
    return;
  }

  try {
    const { paymentMethod, poNumber, total, orderDetails } = req.body || {};

    const itemsHtml = (orderDetails?.items || [])
      .map(i => `<li>${i.qty} × ${escapeHtml(i.name)} (${escapeHtml(i.sku)}) — $${(i.price * i.qty).toFixed(2)}</li>`)
      .join('');

    // Optional fields: only render a line when the value is actually present,
    // so old orders (or fields the customer left blank) never show undefined/null.
    const optionalLine = (label, value) =>
      value && String(value).trim() ? `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>` : '';

    // Shipping address: build only from whichever of address/city/state are present.
    // Backward-compatible with older orders that may not have these fields at all.
    const addressLines = [orderDetails?.address, orderDetails?.city, orderDetails?.state]
      .filter(v => v && String(v).trim())
      .map(v => escapeHtml(v))
      .join('<br>');
    const shippingBlock = addressLines
      ? `<p><strong>Shipping Address:</strong><br>${addressLines}</p>`
      : '';

    const html = `
      <h2>New order — 1sparepart.com</h2>
      <p><strong>Payment method:</strong> ${paymentMethod === 'po' ? 'Purchase Order / Net-30' : 'Credit card (charged via Stripe)'}</p>
      ${poNumber ? `<p><strong>Purchase Order #:</strong> ${escapeHtml(poNumber)}</p>` : ''}
      <p><strong>Company:</strong> ${escapeHtml(orderDetails?.company) || '(not provided)'}</p>
      <p><strong>Contact:</strong> ${escapeHtml(orderDetails?.contact) || '(not provided)'}</p>
      ${optionalLine('Title / Role', orderDetails?.title)}
      <p><strong>Email:</strong> ${escapeHtml(orderDetails?.email) || '(not provided)'}</p>
      ${optionalLine('Phone', orderDetails?.phone)}
      ${shippingBlock}
      <p><strong>Items:</strong></p>
      <ul>${itemsHtml}</ul>
      <p><strong>Total: $${Number(total).toFixed(2)}</strong></p>
    `;

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [ORDER_RECIPIENT],
      replyTo: orderDetails?.email || undefined,
      subject: `New order${orderDetails?.company ? ' — ' + orderDetails.company : ''} — $${Number(total).toFixed(2)}`,
      html,
    });

    if (error) {
      throw new Error(error.message || 'Resend could not send the order notification.');
    }

    res.status(200).json({ success: true });
  } catch (err) {
    // Same principle: log it, but don't block the customer's order confirmation over this.
    console.error('Order notification email error:', err);
    res.status(200).json({ success: false, error: err.message });
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
