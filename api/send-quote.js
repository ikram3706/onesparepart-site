// This runs on Vercel's server, never in the customer's browser.
// The Resend API key is read from an environment variable (RESEND_API_KEY)
// that you set in the Vercel dashboard — it is never present in any file here.

const { Resend } = require('resend');

// Where quote requests should land. Change this to whatever inbox you want them going to.
const QUOTE_RECIPIENT = 'sales@1sparepart.com';

// The "from" address Resend sends as. 1sparepart.com is verified in Resend,
// so mail sends from this domain directly instead of the shared test sender.
const FROM_ADDRESS = 'OneSparePart Website <quotes@1sparepart.com>';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    res.status(500).json({
      success: false,
      error: 'Server is not configured with a Resend API key yet.',
    });
    return;
  }

  try {
    const { company, contact, email, details } = req.body || {};

    if (!details || !String(details).trim()) {
      res.status(400).json({ success: false, error: 'Please describe what you need.' });
      return;
    }

    const resend = new Resend(apiKey);

    const html = `
      <h2>New quote request from 1sparepart.com</h2>
      <p><strong>Company:</strong> ${escapeHtml(company) || '(not provided)'}</p>
      <p><strong>Contact:</strong> ${escapeHtml(contact) || '(not provided)'}</p>
      <p><strong>Email:</strong> ${escapeHtml(email) || '(not provided)'}</p>
      <p><strong>What they need:</strong></p>
      <p>${escapeHtml(details).replace(/\n/g, '<br>')}</p>
    `;

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [QUOTE_RECIPIENT],
      replyTo: email && String(email).trim() ? email : undefined,
      subject: `Quote request${company ? ' — ' + company : ''}`,
      html,
    });

    if (error) {
      throw new Error(error.message || 'Resend could not send the email.');
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Quote email error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Quote request could not be sent.',
    });
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
