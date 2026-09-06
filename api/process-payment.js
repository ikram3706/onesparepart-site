// This runs on Vercel's server, never in the customer's browser.
// The Square Access Token is read from an environment variable (SQUARE_ACCESS_TOKEN)
// that you set in the Vercel dashboard — it is never present in any file here.

const { SquareClient, SquareEnvironment } = require('square');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID || 'LDRTW18JCYVAV';
  const environment =
    process.env.SQUARE_ENV === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;

  if (!accessToken) {
    res.status(500).json({
      success: false,
      error: 'Server is not configured with a Square access token yet.',
    });
    return;
  }

  try {
    const { sourceId, amount, orderDetails } = req.body || {};

    if (!sourceId || !amount || amount <= 0) {
      res.status(400).json({ success: false, error: 'Missing or invalid payment details.' });
      return;
    }

    const client = new SquareClient({ token: accessToken, environment });

    const response = await client.payments.create({
      sourceId,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: BigInt(amount), // amount in cents
        currency: 'USD',
      },
      locationId,
      note: orderDetails
        ? `Order for ${orderDetails.company || 'customer'} — ${
            orderDetails.items?.length || 0
          } item(s)`
        : undefined,
    });

    // BigInt values from the Square SDK can't be JSON.stringify'd directly.
    const safePayment = JSON.parse(
      JSON.stringify(response.payment, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    res.status(200).json({ success: true, payment: safePayment });
  } catch (err) {
    console.error('Square payment error:', err);
    const message =
      err?.errors?.[0]?.detail || err?.message || 'Payment could not be processed.';
    res.status(500).json({ success: false, error: message });
  }
};
