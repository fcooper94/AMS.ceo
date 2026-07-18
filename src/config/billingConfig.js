// Credit-pack catalogue and Stripe helpers. Single source of truth for what we
// sell — the pricing page and the checkout both read from here.
//
// Pricing is sold as *value/time*, not "£ per credit": credits are consumed at
// (typically) 1 credit per game week per airline, so N credits ≈ N game weeks
// of running an airline. Copy below reflects that; tweak freely.

const GAME_WEEKS_PER_CREDIT = 1; // 1 credit ≈ 1 game week of an active airline

// Rough human-friendly time phrase for a credit amount.
function timeValue(credits) {
  const weeks = credits * GAME_WEEKS_PER_CREDIT;
  if (weeks >= 52) {
    const years = Math.round((weeks / 52) * 10) / 10;
    return `Around ${years} year${years === 1 ? '' : 's'} of airline operations`;
  }
  if (weeks >= 8) {
    const months = Math.round(weeks / 4.34);
    return `Around ${months} months of airline operations`;
  }
  return `Around ${weeks} weeks of airline operations`;
}

// One-time credit packs. `price` is in whole pence (GBP) for Stripe. `saving` is
// the % cheaper per credit vs the Starter pack (shown as a badge).
const CREDIT_PACKS = [
  {
    id: 'starter',  name: 'Starter',      credits: 10,  price: 599,  currency: 'gbp',
    badge: null,            saving: 0,
    blurb: "Perfect if you're just getting started."
  },
  {
    id: 'popular',  name: 'Most Popular', credits: 25,  price: 1349, currency: 'gbp',
    badge: 'Most Popular',  highlight: true, saving: 10,
    blurb: 'Play for months without worrying about credits.'
  },
  {
    id: 'value',    name: 'Best Value',   credits: 50,  price: 2499, currency: 'gbp',
    badge: 'Best Value',    saving: 17,
    blurb: 'For dedicated airline CEOs.'
  },
  {
    id: 'ultimate', name: 'Ultimate',     credits: 100, price: 4499, currency: 'gbp',
    badge: 'Ultimate',      saving: 25,
    blurb: 'The best value — the lowest price per credit.'
  }
];

function getPack(id) {
  return CREDIT_PACKS.find(p => p.id === id) || null;
}

// Value bullets shown on each card (time first — the thing players understand).
function packBullets(pack) {
  return [
    timeValue(pack.credits),
    'Credits never expire',
    'Instantly added to your account'
  ];
}

// Public (client-safe) view of a pack — no internal-only fields.
function serialisePack(p) {
  return {
    id: p.id, name: p.name, credits: p.credits,
    price: p.price, currency: p.currency,
    priceDisplay: '£' + (p.price / 100).toFixed(2),
    badge: p.badge, highlight: !!p.highlight, saving: p.saving,
    blurb: p.blurb, bullets: packBullets(p)
  };
}

// Lazily-constructed Stripe client (null until keys are configured, so the app
// boots fine without billing enabled).
let _stripe = null;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

module.exports = {
  CREDIT_PACKS, getPack, serialisePack, packBullets, timeValue,
  getStripe,
  isBillingEnabled: () => !!process.env.STRIPE_SECRET_KEY
};
