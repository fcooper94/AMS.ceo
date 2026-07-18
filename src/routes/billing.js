const express = require('express');
const router = express.Router();
const { User, Payment } = require('../models');
const { CREDIT_PACKS, getPack, serialisePack, getStripe, isBillingEnabled } = require('../config/billingConfig');

async function currentUser(req) {
  if (!req.user) return null;
  return User.findOne({ where: { vatsimId: req.user.vatsimId } });
}

// Pack catalogue + whether payments are wired up (keys present).
router.get('/packs', (req, res) => {
  res.json({ enabled: isBillingEnabled(), packs: CREDIT_PACKS.map(serialisePack) });
});

// GBP-based FX rates for the display-only currency dropdown on the credits page.
// (All charges are still in GBP — this is a convenience conversion only.)
let _fxCache = null; // { ts, rates }
const FX_CURRENCIES = ['GBP', 'USD', 'EUR', 'AUD', 'CAD', 'NZD', 'JPY', 'CHF', 'SEK', 'ZAR', 'INR', 'BRL'];
const FX_FALLBACK = { GBP: 1, USD: 1.27, EUR: 1.17, AUD: 1.93, CAD: 1.73, NZD: 2.10, JPY: 190, CHF: 1.12, SEK: 13.4, ZAR: 23.5, INR: 106, BRL: 7.0 };
router.get('/fx', async (req, res) => {
  try {
    if (_fxCache && Date.now() - _fxCache.ts < 6 * 3600 * 1000) {
      return res.json({ base: 'GBP', rates: _fxCache.rates });
    }
    let rates = { ...FX_FALLBACK };
    try {
      const r = await fetch('https://open.er-api.com/v6/latest/GBP');
      if (r.ok) {
        const d = await r.json();
        if (d && d.rates) for (const c of FX_CURRENCIES) rates[c] = d.rates[c] || FX_FALLBACK[c];
      }
    } catch (e) { /* keep fallback */ }
    _fxCache = { ts: Date.now(), rates };
    res.json({ base: 'GBP', rates });
  } catch (e) {
    res.json({ base: 'GBP', rates: FX_FALLBACK });
  }
});

// Start a Stripe Checkout for a pack — returns the hosted checkout URL.
router.post('/checkout', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Payments are not available yet.' });

    const pack = getPack(req.body && req.body.packId);
    if (!pack) return res.status(400).json({ error: 'Unknown credit pack' });

    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const base = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: pack.currency,
          unit_amount: pack.price,
          product_data: {
            name: `${pack.credits} Credits — ${pack.name}`,
            description: pack.blurb
          }
        }
      }],
      client_reference_id: user.id,
      customer_email: user.email || undefined,
      metadata: { userId: user.id, packId: pack.id, credits: String(pack.credits) },
      // One-time payments don't auto-invoice; ask Stripe to generate one.
      invoice_creation: { enabled: true },
      success_url: `${base}/credits?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/credits?billing=cancelled`
    });

    // Record a pending purchase; the webhook flips it to paid + grants credits.
    await Payment.create({
      userId: user.id, packId: pack.id, credits: pack.credits,
      amount: pack.price, currency: pack.currency,
      status: 'pending', stripeSessionId: session.id
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[billing] checkout failed:', err.message);
    res.status(500).json({ error: 'Could not start checkout' });
  }
});

// The signed-in user's purchase history (with invoice/receipt links).
router.get('/history', async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    const payments = await Payment.findAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json(payments.map(p => ({
      id: p.id, packId: p.packId, credits: p.credits,
      amount: p.amount, currency: p.currency, status: p.status,
      invoiceUrl: p.invoiceUrl, receiptUrl: p.receiptUrl,
      date: p.createdAt
    })));
  } catch (err) {
    console.error('[billing] history failed:', err.message);
    res.status(500).json({ error: 'Could not load history' });
  }
});

module.exports = router;
