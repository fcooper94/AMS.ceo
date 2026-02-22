const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { World, WorldMembership, User, Airport, UserAircraft, Route, Loan, Notification } = require('../models');
const eraEconomicService = require('../services/eraEconomicService');
const { getAICount } = require('../data/aiDifficultyConfig');
const { getBank, calculateOfferRate, calculateFixedPayment } = require('../data/bankConfig');

/**
 * Get all available worlds for user to join
 */
router.get('/available', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Find user in database
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });

    // Get user's memberships first (needed to show completed worlds the user was in)
    let userMemberWorldIds = [];
    if (user) {
      const memberships = await WorldMembership.findAll({
        where: { userId: user.id },
        attributes: ['worldId']
      });
      userMemberWorldIds = memberships.map(m => m.worldId);
    }

    // Get active worlds + completed worlds the user is a member of
    const worlds = await World.findAll({
      where: {
        [Op.or]: [
          // Active worlds (MP visible to all, SP only to owner)
          {
            status: 'active',
            [Op.or]: [
              { worldType: 'multiplayer' },
              { worldType: null },
              { ownerUserId: user ? user.id : null }
            ]
          },
          // Completed worlds the user was a member of
          ...(userMemberWorldIds.length > 0 ? [{
            status: 'completed',
            id: { [Op.in]: userMemberWorldIds }
          }] : [])
        ]
      },
      attributes: ['id', 'name', 'description', 'era', 'currentTime', 'timeAcceleration', 'maxPlayers', 'joinCost', 'weeklyCost', 'freeWeeks', 'endDate', 'worldType', 'difficulty', 'status', 'isPaused'],
      order: [['createdAt', 'DESC']]
    });

    // Get user's memberships if they exist
    let userMemberships = [];
    if (user) {
      userMemberships = await WorldMembership.findAll({
        where: { userId: user.id },
        attributes: ['worldId', 'airlineName', 'airlineCode', 'iataCode', 'lastVisited', 'joinedAt']
      });
    }

    const membershipMap = new Map(userMemberships.map(m => [m.worldId, m]));

    // Enhance worlds with membership status
    const worldsWithStatus = await Promise.all(worlds.map(async (world) => {
      const isSP = world.worldType === 'singleplayer';
      const humanCount = await WorldMembership.count({ where: { worldId: world.id, isAI: false } });
      const aiCount = isSP ? await WorldMembership.count({ where: { worldId: world.id, isAI: true } }) : 0;
      const membership = membershipMap.get(world.id);

      // Calculate the decade from currentTime (e.g., 1995 -> "90's")
      const currentYear = world.currentTime.getFullYear();
      const decade = Math.floor(currentYear / 10) * 10;
      const decadeString = `${decade.toString().slice(-2)}'s`;

      return {
        ...world.toJSON(),
        era: decadeString,
        memberCount: humanCount,
        aiCount,
        isMember: !!membership,
        airlineName: membership?.airlineName,
        airlineCode: membership?.airlineCode,
        iataCode: membership?.iataCode,
        lastVisited: membership?.lastVisited || null,
        joinedAt: membership?.joinedAt || null
      };
    }));

    res.json(worldsWithStatus);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching worlds:', error);
    }
    res.status(500).json({ error: 'Failed to fetch worlds' });
  }
});

/**
 * Join a world
 */
router.post('/join', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { worldId, airlineName, airlineCode, iataCode, baseAirportId, cleaningContractor, groundContractor, engineeringContractor } = req.body;
    const validTiers = ['budget', 'standard', 'premium'];
    const mpCleaningTier = validTiers.includes(cleaningContractor) ? cleaningContractor : 'standard';
    const mpGroundTier = validTiers.includes(groundContractor) ? groundContractor : 'standard';
    const mpEngineeringTier = validTiers.includes(engineeringContractor) ? engineeringContractor : 'standard';

    if (!worldId || !airlineName || !airlineCode || !iataCode || !baseAirportId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate airline code format (3 letters ICAO)
    if (!/^[A-Z]{3}$/.test(airlineCode)) {
      return res.status(400).json({ error: 'ICAO code must be 3 uppercase letters' });
    }

    // Validate IATA code format (2 letters)
    if (!/^[A-Z]{2}$/.test(iataCode)) {
      return res.status(400).json({ error: 'IATA code must be 2 uppercase letters' });
    }

    // Verify airport exists and get region from airport
    const airport = await Airport.findByPk(baseAirportId);
    if (!airport) {
      return res.status(404).json({ error: 'Selected airport not found' });
    }

    // Derive region from airport's country
    const region = airport.country;

    // Check if world exists first (need it for era calculation)
    const world = await World.findByPk(worldId);
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }

    // Get world's current year for era-based starting capital
    const worldYear = new Date(world.currentTime).getFullYear();

    // Determine starting balance based on world era (everyone starts with same capital)
    // This ensures fair gameplay across all time periods
    const startingBalance = eraEconomicService.getStartingCapital(worldYear);

    if (process.env.NODE_ENV === 'development') {
      console.log(`Starting capital for ${worldYear}: $${startingBalance.toLocaleString()}`);
    }

    // Cost to join this world (from world settings, default 10)
    const JOIN_COST_CREDITS = world.joinCost !== undefined ? world.joinCost : 10;

    // Find or create user
    const [user] = await User.findOrCreate({
      where: { vatsimId: req.user.vatsimId },
      defaults: {
        vatsimId: req.user.vatsimId,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        rating: req.user.rating,
        pilotRating: req.user.pilotRating,
        division: req.user.division,
        subdivision: req.user.subdivision,
        lastLogin: new Date()
      }
    });

    // Check if user has enough credits to join
    if (!user.unlimitedCredits && user.credits < JOIN_COST_CREDITS) {
      return res.status(400).json({
        error: `Not enough credits to join a world. You need ${JOIN_COST_CREDITS} credits but only have ${user.credits}.`,
        creditsRequired: JOIN_COST_CREDITS,
        creditsAvailable: user.credits
      });
    }

    // Check if already a member
    const existing = await WorldMembership.findOne({
      where: { userId: user.id, worldId }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already a member of this world' });
    }

    // Check if ICAO airline code is taken
    const icaoCodeTaken = await WorldMembership.findOne({
      where: { worldId, airlineCode }
    });

    if (icaoCodeTaken) {
      return res.status(400).json({ error: 'ICAO code already taken in this world' });
    }

    // Check if IATA code is taken
    const iataCodeTaken = await WorldMembership.findOne({
      where: { worldId, iataCode }
    });

    if (iataCodeTaken) {
      return res.status(400).json({ error: 'IATA code already taken in this world' });
    }

    // Calculate credit deduction start time (offset by free weeks if applicable)
    const freeWeeks = world.freeWeeks || 0;
    let creditDeductionStart = new Date(world.currentTime);
    if (freeWeeks > 0) {
      creditDeductionStart = new Date(creditDeductionStart.getTime() + (freeWeeks * 7 * 24 * 60 * 60 * 1000));
    }

    // Create membership
    const membership = await WorldMembership.create({
      userId: user.id,
      worldId,
      airlineName,
      airlineCode,
      iataCode,
      region,
      baseAirportId,
      balance: startingBalance,
      reputation: 50,
      lastCreditDeduction: creditDeductionStart, // Offset by free weeks so deductions start later
      cleaningContractor: mpCleaningTier,
      groundContractor: mpGroundTier,
      engineeringContractor: mpEngineeringTier
    });

    // Auto-approve a starter loan so new airlines can afford their first aircraft
    let starterLoanInfo = null;
    try {
      const STARTER_LOAN_BASE_2024 = 20_000_000; // $20M in 2024 USD
      const starterBankId = 'atlas';
      const starterLoanType = 'fleet_expansion';
      const starterTermWeeks = 104; // 2 game years
      const starterCreditScore = 600;

      const starterAmount = eraEconomicService.convertToEraPrice(STARTER_LOAN_BASE_2024, worldYear);
      const starterBank = getBank(starterBankId);
      const starterRate = calculateOfferRate(starterBankId, starterCreditScore, starterLoanType);
      const starterPayment = calculateFixedPayment(starterAmount, starterRate, starterTermWeeks);

      const gameDate = world.currentTime
        ? new Date(world.currentTime).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      await Loan.create({
        worldMembershipId: membership.id,
        bankId: starterBankId,
        loanType: starterLoanType,
        status: 'active',
        principalAmount: starterAmount,
        remainingPrincipal: starterAmount,
        interestRate: starterRate,
        termWeeks: starterTermWeeks,
        weeksRemaining: starterTermWeeks,
        repaymentStrategy: 'fixed',
        weeklyPayment: starterPayment,
        earlyRepaymentFee: starterBank.earlyRepaymentFee,
        paymentHolidaysTotal: starterBank.paymentHolidays,
        paymentHolidaysUsed: 0,
        isOnHoliday: false,
        missedPayments: 0,
        originationGameDate: gameDate,
        creditScoreAtOrigin: starterCreditScore
      });

      // Credit the loan amount to the airline's balance
      membership.balance = parseFloat(membership.balance) + starterAmount;
      await membership.save();

      starterLoanInfo = { amount: starterAmount, rate: starterRate, weeklyPayment: starterPayment, termWeeks: starterTermWeeks, bank: 'Atlas Commercial Bank' };

      await Notification.create({
        worldMembershipId: membership.id,
        type: 'loan_approved',
        title: 'Starter Loan — Atlas Commercial Bank',
        message: `Your airline has been approved for a $${Math.round(starterAmount).toLocaleString()} starter loan at ${starterRate}% APR over ${starterTermWeeks} weeks. Weekly repayment: $${Math.round(starterPayment).toLocaleString()}.`
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`Starter loan of $${starterAmount.toLocaleString()} created for membership ${membership.id}`);
      }
    } catch (loanErr) {
      console.error('Starter loan creation failed (non-fatal):', loanErr.message);
    }

    // Deduct credits for joining (skip for unlimited users)
    if (!user.unlimitedCredits) {
      user.credits -= JOIN_COST_CREDITS;
      await user.save();

      if (process.env.NODE_ENV === 'development') {
        console.log(`Deducted ${JOIN_COST_CREDITS} credits from user ${user.id} for joining world. New balance: ${user.credits}`);
      }
    }

    res.json({
      message: 'Successfully joined world',
      membership: {
        worldId: membership.worldId,
        airlineName: membership.airlineName,
        airlineCode: membership.airlineCode,
        iataCode: membership.iataCode,
        balance: membership.balance
      },
      starterLoan: starterLoanInfo,
      creditsDeducted: user.unlimitedCredits ? 0 : JOIN_COST_CREDITS,
      creditsRemaining: user.unlimitedCredits ? 'unlimited' : user.credits
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error joining world:', error);
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Airline code already taken' });
    }

    res.status(500).json({ error: 'Failed to join world' });
  }
});

/**
 * Leave a world (declare bankruptcy)
 */
router.post('/leave', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { worldId } = req.body;

    if (!worldId) {
      return res.status(400).json({ error: 'World ID required' });
    }

    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find membership
    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Delete membership (declare bankruptcy)
    await membership.destroy();

    res.json({ message: 'Successfully left world' });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error leaving world:', error);
    }
    res.status(500).json({ error: 'Failed to leave world' });
  }
});

/**
 * Get user's worlds with details
 */
router.get('/my-worlds', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });

    if (!user) {
      return res.json([]);
    }

    const memberships = await WorldMembership.findAll({
      where: { userId: user.id, isActive: true },
      include: [{
        model: World,
        as: 'world',
        attributes: ['id', 'name', 'description', 'era', 'currentTime', 'timeAcceleration', 'status', 'weeklyCost', 'freeWeeks']
      }],
      order: [['joinedAt', 'DESC']]
    });

    const myWorlds = memberships.map(m => ({
      worldId: m.worldId,
      worldName: m.world.name,
      worldEra: m.world.era,
      worldStatus: m.world.status,
      airlineName: m.airlineName,
      airlineCode: m.airlineCode,
      balance: m.balance,
      reputation: m.reputation,
      joinedAt: m.joinedAt,
      weeklyCost: m.world.weeklyCost !== undefined ? m.world.weeklyCost : 1,
      freeWeeks: m.world.freeWeeks || 0,
      lastCreditDeduction: m.lastCreditDeduction || null,
      currentTime: m.world.currentTime
    }));

    res.json(myWorlds);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching user worlds:', error);
    }
    res.status(500).json({ error: 'Failed to fetch your worlds' });
  }
});

/**
 * Get starting capital for a world
 */
router.get('/:worldId/starting-capital', async (req, res) => {
  try {
    const { worldId } = req.params;

    const world = await World.findByPk(worldId);
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }

    const worldYear = new Date(world.currentTime).getFullYear();
    const startingCapital = eraEconomicService.getStartingCapital(worldYear);
    const eraInfo = eraEconomicService.getStartingCapitalInfo(worldYear);

    res.json({
      worldYear,
      startingCapital,
      formattedCapital: eraInfo.displayCapital,
      eraName: eraInfo.eraName,
      multiplier: eraInfo.multiplier
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting starting capital:', error);
    }
    res.status(500).json({ error: 'Failed to get starting capital' });
  }
});

/**
 * Set active world in session
 */
router.post('/set-active', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { worldId } = req.body;

    if (!worldId) {
      return res.status(400).json({ error: 'World ID required' });
    }

    // Verify the user is a member of this world
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this world' });
    }

    // Update last visited timestamp
    await membership.update({ lastVisited: new Date() });

    // Verify world exists
    const world = await World.findByPk(worldId);
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }

    // Set active world in session
    req.session.activeWorldId = worldId;

    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      message: 'Active world set successfully',
      worldId,
      worldName: world.name
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error setting active world:', error);
    }
    res.status(500).json({ error: 'Failed to set active world' });
  }
});

/**
 * Create a single-player world with AI competitors
 */
router.post('/create-singleplayer', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name, era, timeAcceleration, difficulty, baseAirportId, airlineName, airlineCode, iataCode, cleaningContractor, groundContractor, engineeringContractor } = req.body;
    const validTiers = ['budget', 'standard', 'premium'];
    const spCleaningTier = validTiers.includes(cleaningContractor) ? cleaningContractor : 'standard';
    const spGroundTier = validTiers.includes(groundContractor) ? groundContractor : 'standard';
    const spEngineeringTier = validTiers.includes(engineeringContractor) ? engineeringContractor : 'standard';

    // Validate required fields
    if (!name || !era || !difficulty || !baseAirportId || !airlineName || !airlineCode || !iataCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!/^[A-Z]{3}$/.test(airlineCode)) {
      return res.status(400).json({ error: 'ICAO code must be 3 uppercase letters' });
    }
    if (!/^[A-Z]{2}$/.test(iataCode)) {
      return res.status(400).json({ error: 'IATA code must be 2 uppercase letters' });
    }
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ error: 'Difficulty must be easy, medium, or hard' });
    }

    // Verify airport
    const airport = await Airport.findByPk(baseAirportId);
    if (!airport) {
      return res.status(404).json({ error: 'Selected airport not found' });
    }

    // Find or create user
    const [user] = await User.findOrCreate({
      where: { vatsimId: req.user.vatsimId },
      defaults: {
        vatsimId: req.user.vatsimId,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        rating: req.user.rating,
        pilotRating: req.user.pilotRating,
        division: req.user.division,
        subdivision: req.user.subdivision,
        lastLogin: new Date()
      }
    });

    // SP worlds cost 10 credits to create
    const spCreateCost = 10;
    if (!user.unlimitedCredits) {
      if ((user.credits || 0) < spCreateCost) {
        return res.status(400).json({
          error: 'Not enough credits to create a single-player world',
          creditsRequired: spCreateCost,
          creditsAvailable: user.credits || 0
        });
      }
      user.credits = (user.credits || 0) - spCreateCost;
      await user.save();
    }

    // Calculate start date from era
    const startYear = parseInt(era);
    const startDate = new Date(`${startYear}-01-01T00:00:00Z`);
    const acceleration = parseFloat(timeAcceleration) || 60;

    // Create the world
    const world = await World.create({
      name,
      description: `Single-player world (${difficulty}) - ${airlineName}`,
      startDate,
      currentTime: startDate,
      timeAcceleration: acceleration,
      era: startYear,
      maxPlayers: 1,
      status: 'active',
      joinCost: 10,
      weeklyCost: 1,
      freeWeeks: 4,
      worldType: 'singleplayer',
      difficulty,
      ownerUserId: user.id
    });

    // Calculate starting capital
    const startingBalance = eraEconomicService.getStartingCapital(startYear);

    // Create human player's membership
    const membership = await WorldMembership.create({
      userId: user.id,
      worldId: world.id,
      airlineName,
      airlineCode,
      iataCode,
      region: airport.country,
      baseAirportId,
      balance: startingBalance,
      reputation: 50,
      isAI: false,
      cleaningContractor: spCleaningTier,
      groundContractor: spGroundTier,
      engineeringContractor: spEngineeringTier
    });

    // Calculate expected AI count (actual spawning happens via aiSpawningService)
    const aiCount = getAICount(difficulty);

    // Spawn AI airlines (lazy-load to avoid circular deps)
    try {
      const aiSpawningService = require('../services/aiSpawningService');
      await aiSpawningService.spawnAIAirlines(world, difficulty, airport);
    } catch (spawnErr) {
      console.error('Error spawning AI airlines:', spawnErr.message);
      console.error('Stack:', spawnErr.stack);
      if (spawnErr.original) console.error('DB error:', spawnErr.original.message);
      // World still created successfully, AI can be spawned later
    }

    // Compute ATC route waypoints in background (map will show progress overlay)
    try {
      const airwayService = require('../services/airwayService');
      if (airwayService.isReady()) {
        airwayService.backfillMissingWaypoints().catch(e =>
          console.error('[WorldCreation] Waypoint backfill error:', e.message)
        );
      }
    } catch (e) { /* non-critical */ }

    // Start the world time service
    try {
      const worldTimeService = require('../services/worldTimeService');
      await worldTimeService.startWorld(world.id);
    } catch (startErr) {
      console.error('Error starting world time:', startErr.message);
    }

    // Set as active world
    req.session.activeWorldId = world.id;
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      message: 'Single-player world created successfully',
      worldId: world.id,
      worldName: world.name,
      aiCount,
      startingBalance
    });
  } catch (error) {
    console.error('Error creating SP world:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      const fields = error.fields || {};
      if (fields.airline_code || fields.iata_code) {
        return res.status(400).json({ error: 'Airline ICAO or IATA code already in use' });
      }
      return res.status(400).json({ error: 'A world with that name already exists' });
    }

    res.status(500).json({ error: 'Failed to create single-player world' });
  }
});

/**
 * End a single-player world (mark as completed, stop time)
 */
router.post('/end-sp', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { worldId } = req.body;
    if (!worldId) {
      return res.status(400).json({ error: 'World ID required' });
    }

    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const world = await World.findByPk(worldId);
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }

    if (world.worldType !== 'singleplayer') {
      return res.status(400).json({ error: 'Only single-player worlds can be ended this way' });
    }

    if (world.ownerUserId !== user.id) {
      return res.status(403).json({ error: 'Only the world owner can end this world' });
    }

    if (world.status === 'completed') {
      return res.status(400).json({ error: 'World has already ended' });
    }

    // Mark world as completed
    await world.update({ status: 'completed' });

    // Stop the time service
    try {
      const worldTimeService = require('../services/worldTimeService');
      worldTimeService.stopWorld(worldId);
    } catch (e) {
      // Non-critical — world may not be running
    }

    // Clear active world if this was the user's active world
    if (req.session?.activeWorldId === worldId) {
      req.session.activeWorldId = null;
    }

    res.json({ success: true, message: 'World ended successfully' });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error ending SP world:', error);
    }
    res.status(500).json({ error: 'Failed to end world' });
  }
});

/**
 * Rejoin a single-player world with a fresh airline after bankruptcy
 */
router.post('/rejoin-sp', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { worldId, airlineName, airlineCode, iataCode, baseAirportId, cleaningContractor, groundContractor, engineeringContractor } = req.body;
    const validTiers = ['budget', 'standard', 'premium'];
    const rejCleaningTier = validTiers.includes(cleaningContractor) ? cleaningContractor : 'standard';
    const rejGroundTier = validTiers.includes(groundContractor) ? groundContractor : 'standard';
    const rejEngineeringTier = validTiers.includes(engineeringContractor) ? engineeringContractor : 'standard';

    if (!worldId || !airlineName || !airlineCode || !iataCode || !baseAirportId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!/^[A-Z]{3}$/.test(airlineCode)) {
      return res.status(400).json({ error: 'ICAO code must be 3 uppercase letters' });
    }

    if (!/^[A-Z]{2}$/.test(iataCode)) {
      return res.status(400).json({ error: 'IATA code must be 2 uppercase letters' });
    }

    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const world = await World.findByPk(worldId);
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }

    if (world.worldType !== 'singleplayer') {
      return res.status(400).json({ error: 'Only single-player worlds can be rejoined this way' });
    }

    if (world.ownerUserId !== user.id) {
      return res.status(403).json({ error: 'Only the world owner can rejoin' });
    }

    if (world.status === 'completed') {
      return res.status(400).json({ error: 'Cannot rejoin an ended world' });
    }

    // Check no existing membership
    const existingMembership = await WorldMembership.findOne({
      where: { userId: user.id, worldId }
    });
    if (existingMembership) {
      return res.status(400).json({ error: 'You already have an airline in this world' });
    }

    // Check codes aren't taken in this world
    const icaoTaken = await WorldMembership.findOne({ where: { worldId, airlineCode } });
    if (icaoTaken) {
      return res.status(400).json({ error: 'ICAO code already taken in this world' });
    }

    const iataTaken = await WorldMembership.findOne({ where: { worldId, iataCode } });
    if (iataTaken) {
      return res.status(400).json({ error: 'IATA code already taken in this world' });
    }

    // Verify airport exists
    const airport = await Airport.findByPk(baseAirportId);
    if (!airport) {
      return res.status(404).json({ error: 'Selected airport not found' });
    }

    // Calculate starting capital using current world time (consistent with /join)
    const worldYear = new Date(world.currentTime).getFullYear();
    const startingBalance = eraEconomicService.getStartingCapital(worldYear);

    // Credit deduction start (offset by free weeks)
    const freeWeeks = world.freeWeeks || 0;
    let creditDeductionStart = new Date(world.currentTime);
    if (freeWeeks > 0) {
      creditDeductionStart = new Date(creditDeductionStart.getTime() + (freeWeeks * 7 * 24 * 60 * 60 * 1000));
    }

    // Create new membership
    const membership = await WorldMembership.create({
      userId: user.id,
      worldId: world.id,
      airlineName,
      airlineCode,
      iataCode,
      region: airport.country,
      baseAirportId,
      balance: startingBalance,
      reputation: 50,
      lastCreditDeduction: creditDeductionStart,
      cleaningContractor: rejCleaningTier,
      groundContractor: rejGroundTier,
      engineeringContractor: rejEngineeringTier
    });

    // Auto-approve starter loan (same logic as /join)
    let starterLoanInfo = null;
    try {
      const STARTER_LOAN_BASE_2024 = 20_000_000;
      const starterBankId = 'atlas';
      const starterLoanType = 'fleet_expansion';
      const starterTermWeeks = 104;
      const starterCreditScore = 600;

      const starterAmount = eraEconomicService.convertToEraPrice(STARTER_LOAN_BASE_2024, worldYear);
      const starterBank = getBank(starterBankId);
      const starterRate = calculateOfferRate(starterBankId, starterCreditScore, starterLoanType);
      const starterPayment = calculateFixedPayment(starterAmount, starterRate, starterTermWeeks);

      const gameDate = new Date(world.currentTime).toISOString().split('T')[0];

      await Loan.create({
        worldMembershipId: membership.id,
        bankId: starterBankId,
        loanType: starterLoanType,
        status: 'active',
        principalAmount: starterAmount,
        remainingPrincipal: starterAmount,
        interestRate: starterRate,
        termWeeks: starterTermWeeks,
        weeksRemaining: starterTermWeeks,
        repaymentStrategy: 'fixed',
        weeklyPayment: starterPayment,
        earlyRepaymentFee: starterBank.earlyRepaymentFee,
        paymentHolidaysTotal: starterBank.paymentHolidays,
        paymentHolidaysUsed: 0,
        isOnHoliday: false,
        missedPayments: 0,
        originationGameDate: gameDate,
        creditScoreAtOrigin: starterCreditScore
      });

      membership.balance = parseFloat(membership.balance) + starterAmount;
      await membership.save();

      starterLoanInfo = { amount: starterAmount, rate: starterRate, weeklyPayment: starterPayment, termWeeks: starterTermWeeks };

      await Notification.create({
        worldMembershipId: membership.id,
        type: 'loan_approved',
        title: 'Starter Loan — Atlas Commercial Bank',
        message: `Your airline has been approved for a $${Math.round(starterAmount).toLocaleString()} starter loan at ${starterRate}% APR over ${starterTermWeeks} weeks. Weekly repayment: $${Math.round(starterPayment).toLocaleString()}.`
      });
    } catch (loanErr) {
      console.error('Starter loan creation failed (non-fatal):', loanErr.message);
    }

    // Set as active world
    req.session.activeWorldId = worldId;

    res.json({
      success: true,
      message: 'Rejoined world successfully',
      membershipId: membership.id,
      starterLoan: starterLoanInfo
    });
  } catch (error) {
    console.error('Error rejoining SP world:', error);
    res.status(500).json({ error: error.message || 'Failed to rejoin world' });
  }
});

/**
 * Get global stats across all active worlds
 */
router.get('/global-stats', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Count all aircraft, routes, and airlines across all active worlds
    const [totalAircraft, totalRoutes, totalAirlines] = await Promise.all([
      UserAircraft.count({
        where: { status: { [Op.notIn]: ['sold'] } }
      }),
      Route.count({
        where: { isActive: true }
      }),
      WorldMembership.count()
    ]);

    res.json({ totalAircraft, totalRoutes, totalAirlines });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching global stats:', error);
    }
    res.status(500).json({ error: 'Failed to fetch global stats' });
  }
});

module.exports = router;
