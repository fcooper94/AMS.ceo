// Stripe webhook handler. Mounted in server.js with express.raw() BEFORE the
// global express.json(), because signature verification needs the raw body.
const { User, Payment } = require('../models');
const { getStripe } = require('../config/billingConfig');

module.exports = async function stripeWebhook(req, res) {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).end();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // Buffer, thanks to express.raw()
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[billing] webhook signature check failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await fulfil(stripe, event.data.object);
    }
  } catch (err) {
    console.error('[billing] webhook handling error:', err.message);
    return res.status(500).end(); // let Stripe retry (fulfilment is idempotent)
  }
  res.json({ received: true });
};

// Grant credits + record invoice/receipt for a completed checkout. Idempotent:
// a session is only ever fulfilled once.
async function fulfil(stripe, session) {
  if (session.payment_status !== 'paid') return;

  const payment = await Payment.findOne({ where: { stripeSessionId: session.id } });
  if (payment && payment.status === 'paid') return; // already fulfilled

  const credits = payment ? payment.credits : parseInt(session.metadata?.credits || '0', 10);
  const userId = payment ? payment.userId : session.metadata?.userId;

  // Best-effort invoice + receipt URLs.
  let invoiceUrl = null, receiptUrl = null;
  try {
    if (session.invoice) {
      const inv = await stripe.invoices.retrieve(session.invoice);
      invoiceUrl = inv.hosted_invoice_url || inv.invoice_pdf || null;
    }
  } catch (e) { /* non-critical */ }
  try {
    if (session.payment_intent) {
      const pi = await stripe.paymentIntents.retrieve(session.payment_intent, { expand: ['latest_charge'] });
      receiptUrl = pi.latest_charge?.receipt_url || null;
    }
  } catch (e) { /* non-critical */ }

  // Grant the credits to the account-wide balance.
  if (userId && credits > 0) {
    const user = await User.findByPk(userId);
    if (user) { user.credits = (user.credits || 0) + credits; await user.save(); }
  }

  if (payment) {
    payment.status = 'paid';
    payment.stripePaymentIntent = session.payment_intent || null;
    payment.invoiceUrl = invoiceUrl;
    payment.receiptUrl = receiptUrl;
    await payment.save();
  } else if (userId) {
    await Payment.create({
      userId, packId: session.metadata?.packId || 'unknown', credits,
      amount: session.amount_total || 0, currency: session.currency || 'gbp',
      status: 'paid', stripeSessionId: session.id,
      stripePaymentIntent: session.payment_intent || null,
      invoiceUrl, receiptUrl
    });
  }

  console.log(`[billing] fulfilled ${credits} credits for user ${userId} (session ${session.id})`);
}
