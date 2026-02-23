/**
 * Audience reach levels — cost multipliers applied on top of baseWeeklyCost.
 */
const AUDIENCE_LEVELS = {
  local:       { label: 'Local',       icon: '🏙️', costMultiplier: 1.0,  boostMultiplier: 1.0, description: 'City & metro area' },
  national:    { label: 'National',    icon: '🗺️', costMultiplier: 2.5,  boostMultiplier: 1.2, description: 'Country-wide reach' },
  continental: { label: 'Continental', icon: '🌍', costMultiplier: 6.5,  boostMultiplier: 1.6, description: 'Multi-country reach' },
  worldwide:   { label: 'Worldwide',   icon: '🌐', costMultiplier: 16.0, boostMultiplier: 2.2, description: 'Global campaign' }
};

/**
 * Marketing channel definitions.
 * baseWeeklyCost is in 2024 USD at LOCAL audience — multiply by eraMultiplier
 * and audienceMultiplier at runtime.
 * demandBoost is the default/fallback boost percentage.
 * boostByEra is an array of [yearFrom, boost] pairs — effectiveness varies by era.
 *   Pick the entry with the highest yearFrom <= gameYear.
 * availableFrom is the first year this medium was commercially usable.
 * audiences lists which reach levels are available for this channel.
 */
const CHANNELS = {
  flyers: {
    name: 'Flyers & Newspapers',
    description: 'Print flyers and newspaper ads distributed locally and at airports.',
    availableFrom: 1920,
    baseWeeklyCost: 200,
    demandBoost: 1.0,
    icon: '📰',
    audiences: ['local', 'national'],
    boostByEra: [[1920, 1.2], [1970, 1.0], [1990, 0.6], [2005, 0.3], [2015, 0.15]]
  },
  billboards: {
    name: 'Billboards',
    description: 'Large-format outdoor advertising at major roads and airports.',
    availableFrom: 1925,
    baseWeeklyCost: 800,
    demandBoost: 2.0,
    icon: '🪧',
    audiences: ['local', 'national'],
    boostByEra: [[1925, 2.0], [2005, 1.8], [2015, 1.4]]
  },
  radio: {
    name: 'Radio',
    description: 'Broadcast advertising on local and national radio stations.',
    availableFrom: 1930,
    baseWeeklyCost: 1200,
    demandBoost: 3.0,
    icon: '📻',
    audiences: ['local', 'national', 'continental'],
    boostByEra: [[1930, 2.5], [1950, 3.0], [1975, 2.5], [1995, 2.0], [2010, 1.5], [2020, 1.0]]
  },
  directMail: {
    name: 'Direct Mail',
    description: 'Targeted mail campaigns to frequent travellers and corporate accounts.',
    availableFrom: 1935,
    baseWeeklyCost: 600,
    demandBoost: 1.5,
    icon: '✉️',
    audiences: ['local', 'national'],
    boostByEra: [[1935, 1.5], [1990, 1.3], [2000, 1.0], [2010, 0.6], [2020, 0.3]]
  },
  magazine: {
    name: 'Magazine Ads',
    description: 'Full-page ads in travel, business, and lifestyle magazines.',
    availableFrom: 1940,
    baseWeeklyCost: 1000,
    demandBoost: 2.0,
    icon: '📖',
    audiences: ['national', 'continental'],
    boostByEra: [[1940, 2.0], [1980, 2.2], [2000, 1.5], [2010, 0.8], [2020, 0.4]]
  },
  travelAgency: {
    name: 'Travel Agency Partners',
    description: 'Commission-based partnerships with travel agencies for ticket referrals.',
    availableFrom: 1950,
    baseWeeklyCost: 1500,
    demandBoost: 4.0,
    icon: '🏢',
    audiences: ['national', 'continental', 'worldwide'],
    boostByEra: [[1950, 3.5], [1965, 5.0], [1980, 6.0], [1995, 4.0], [2005, 2.0], [2015, 0.8]]
  },
  tv: {
    name: 'Television',
    description: 'High-reach TV commercials on national and regional channels.',
    availableFrom: 1955,
    baseWeeklyCost: 3500,
    demandBoost: 8.0,
    icon: '📺',
    audiences: ['national', 'continental', 'worldwide'],
    boostByEra: [[1955, 5.5], [1975, 8.0], [1990, 8.0], [2010, 6.0], [2020, 4.5]]
  },
  sponsorship: {
    name: 'Sponsorship & Events',
    description: 'Sponsor sports teams, concerts, and major public events.',
    availableFrom: 1960,
    baseWeeklyCost: 2000,
    demandBoost: 4.0,
    icon: '🏆',
    audiences: ['local', 'national', 'continental', 'worldwide'],
    boostByEra: [[1960, 3.5], [1990, 4.0], [2010, 5.0], [2020, 5.5]]
  },
  loyaltyProg: {
    name: 'Loyalty Programme',
    description: 'Frequent flyer points scheme that drives repeat bookings.',
    availableFrom: 1981,
    baseWeeklyCost: 4000,
    demandBoost: 8.0,
    icon: '⭐',
    audiences: ['national', 'continental', 'worldwide'],
    boostByEra: [[1981, 8.0], [2010, 7.5], [2020, 7.0]]
  },
  onlineAds: {
    name: 'Online / Banner Ads',
    description: 'Display advertising on travel websites and search engines.',
    availableFrom: 1995,
    baseWeeklyCost: 1200,
    demandBoost: 3.0,
    icon: '🖥️',
    audiences: ['local', 'national', 'continental', 'worldwide'],
    boostByEra: [[1995, 2.5], [2005, 4.5], [2012, 3.0], [2018, 2.0], [2022, 1.5]]
  },
  emailMktg: {
    name: 'Email Marketing',
    description: 'Targeted email campaigns to past passengers and subscriber lists.',
    availableFrom: 1998,
    baseWeeklyCost: 400,
    demandBoost: 1.5,
    icon: '📧',
    audiences: ['national', 'continental', 'worldwide'],
    boostByEra: [[1998, 3.5], [2005, 2.5], [2015, 1.5], [2020, 1.0]]
  },
  socialMedia: {
    name: 'Social Media',
    description: 'Paid campaigns on social platforms reaching millions of travellers.',
    availableFrom: 2005,
    baseWeeklyCost: 800,
    demandBoost: 4.0,
    icon: '📱',
    audiences: ['local', 'national', 'continental', 'worldwide'],
    boostByEra: [[2005, 1.5], [2010, 3.5], [2015, 6.0], [2020, 8.0]]
  },
  influencer: {
    name: 'Influencer Marketing',
    description: 'Partner with travel influencers and content creators for organic reach.',
    availableFrom: 2010,
    baseWeeklyCost: 2000,
    demandBoost: 5.0,
    icon: '🌟',
    audiences: ['local', 'national', 'continental', 'worldwide'],
    boostByEra: [[2010, 2.5], [2015, 5.5], [2020, 7.0]]
  }
};

/**
 * Return the era-appropriate demand boost for a channel in a given game year.
 * Walks boostByEra from the bottom and picks the last entry whose yearFrom <= gameYear.
 * Falls back to demandBoost if no boostByEra defined.
 */
function getChannelBoost(key, gameYear) {
  const ch = CHANNELS[key];
  if (!ch) return 0;
  if (!ch.boostByEra || ch.boostByEra.length === 0) return ch.demandBoost || 0;
  let boost = ch.boostByEra[0][1];
  for (const [fromYear, val] of ch.boostByEra) {
    if (gameYear >= fromYear) boost = val;
  }
  return boost;
}

/**
 * Calculate the capped demand boost for a set of channel keys (era-aware).
 * Raw boosts stack; diminishing returns above 20% (halved); hard cap ~30%.
 */
function calcCappedBoost(channelKeys, gameYear) {
  const raw = channelKeys.reduce((sum, k) => sum + getChannelBoost(k, gameYear ?? 2024), 0);
  if (raw <= 20) return raw;
  return 20 + (raw - 20) * 0.5;
}

module.exports = CHANNELS;
module.exports.AUDIENCE_LEVELS = AUDIENCE_LEVELS;
module.exports.calcCappedBoost = calcCappedBoost;
module.exports.getChannelBoost = getChannelBoost;
