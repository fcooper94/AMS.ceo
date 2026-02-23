/**
 * Marketing channel definitions.
 * baseWeeklyCost is in 2024 USD — multiply by eraMultiplier at runtime.
 * demandBoost is the percentage boost to passenger load factor (e.g. 3.0 = +3%).
 * availableFrom is the first real-world year this medium was commercially usable.
 */
module.exports = {
  flyers: {
    name: 'Flyers & Newspapers',
    description: 'Print flyers and newspaper ads distributed locally and at airports.',
    availableFrom: 1920,
    baseWeeklyCost: 200,
    demandBoost: 1.0,
    icon: '📰'
  },
  billboards: {
    name: 'Billboards',
    description: 'Large-format outdoor advertising at major roads and airports.',
    availableFrom: 1925,
    baseWeeklyCost: 800,
    demandBoost: 2.0,
    icon: '🪧'
  },
  radio: {
    name: 'Radio',
    description: 'Broadcast advertising on local and national radio stations.',
    availableFrom: 1930,
    baseWeeklyCost: 1200,
    demandBoost: 3.0,
    icon: '📻'
  },
  directMail: {
    name: 'Direct Mail',
    description: 'Targeted mail campaigns to frequent travellers and corporate accounts.',
    availableFrom: 1935,
    baseWeeklyCost: 600,
    demandBoost: 1.5,
    icon: '✉️'
  },
  magazine: {
    name: 'Magazine Ads',
    description: 'Full-page ads in travel, business, and lifestyle magazines.',
    availableFrom: 1940,
    baseWeeklyCost: 1000,
    demandBoost: 2.0,
    icon: '📖'
  },
  travelAgency: {
    name: 'Travel Agency Partners',
    description: 'Commission-based partnerships with travel agencies for ticket referrals.',
    availableFrom: 1950,
    baseWeeklyCost: 1500,
    demandBoost: 4.0,
    icon: '🏢'
  },
  tv: {
    name: 'Television',
    description: 'High-reach TV commercials on national and regional channels.',
    availableFrom: 1955,
    baseWeeklyCost: 3500,
    demandBoost: 8.0,
    icon: '📺'
  },
  sponsorship: {
    name: 'Sponsorship & Events',
    description: 'Sponsor sports teams, concerts, and major public events.',
    availableFrom: 1960,
    baseWeeklyCost: 2000,
    demandBoost: 4.0,
    icon: '🏆'
  },
  loyaltyProg: {
    name: 'Loyalty Programme',
    description: 'Frequent flyer points scheme that drives repeat bookings.',
    availableFrom: 1981,
    baseWeeklyCost: 4000,
    demandBoost: 8.0,
    icon: '⭐'
  },
  onlineAds: {
    name: 'Online / Banner Ads',
    description: 'Display advertising on travel websites and search engines.',
    availableFrom: 1995,
    baseWeeklyCost: 1200,
    demandBoost: 3.0,
    icon: '🖥️'
  },
  emailMktg: {
    name: 'Email Marketing',
    description: 'Targeted email campaigns to past passengers and subscriber lists.',
    availableFrom: 1998,
    baseWeeklyCost: 400,
    demandBoost: 1.5,
    icon: '📧'
  },
  socialMedia: {
    name: 'Social Media',
    description: 'Paid campaigns on social platforms reaching millions of travellers.',
    availableFrom: 2005,
    baseWeeklyCost: 800,
    demandBoost: 4.0,
    icon: '📱'
  },
  influencer: {
    name: 'Influencer Marketing',
    description: 'Partner with travel influencers and content creators for organic reach.',
    availableFrom: 2010,
    baseWeeklyCost: 2000,
    demandBoost: 5.0,
    icon: '🌟'
  }
};

/**
 * Calculate the capped demand boost for a set of channel keys.
 * Raw boosts stack; diminishing returns above 20% (halved); hard cap ~30%.
 */
function calcCappedBoost(channelKeys) {
  const CHANNELS = module.exports;
  const raw = channelKeys.reduce((sum, k) => sum + (CHANNELS[k]?.demandBoost || 0), 0);
  if (raw <= 20) return raw;
  return 20 + (raw - 20) * 0.5;
}

module.exports.calcCappedBoost = calcCappedBoost;
