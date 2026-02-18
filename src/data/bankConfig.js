/**
 * Bank Configuration
 * Defines fictional banks with different risk appetites, rates, and terms.
 * Pattern follows contractorConfig.js — exported object + helper functions.
 */

const BANKS = {
  skyvault: {
    id: 'skyvault',
    name: 'SkyVault Capital',
    shortName: 'SkyVault',
    hq: 'London, UK',
    riskAppetite: 'conservative',
    tagline: 'Trusted aviation finance since 1923',
    description: 'Old-money aviation bank with a long history of financing flag carriers. Strict requirements but reliable, low-rate lending for established airlines.',
    baseRate: 2.5,
    minCreditScore: 650,
    maxLoanPct: 0.40,
    earlyRepaymentFee: 3.0,
    paymentHolidays: 0,
    features: ['Low rates', 'Strict requirements']
  },
  pacific: {
    id: 'pacific',
    name: 'Pacific Wing Finance',
    shortName: 'Pacific Wing',
    hq: 'Singapore',
    riskAppetite: 'moderate',
    tagline: 'Asia-Pacific aviation specialists',
    description: 'Regional specialist with deep understanding of growth markets. Moderate requirements with reasonable rates and flexible terms.',
    baseRate: 3.5,
    minCreditScore: 550,
    maxLoanPct: 0.60,
    earlyRepaymentFee: 2.0,
    paymentHolidays: 1,
    features: ['Growth market focus', '1 payment holiday']
  },
  atlas: {
    id: 'atlas',
    name: 'Atlas Commercial Bank',
    shortName: 'Atlas',
    hq: 'New York, USA',
    riskAppetite: 'moderate',
    tagline: 'No surprises. No hidden fees.',
    description: 'Straightforward commercial lender with transparent terms. No early repayment fees make Atlas a popular choice for airlines planning ahead.',
    baseRate: 4.0,
    minCreditScore: 500,
    maxLoanPct: 0.70,
    earlyRepaymentFee: 0,
    paymentHolidays: 1,
    features: ['No early repayment fees', 'Transparent terms']
  },
  meridian: {
    id: 'meridian',
    name: 'Meridian Trade Bank',
    shortName: 'Meridian',
    hq: 'Dubai, UAE',
    riskAppetite: 'aggressive',
    tagline: 'Ambitious airlines deserve ambitious backing',
    description: 'High risk tolerance lender based in the Middle East. Will approve larger loans at higher rates. Generous payment holiday allowance for cash-flow management.',
    baseRate: 5.5,
    minCreditScore: 400,
    maxLoanPct: 0.90,
    earlyRepaymentFee: 0,
    paymentHolidays: 2,
    features: ['High loan limits', '2 payment holidays', 'No early fees']
  },
  nordic: {
    id: 'nordic',
    name: 'Nordic Aviation Credit',
    shortName: 'Nordic',
    hq: 'Stockholm, Sweden',
    riskAppetite: 'conservative',
    tagline: 'The lowest rates in aviation finance',
    description: 'Premium lender offering the best interest rates in the industry. Demands excellent credit and charges steep penalties for early exit. For established, stable airlines only.',
    baseRate: 1.8,
    minCreditScore: 700,
    maxLoanPct: 0.50,
    earlyRepaymentFee: 5.0,
    paymentHolidays: 0,
    features: ['Lowest rates', 'Strict entry', 'High early exit fee']
  },
  condor: {
    id: 'condor',
    name: 'Condor Lending Group',
    shortName: 'Condor',
    hq: 'São Paulo, Brazil',
    riskAppetite: 'aggressive',
    tagline: 'Everyone deserves a chance to fly',
    description: 'Will lend to almost anyone regardless of credit history. Rates are high but so is their risk tolerance. Generous loan limits and maximum payment holiday flexibility.',
    baseRate: 6.5,
    minCreditScore: 350,
    maxLoanPct: 1.00,
    earlyRepaymentFee: 0,
    paymentHolidays: 3,
    features: ['Accepts poor credit', '3 payment holidays', 'No early fees']
  },
  helvetia: {
    id: 'helvetia',
    name: 'Helvetia Bank',
    shortName: 'Helvetia',
    hq: 'Zurich, Switzerland',
    riskAppetite: 'moderate',
    tagline: 'Precision banking for precision airlines',
    description: 'Swiss banking tradition meets aviation finance. Well-balanced offering with competitive rates, modest early repayment fees, and one payment holiday option.',
    baseRate: 3.0,
    minCreditScore: 600,
    maxLoanPct: 0.55,
    earlyRepaymentFee: 1.0,
    paymentHolidays: 1,
    features: ['Balanced terms', 'Low early fee', 'Swiss reliability']
  }
};

// Loan type rate adjustments (added to base rate)
const LOAN_TYPE_ADJUSTMENTS = {
  working_capital: 1.5,    // Short-term, higher risk → +1.5%
  fleet_expansion: 0,      // Standard aviation loan → no adjustment
  infrastructure: -0.5     // Long-term, lower risk → -0.5%
};

// Term ranges by loan type (in game weeks)
const TERM_RANGES = {
  working_capital: { min: 26, max: 104 },
  fleet_expansion: { min: 104, max: 260 },
  infrastructure: { min: 260, max: 520 }
};

// Loan type display info
const LOAN_TYPES = {
  working_capital: { label: 'Working Capital', description: 'Short-term funding for operational expenses and cash flow' },
  fleet_expansion: { label: 'Fleet Expansion', description: 'Medium-term financing for aircraft purchases and leases' },
  infrastructure: { label: 'Infrastructure', description: 'Long-term investment in routes, facilities, and growth' }
};

// Credit score rating labels
const CREDIT_RATINGS = [
  { min: 750, label: 'Excellent', color: '#2ea043' },
  { min: 700, label: 'Very Good', color: '#56d364' },
  { min: 600, label: 'Good', color: '#d29922' },
  { min: 500, label: 'Fair', color: '#db6d28' },
  { min: 300, label: 'Poor', color: '#f85149' }
];

/**
 * Get a bank by its ID
 */
function getBank(bankId) {
  return BANKS[bankId] || null;
}

/**
 * Get all banks as an array
 */
function getAllBanks() {
  return Object.values(BANKS);
}

/**
 * Calculate the offered interest rate for a specific bank, credit score, and loan type
 * Better credit scores get rate discounts (0.25% per 50pts above minimum, max 1.5% off)
 */
function calculateOfferRate(bankId, creditScore, loanType) {
  const bank = BANKS[bankId];
  if (!bank) return null;

  const typeAdj = LOAN_TYPE_ADJUSTMENTS[loanType] || 0;
  let rate = bank.baseRate + typeAdj;

  // Credit score discount: 0.25% per 50 points above minimum, max 1.5%
  const pointsAbove = Math.max(0, creditScore - bank.minCreditScore);
  const discount = Math.min(1.5, Math.floor(pointsAbove / 50) * 0.25);
  rate -= discount;

  return Math.round(rate * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate the maximum loan amount for a bank given airline net worth
 */
function calculateMaxLoanAmount(bankId, netWorth) {
  const bank = BANKS[bankId];
  if (!bank) return 0;
  return Math.max(0, Math.round(netWorth * bank.maxLoanPct * 10));
}

/**
 * Calculate weekly payment for a fixed-rate loan (standard amortization)
 * Returns the fixed weekly payment amount
 */
function calculateFixedPayment(principal, annualRate, termWeeks) {
  const weeklyRate = annualRate / 100 / 52;
  if (weeklyRate === 0) return Math.round(principal / termWeeks * 100) / 100;
  const payment = principal * (weeklyRate * Math.pow(1 + weeklyRate, termWeeks)) /
    (Math.pow(1 + weeklyRate, termWeeks) - 1);
  return Math.round(payment * 100) / 100;
}

/**
 * Get the credit rating label and color for a given score
 */
function getCreditRating(score) {
  for (const rating of CREDIT_RATINGS) {
    if (score >= rating.min) return rating;
  }
  return CREDIT_RATINGS[CREDIT_RATINGS.length - 1];
}

module.exports = {
  BANKS,
  LOAN_TYPE_ADJUSTMENTS,
  TERM_RANGES,
  LOAN_TYPES,
  CREDIT_RATINGS,
  getBank,
  getAllBanks,
  calculateOfferRate,
  calculateMaxLoanAmount,
  calculateFixedPayment,
  getCreditRating
};
