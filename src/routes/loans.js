const express = require('express');
const router = express.Router();
const { WorldMembership, User, World, UserAircraft, Route, Loan, WeeklyFinancial, Notification } = require('../models');
const { getAllBanks, getBank, calculateOfferRate, calculateMaxLoanAmount, calculateFixedPayment, getCreditRating, TERM_RANGES, LOAN_TYPES } = require('../data/bankConfig');

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getMembership(req) {
  if (!req.user) return null;
  const activeWorldId = req.session?.activeWorldId;
  if (!activeWorldId) return null;
  const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
  if (!user) return null;
  return WorldMembership.findOne({ where: { userId: user.id, worldId: activeWorldId } });
}

/**
 * Calculate credit score (300–850) for an airline
 */
async function calculateCreditScore(membership) {
  const factors = {};
  let earned = 0;

  // 1. Reputation (20% → max 110 pts)
  const rep = membership.reputation || 0;
  const repPts = Math.round((rep / 100) * 110);
  factors.reputation = { score: repPts, max: 110, label: 'Reputation' };
  earned += repPts;

  // Run all DB queries in parallel for speed
  const [recentWeeks, fleet, activeLoans, world, allLoans] = await Promise.all([
    WeeklyFinancial.findAll({
      where: { worldMembershipId: membership.id },
      order: [['week_start', 'DESC']],
      limit: 8
    }),
    UserAircraft.findAll({
      where: { worldMembershipId: membership.id, status: 'active' }
    }),
    Loan.findAll({
      where: { worldMembershipId: membership.id, status: 'active' }
    }),
    World.findByPk(membership.worldId),
    Loan.findAll({ where: { worldMembershipId: membership.id } })
  ]);

  // 2. Profitability (20% → max 110 pts) — average weekly net profit from recent data
  let profitPts = 55; // Neutral if no data
  if (recentWeeks.length > 0) {
    const avgProfit = recentWeeks.reduce((sum, w) => {
      const rev = parseFloat(w.flightRevenue) || 0;
      const costs = (parseFloat(w.fuelCosts) || 0) + (parseFloat(w.crewCosts) || 0) +
        (parseFloat(w.maintenanceCosts) || 0) + (parseFloat(w.airportFees) || 0) +
        (parseFloat(w.staffCosts) || 0) + (parseFloat(w.leaseCosts) || 0) +
        (parseFloat(w.contractorCosts) || 0) + (parseFloat(w.loanPayments) || 0);
      return sum + (rev - costs);
    }, 0) / recentWeeks.length;

    if (avgProfit > 0) {
      // Positive profit: scale 0 → 110 (capped at $500K/week average)
      profitPts = Math.min(110, Math.round((avgProfit / 500000) * 110));
    } else {
      // Negative profit: scale down from 55 to 0
      profitPts = Math.max(0, Math.round(55 + (avgProfit / 200000) * 55));
    }
  }
  factors.profitability = { score: profitPts, max: 110, label: 'Profitability' };
  earned += profitPts;

  // 3. Fleet Value (15% → max 83 pts)
  const fleetValue = fleet.reduce((sum, a) => sum + (parseFloat(a.purchasePrice) || 0), 0);
  // Scale: $0 → 0pts, $50M+ → 83pts
  const fleetPts = Math.min(83, Math.round((fleetValue / 50000000) * 83));
  factors.fleetValue = { score: fleetPts, max: 83, label: 'Fleet Value' };
  earned += fleetPts;

  // 4. Debt Ratio (20% → max 110 pts) — lower debt = higher score
  const totalDebt = activeLoans.reduce((sum, l) => sum + (parseFloat(l.remainingPrincipal) || 0), 0);
  const balance = parseFloat(membership.balance) || 0;
  const netWorth = balance + fleetValue;
  let debtPts = 110; // Full points if no debt
  if (netWorth > 0 && totalDebt > 0) {
    const debtRatio = totalDebt / netWorth;
    // 0% debt → 110pts, 100%+ debt → 0pts
    debtPts = Math.max(0, Math.round(110 * (1 - Math.min(1, debtRatio))));
  }
  factors.debtRatio = { score: debtPts, max: 110, label: 'Debt Ratio' };
  earned += debtPts;

  // 5. Time in Business (10% → max 55 pts)
  const joinedAt = membership.joinedAt || membership.createdAt;
  const gameTime = world?.currentTime ? new Date(world.currentTime) : new Date();
  const weeksInBusiness = Math.max(0, (gameTime - new Date(joinedAt)) / (7 * 24 * 60 * 60 * 1000));
  // 0 weeks → 0pts, 52+ weeks → 55pts (1 game year)
  const timePts = Math.min(55, Math.round((weeksInBusiness / 52) * 55));
  factors.timeInBusiness = { score: timePts, max: 55, label: 'Time in Business' };
  earned += timePts;

  // 6. Payment History (15% → max 83 pts)
  let historyPts = 83; // Full points if no loan history (clean slate)
  if (allLoans.length > 0) {
    const totalMissed = allLoans.reduce((sum, l) => sum + (l.missedPayments || 0), 0);
    const totalPaymentsMade = allLoans.reduce((sum, l) => {
      return sum + (l.termWeeks - (l.weeksRemaining || 0));
    }, 0);
    const totalPayments = totalPaymentsMade + totalMissed;
    if (totalPayments > 0) {
      const onTimeRate = (totalPayments - totalMissed) / totalPayments;
      historyPts = Math.round(onTimeRate * 83);
    }
    // Defaults severely penalize
    const defaults = allLoans.filter(l => l.status === 'defaulted').length;
    historyPts = Math.max(0, historyPts - defaults * 25);
  }
  factors.paymentHistory = { score: historyPts, max: 83, label: 'Payment History' };
  earned += historyPts;

  const score = Math.min(850, 300 + earned);
  const rating = getCreditRating(score);

  return { score, rating, factors, netWorth, totalDebt, fleetValue };
}

// ── GET / — Active loans + credit score + summary ────────────────────────────

router.get('/', async (req, res) => {
  try {
    const membership = await getMembership(req);
    if (!membership) return res.status(401).json({ error: 'Not authenticated or no world selected' });

    const credit = await calculateCreditScore(membership);
    const loans = await Loan.findAll({
      where: { worldMembershipId: membership.id },
      order: [['createdAt', 'DESC']]
    });

    const activeLoans = loans.filter(l => l.status === 'active');
    const totalDebt = activeLoans.reduce((sum, l) => sum + (parseFloat(l.remainingPrincipal) || 0), 0);
    const weeklyObligations = activeLoans.reduce((sum, l) => sum + (parseFloat(l.weeklyPayment) || 0), 0);

    res.json({
      creditScore: credit.score,
      creditRating: credit.rating,
      creditFactors: credit.factors,
      netWorth: Math.round(credit.netWorth),
      loans: loans.map(l => ({
        id: l.id,
        bankId: l.bankId,
        bankName: getBank(l.bankId)?.name || l.bankId,
        loanType: l.loanType,
        loanTypeLabel: LOAN_TYPES[l.loanType]?.label || l.loanType,
        status: l.status,
        principalAmount: parseFloat(l.principalAmount),
        remainingPrincipal: parseFloat(l.remainingPrincipal),
        interestRate: parseFloat(l.interestRate),
        termWeeks: l.termWeeks,
        weeksRemaining: l.weeksRemaining,
        repaymentStrategy: l.repaymentStrategy,
        weeklyPayment: parseFloat(l.weeklyPayment),
        totalInterestPaid: parseFloat(l.totalInterestPaid),
        totalPrincipalPaid: parseFloat(l.totalPrincipalPaid),
        earlyRepaymentFee: parseFloat(l.earlyRepaymentFee),
        paymentHolidaysTotal: l.paymentHolidaysTotal,
        paymentHolidaysUsed: l.paymentHolidaysUsed,
        paymentHolidaysRemaining: l.paymentHolidaysTotal - l.paymentHolidaysUsed,
        isOnHoliday: l.isOnHoliday,
        missedPayments: l.missedPayments,
        originationGameDate: l.originationGameDate,
        creditScoreAtOrigin: l.creditScoreAtOrigin
      })),
      summary: {
        totalDebt: Math.round(totalDebt),
        weeklyObligations: Math.round(weeklyObligations),
        activeLoans: activeLoans.length,
        totalLoans: loans.length,
        defaultedLoans: loans.filter(l => l.status === 'defaulted').length,
        paidOffLoans: loans.filter(l => l.status === 'paid_off').length
      }
    });
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// ── GET /offers — Bank offers based on credit score ──────────────────────────

router.get('/offers', async (req, res) => {
  try {
    const membership = await getMembership(req);
    if (!membership) return res.status(401).json({ error: 'Not authenticated or no world selected' });

    const credit = await calculateCreditScore(membership);
    const banks = getAllBanks();

    // Find which banks already have an active loan
    const activeLoans = await Loan.findAll({
      where: { worldMembershipId: membership.id, status: 'active' }
    });
    const banksWithActiveLoan = new Set(activeLoans.map(l => l.bankId));

    const offers = banks
      .filter(bank => !banksWithActiveLoan.has(bank.id))
      .map(bank => {
        const meetsRequirement = credit.score >= bank.minCreditScore;
        const maxAmount = calculateMaxLoanAmount(bank.id, credit.netWorth);

        const loanTypes = Object.entries(LOAN_TYPES).map(([type, info]) => {
          const rate = calculateOfferRate(bank.id, credit.score, type);
          const termRange = TERM_RANGES[type];
          const midTerm = Math.round((termRange.min + termRange.max) / 2);
          const exampleWeekly = maxAmount > 0 ? calculateFixedPayment(maxAmount, rate, midTerm) : 0;

          return {
            type,
            label: info.label,
            description: info.description,
            rate,
            termRange,
            exampleWeekly: Math.round(exampleWeekly),
            exampleTerm: midTerm
          };
        });

        return {
          bankId: bank.id,
          name: bank.name,
          shortName: bank.shortName,
          hq: bank.hq,
          riskAppetite: bank.riskAppetite,
          tagline: bank.tagline,
          description: bank.description,
          features: bank.features,
          minCreditScore: bank.minCreditScore,
          earlyRepaymentFee: bank.earlyRepaymentFee,
          paymentHolidays: bank.paymentHolidays,
          meetsRequirement,
          maxLoanAmount: Math.round(maxAmount),
          loanTypes
        };
      });

    // Sort: qualifying banks first (by rate), locked banks last
    offers.sort((a, b) => {
      if (a.meetsRequirement && !b.meetsRequirement) return -1;
      if (!a.meetsRequirement && b.meetsRequirement) return 1;
      return a.loanTypes[1].rate - b.loanTypes[1].rate; // Sort by fleet expansion rate
    });

    res.json({
      creditScore: credit.score,
      creditRating: credit.rating,
      creditFactors: credit.factors,
      netWorth: Math.round(credit.netWorth),
      offers
    });
  } catch (error) {
    console.error('Error fetching loan offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// ── POST /apply — Apply for a loan ───────────────────────────────────────────

router.post('/apply', async (req, res) => {
  try {
    const membership = await getMembership(req);
    if (!membership) return res.status(401).json({ error: 'Not authenticated or no world selected' });

    const { bankId, loanType, amount, termWeeks, repaymentStrategy } = req.body;

    // Validate bank
    const bank = getBank(bankId);
    if (!bank) return res.status(400).json({ error: 'Invalid bank' });

    // One active loan per bank
    const existingLoan = await Loan.findOne({
      where: { worldMembershipId: membership.id, bankId, status: 'active' }
    });
    if (existingLoan) {
      return res.status(400).json({ error: `You already have an active loan with ${bank.name}. Pay it off before applying again.` });
    }

    // Validate loan type
    if (!LOAN_TYPES[loanType]) return res.status(400).json({ error: 'Invalid loan type' });

    // Validate repayment strategy
    if (!['fixed', 'reducing', 'interest_only'].includes(repaymentStrategy)) {
      return res.status(400).json({ error: 'Invalid repayment strategy' });
    }

    // Validate term range
    const termRange = TERM_RANGES[loanType];
    if (termWeeks < termRange.min || termWeeks > termRange.max) {
      return res.status(400).json({ error: `Term must be ${termRange.min}–${termRange.max} weeks for ${LOAN_TYPES[loanType].label}` });
    }

    // Credit score check
    const credit = await calculateCreditScore(membership);
    if (credit.score < bank.minCreditScore) {
      return res.status(400).json({ error: `Credit score ${credit.score} below ${bank.name}'s minimum of ${bank.minCreditScore}` });
    }

    // Amount validation
    const maxAmount = calculateMaxLoanAmount(bank.id, credit.netWorth);
    if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });
    if (amount > maxAmount) {
      return res.status(400).json({ error: `Maximum loan from ${bank.name}: $${maxAmount.toLocaleString()}` });
    }

    // Calculate rate and payment
    const rate = calculateOfferRate(bankId, credit.score, loanType);
    let weeklyPayment = 0;
    if (repaymentStrategy === 'fixed') {
      weeklyPayment = calculateFixedPayment(amount, rate, termWeeks);
    } else if (repaymentStrategy === 'reducing') {
      // First week payment (highest)
      const principalPortion = amount / termWeeks;
      const interestPortion = amount * (rate / 100 / 52);
      weeklyPayment = Math.round((principalPortion + interestPortion) * 100) / 100;
    } else {
      // Interest only
      weeklyPayment = Math.round(amount * (rate / 100 / 52) * 100) / 100;
    }

    // Get game date for origination
    const world = await World.findByPk(membership.worldId);
    const gameDate = world?.currentTime
      ? new Date(world.currentTime).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Create the loan
    const loan = await Loan.create({
      worldMembershipId: membership.id,
      bankId,
      loanType,
      status: 'active',
      principalAmount: amount,
      remainingPrincipal: amount,
      interestRate: rate,
      termWeeks,
      weeksRemaining: termWeeks,
      repaymentStrategy,
      weeklyPayment,
      earlyRepaymentFee: bank.earlyRepaymentFee,
      paymentHolidaysTotal: bank.paymentHolidays,
      paymentHolidaysUsed: 0,
      isOnHoliday: false,
      missedPayments: 0,
      originationGameDate: gameDate,
      creditScoreAtOrigin: credit.score
    });

    // Credit the balance
    membership.balance = (parseFloat(membership.balance) || 0) + amount;
    await membership.save();

    // Send notification
    try {
      await Notification.create({
        worldMembershipId: membership.id,
        type: 'loan_approved',
        icon: 'dollar-sign',
        title: `Loan Approved — ${bank.shortName}`,
        message: `$${Math.round(amount).toLocaleString()} ${LOAN_TYPES[loanType].label} loan at ${rate}% APR. Weekly payment: $${Math.round(weeklyPayment).toLocaleString()}`,
        link: '/loans',
        priority: 2,
        gameTime: world?.currentTime || new Date()
      });
    } catch (nErr) { /* non-critical */ }

    res.status(201).json({
      loan: {
        id: loan.id,
        bankName: bank.name,
        loanType,
        amount,
        rate,
        termWeeks,
        weeklyPayment,
        repaymentStrategy
      },
      newBalance: parseFloat(membership.balance)
    });
  } catch (error) {
    console.error('Error applying for loan:', error);
    res.status(500).json({ error: 'Failed to process loan application' });
  }
});

// ── POST /:id/repay — Early repayment ────────────────────────────────────────

router.post('/:id/repay', async (req, res) => {
  try {
    const membership = await getMembership(req);
    if (!membership) return res.status(401).json({ error: 'Not authenticated or no world selected' });

    const loan = await Loan.findOne({
      where: { id: req.params.id, worldMembershipId: membership.id, status: 'active' }
    });
    if (!loan) return res.status(404).json({ error: 'Active loan not found' });

    let { amount } = req.body;
    const remaining = parseFloat(loan.remainingPrincipal);
    amount = Math.min(amount, remaining); // Cap at remaining principal

    if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    // Calculate early repayment fee
    const feeRate = parseFloat(loan.earlyRepaymentFee) || 0;
    const fee = Math.round(amount * (feeRate / 100) * 100) / 100;
    const totalDeduction = amount + fee;

    // Check balance
    const balance = parseFloat(membership.balance) || 0;
    if (balance < totalDeduction) {
      return res.status(400).json({ error: `Insufficient balance. Need $${Math.round(totalDeduction).toLocaleString()} (includes $${Math.round(fee).toLocaleString()} fee)` });
    }

    // Deduct from balance
    membership.balance = balance - totalDeduction;
    await membership.save();

    // Update loan
    const newRemaining = remaining - amount;
    loan.remainingPrincipal = Math.max(0, newRemaining);
    loan.totalPrincipalPaid = (parseFloat(loan.totalPrincipalPaid) || 0) + amount;

    if (newRemaining <= 0.01) {
      loan.status = 'paid_off';
      loan.remainingPrincipal = 0;
      loan.weeksRemaining = 0;

      const bank = getBank(loan.bankId);
      try {
        await Notification.create({
          worldMembershipId: membership.id,
          type: 'loan_paid_off',
          icon: 'check-circle',
          title: `Loan Paid Off — ${bank?.shortName || loan.bankId}`,
          message: `Your ${LOAN_TYPES[loan.loanType]?.label} loan has been fully repaid.${fee > 0 ? ` Early repayment fee: $${Math.round(fee).toLocaleString()}` : ''}`,
          link: '/loans',
          priority: 2
        });
      } catch (nErr) { /* non-critical */ }
    }

    await loan.save();

    res.json({
      success: true,
      amountPaid: amount,
      fee,
      newRemaining: parseFloat(loan.remainingPrincipal),
      status: loan.status,
      newBalance: parseFloat(membership.balance)
    });
  } catch (error) {
    console.error('Error processing repayment:', error);
    res.status(500).json({ error: 'Failed to process repayment' });
  }
});

// ── POST /:id/holiday — Request payment holiday ─────────────────────────────

router.post('/:id/holiday', async (req, res) => {
  try {
    const membership = await getMembership(req);
    if (!membership) return res.status(401).json({ error: 'Not authenticated or no world selected' });

    const loan = await Loan.findOne({
      where: { id: req.params.id, worldMembershipId: membership.id, status: 'active' }
    });
    if (!loan) return res.status(404).json({ error: 'Active loan not found' });

    if (loan.isOnHoliday) {
      return res.status(400).json({ error: 'Already on a payment holiday' });
    }

    const remaining = loan.paymentHolidaysTotal - loan.paymentHolidaysUsed;
    if (remaining <= 0) {
      return res.status(400).json({ error: 'No payment holidays remaining' });
    }

    loan.isOnHoliday = true;
    loan.paymentHolidaysUsed += 1;
    await loan.save();

    const bank = getBank(loan.bankId);
    try {
      await Notification.create({
        worldMembershipId: membership.id,
        type: 'loan_holiday',
        icon: 'pause-circle',
        title: `Payment Holiday — ${bank?.shortName || loan.bankId}`,
        message: `Payment holiday activated. Interest will continue to accrue. ${remaining - 1} holiday(s) remaining.`,
        link: '/loans',
        priority: 3
      });
    } catch (nErr) { /* non-critical */ }

    res.json({
      success: true,
      holidaysRemaining: remaining - 1,
      isOnHoliday: true
    });
  } catch (error) {
    console.error('Error processing payment holiday:', error);
    res.status(500).json({ error: 'Failed to process payment holiday' });
  }
});

module.exports = router;
