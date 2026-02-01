const express = require('express');
const router = express.Router();
const path = require('path');
const { WorldMembership, UserAircraft, Aircraft, User, Airport, RecurringMaintenance } = require('../models');
const { REGISTRATION_RULES, validateRegistrationSuffix, getRegistrationPrefix, hasSpecificRule } = require(path.join(__dirname, '../../public/js/registrationPrefixes.js'));

/**
 * Get user's fleet for current world
 */
router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    // Get user's membership
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Get fleet
    const fleet = await UserAircraft.findAll({
      where: { worldMembershipId: membership.id },
      include: [
        {
          model: Aircraft,
          as: 'aircraft'
        }
      ],
      order: [['acquiredAt', 'DESC']]
    });

    res.json(fleet);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching fleet:', error);
    }
    res.status(500).json({ error: 'Failed to fetch fleet' });
  }
});

/**
 * Purchase aircraft
 */
router.post('/purchase', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    const {
      aircraftId,
      category, // 'new' or 'used'
      condition,
      conditionPercentage,
      ageYears,
      purchasePrice,
      maintenanceCostPerHour,
      fuelBurnPerHour,
      registration
    } = req.body;

    if (!aircraftId || !category || !purchasePrice || !registration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user's membership
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Check if user has enough balance
    const price = Number(purchasePrice);
    if (membership.balance < price) {
      return res.status(400).json({
        error: 'Insufficient funds',
        required: price,
        available: membership.balance
      });
    }

    // Verify aircraft exists
    const aircraft = await Aircraft.findByPk(aircraftId);
    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found' });
    }

    // Get base airport to determine country for registration validation
    let baseAirportCode = null;
    let baseCountry = null;
    if (membership.baseAirportId) {
      const baseAirport = await Airport.findByPk(membership.baseAirportId);
      if (baseAirport) {
        baseAirportCode = baseAirport.icaoCode;
        baseCountry = baseAirport.country;
      }
    }

    // Validate registration format
    const registrationUpper = registration.trim().toUpperCase();

    // Basic validation
    if (registrationUpper.length < 3 || registrationUpper.length > 10) {
      return res.status(400).json({ error: 'Registration must be between 3 and 10 characters' });
    }
    if (!/^[A-Z0-9]/.test(registrationUpper)) {
      return res.status(400).json({ error: 'Registration must start with a letter or number' });
    }
    if (!/^[A-Z0-9-]+$/.test(registrationUpper)) {
      return res.status(400).json({ error: 'Registration can only contain letters, numbers, and hyphens' });
    }

    // Country-specific validation if we know the base country
    if (baseCountry) {
      const prefix = getRegistrationPrefix(baseCountry);
      if (registrationUpper.startsWith(prefix.replace('-', ''))) {
        // Extract suffix (part after prefix)
        const suffix = registrationUpper.substring(prefix.length);
        const validation = validateRegistrationSuffix(suffix, prefix);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.message });
        }
      }
    }

    // Check if registration is already in use
    const existingAircraft = await UserAircraft.findOne({ where: { registration: registrationUpper } });
    if (existingAircraft) {
      return res.status(400).json({ error: 'Registration already in use' });
    }

    // Create user aircraft
    const userAircraft = await UserAircraft.create({
      worldMembershipId: membership.id,
      aircraftId,
      acquisitionType: 'purchase',
      condition: condition || 'New',
      conditionPercentage: conditionPercentage || 100,
      ageYears: ageYears || 0,
      purchasePrice: price,
      maintenanceCostPerHour,
      fuelBurnPerHour,
      registration: registrationUpper,
      currentAirport: baseAirportCode,
      status: 'active'
    });

    // Deduct from balance
    membership.balance -= price;
    await membership.save();

    // Include aircraft details in response
    const result = await UserAircraft.findByPk(userAircraft.id, {
      include: [{
        model: Aircraft,
        as: 'aircraft'
      }]
    });

    res.json({
      message: 'Aircraft purchased successfully',
      aircraft: result,
      newBalance: membership.balance
    });
  } catch (error) {
    console.error('Error purchasing aircraft:', error);
    res.status(500).json({
      error: 'Failed to purchase aircraft',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Lease aircraft
 */
router.post('/lease', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    const {
      aircraftId,
      category,
      condition,
      conditionPercentage,
      ageYears,
      leaseMonthlyPayment,
      leaseDurationMonths,
      maintenanceCostPerHour,
      fuelBurnPerHour,
      purchasePrice, // For reference
      registration
    } = req.body;

    if (!aircraftId || !leaseMonthlyPayment || !leaseDurationMonths || !registration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user's membership
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Check if user can afford first month's payment
    const monthlyPayment = Number(leaseMonthlyPayment);
    if (membership.balance < monthlyPayment) {
      return res.status(400).json({
        error: 'Insufficient funds for first lease payment',
        required: monthlyPayment,
        available: membership.balance
      });
    }

    // Verify aircraft exists
    const aircraft = await Aircraft.findByPk(aircraftId);
    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found' });
    }

    // Get base airport to determine country for registration validation
    let baseAirportCode = null;
    let baseCountry = null;
    if (membership.baseAirportId) {
      const baseAirport = await Airport.findByPk(membership.baseAirportId);
      if (baseAirport) {
        baseAirportCode = baseAirport.icaoCode;
        baseCountry = baseAirport.country;
      }
    }

    // Validate registration format
    const registrationUpper = registration.trim().toUpperCase();

    // Basic validation
    if (registrationUpper.length < 3 || registrationUpper.length > 10) {
      return res.status(400).json({ error: 'Registration must be between 3 and 10 characters' });
    }
    if (!/^[A-Z0-9]/.test(registrationUpper)) {
      return res.status(400).json({ error: 'Registration must start with a letter or number' });
    }
    if (!/^[A-Z0-9-]+$/.test(registrationUpper)) {
      return res.status(400).json({ error: 'Registration can only contain letters, numbers, and hyphens' });
    }

    // Country-specific validation if we know the base country
    if (baseCountry) {
      const prefix = getRegistrationPrefix(baseCountry);
      if (registrationUpper.startsWith(prefix.replace('-', ''))) {
        // Extract suffix (part after prefix)
        const suffix = registrationUpper.substring(prefix.length);
        const validation = validateRegistrationSuffix(suffix, prefix);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.message });
        }
      }
    }

    // Check if registration is already in use
    const existingAircraft = await UserAircraft.findOne({ where: { registration: registrationUpper } });
    if (existingAircraft) {
      return res.status(400).json({ error: 'Registration already in use' });
    }

    const now = new Date();
    const leaseEnd = new Date(now);
    leaseEnd.setMonth(leaseEnd.getMonth() + parseInt(leaseDurationMonths));

    // Create leased aircraft
    const userAircraft = await UserAircraft.create({
      worldMembershipId: membership.id,
      aircraftId,
      acquisitionType: 'lease',
      condition: condition || 'New',
      conditionPercentage: conditionPercentage || 100,
      ageYears: ageYears || 0,
      purchasePrice: purchasePrice || null,
      leaseMonthlyPayment: monthlyPayment,
      leaseDurationMonths: parseInt(leaseDurationMonths),
      leaseStartDate: now,
      leaseEndDate: leaseEnd,
      maintenanceCostPerHour,
      fuelBurnPerHour,
      registration: registrationUpper,
      currentAirport: baseAirportCode,
      status: 'active'
    });

    // Deduct first month's payment
    membership.balance -= monthlyPayment;
    await membership.save();

    // Include aircraft details in response
    const result = await UserAircraft.findByPk(userAircraft.id, {
      include: [{
        model: Aircraft,
        as: 'aircraft'
      }]
    });

    res.json({
      message: 'Aircraft leased successfully',
      aircraft: result,
      newBalance: membership.balance
    });
  } catch (error) {
    console.error('Error leasing aircraft:', error);
    res.status(500).json({
      error: 'Failed to lease aircraft',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get maintenance status for all aircraft
 */
router.get('/maintenance', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    // Get user's membership
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Get fleet with maintenance check dates
    const fleet = await UserAircraft.findAll({
      where: { worldMembershipId: membership.id },
      include: [
        {
          model: Aircraft,
          as: 'aircraft'
        }
      ],
      order: [['registration', 'ASC']]
    });

    res.json(fleet);
  } catch (error) {
    console.error('Error fetching maintenance data:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance data' });
  }
});

/**
 * Record a maintenance check
 */
router.post('/maintenance/:aircraftId/check', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { aircraftId } = req.params;
    const { checkType } = req.body;

    if (!['A', 'B', 'C', 'D'].includes(checkType)) {
      return res.status(400).json({ error: 'Invalid check type' });
    }

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    // Get user's membership
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Find the aircraft and verify ownership
    const aircraft = await UserAircraft.findOne({
      where: { id: aircraftId, worldMembershipId: membership.id }
    });

    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found' });
    }

    // Update the appropriate check date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const updateField = {
      'A': 'lastACheckDate',
      'B': 'lastBCheckDate',
      'C': 'lastCCheckDate',
      'D': 'lastDCheckDate'
    }[checkType];

    await aircraft.update({ [updateField]: today });

    res.json({
      message: `${checkType} Check recorded successfully`,
      checkDate: today,
      aircraft: aircraft
    });
  } catch (error) {
    console.error('Error recording maintenance check:', error);
    res.status(500).json({ error: 'Failed to record maintenance check' });
  }
});

module.exports = router;
