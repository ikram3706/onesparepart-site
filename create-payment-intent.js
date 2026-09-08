// This runs on Vercel's server, never in the customer's browser.
// The Stripe Secret Key is read from an environment variable (STRIPE_SECRET_KEY)
// that your client sets in the Vercel dashboard — it is never present in any file here.

const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    res.status(500).json({
      success: false,
      error: 'Server is not configured with a Stripe secret key yet.',
    });
    return;
  }

  try {
    const { amount, orderDetails } = req.body || {};

    if (!amount || amount <= 0) {
      res.status(400).json({ success: false, error: 'Missing or invalid order amount.' });
      return;
    }

    const stripe = new Stripe(secretKey);

    const paymentIntent = await stripe.paymentIntents.create({
      amount, // amount in cents
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      description: orderDetails
        ? `Order for ${orderDetails.company || 'customer'} — ${
            orderDetails.items?.length || 0
          } item(s)`
        : undefined,
      metadata: orderDetails
        ? {
            company: orderDetails.company || '',
            contact: orderDetails.contact || '',
            email: orderDetails.email || '',
          }
        : undefined,
    });

    res.status(200).json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe payment intent error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Payment could not be started.',
    });
  }
};
