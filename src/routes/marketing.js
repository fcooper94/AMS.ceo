const express = require('express');
const router = express.Router();
const { WorldMembership, User, World } = require('../models');
const MarketingCampaign = require('../models/MarketingCampaign');
const CHANNELS = require('../data/marketingChannels');
const { calcCappedBoost } = require('../data/marketingChannels');
const eraEconomicService = require('../services/eraEconomicService');

/**
 * GET / — Return active/recent campaigns + meta for the frontend
 */
router.get('/', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) return res.status(400).json({ error: 'No active world selected' });

    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });
    if (!membership) return res.status(404).json({ error: 'Not a member of this world' });

    const world = await World.findByPk(activeWorldId);
    if (!world) return res.status(404).json({ error: 'World not found' });

    const gameTime = world.currentTime ? new Date(world.currentTime) : new Date();
    const gameYear = gameTime.getFullYear();
    const currentGameDate = gameTime.toISOString().split('T')[0];
    const eraMultiplier = eraEconomicService.getEraMultiplier(gameYear);

    const campaigns = await MarketingCampaign.findAll({
      where: { worldMembershipId: membership.id },
      order: [['created_at', 'DESC']],
      limit: 30
    });

    // Build available channels list (era-filtered)
    const availableChannels = Object.entries(CHANNELS)
      .filter(([key, ch]) => key !== 'calcCappedBoost' && typeof ch === 'object')
      .map(([key, ch]) => ({
        key,
        name: ch.name,
        description: ch.description,
        icon: ch.icon,
        availableFrom: ch.availableFrom,
        available: gameYear >= ch.availableFrom,
        weeklyBudget: Math.round(ch.baseWeeklyCost * eraMultiplier),
        demandBoost: ch.demandBoost
      }));

    res.json({
      campaigns: campaigns.map(c => ({
        id: c.id,
        channels: c.channels,
        weeklyBudget: parseFloat(c.weeklyBudget),
        demandBoost: parseFloat(c.demandBoost),
        gameStartDate: c.gameStartDate,
        gameEndDate: c.gameEndDate,
        durationWeeks: c.durationWeeks,
        isActive: c.isActive,
        createdAt: c.createdAt
      })),
      availableChannels,
      gameYear,
      currentGameDate,
      eraMultiplier,
      balance: parseFloat(membership.balance) || 0
    });
  } catch (err) {
    console.error('Marketing GET error:', err.message);
    res.status(500).json({ error: 'Failed to load marketing data' });
  }
});

/**
 * POST / — Launch a new campaign bundle
 * Body: { channels: ['tv','radio'], durationWeeks: 4 | null }
 */
router.post('/', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) return res.status(400).json({ error: 'No active world selected' });

    const { channels, durationWeeks } = req.body;

    if (!Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ error: 'Select at least one channel' });
    }

    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });
    if (!membership) return res.status(404).json({ error: 'Not a member of this world' });

    const world = await World.findByPk(activeWorldId);
    const gameTime = world.currentTime ? new Date(world.currentTime) : new Date();
    const gameYear = gameTime.getFullYear();
    const eraMultiplier = eraEconomicService.getEraMultiplier(gameYear);

    // Validate all channels exist and are era-available
    for (const key of channels) {
      const ch = CHANNELS[key];
      if (!ch || typeof ch !== 'object') {
        return res.status(400).json({ error: `Unknown channel: ${key}` });
      }
      if (gameYear < ch.availableFrom) {
        return res.status(400).json({ error: `${ch.name} is not available until ${ch.availableFrom}` });
      }
    }

    // Calculate combined cost (era-scaled) and capped demand boost
    const weeklyBudget = channels.reduce((sum, k) => {
      return sum + Math.round(CHANNELS[k].baseWeeklyCost * eraMultiplier);
    }, 0);
    const demandBoost = calcCappedBoost(channels);

    // Calculate game start/end dates
    const gameStartDate = gameTime.toISOString().split('T')[0];
    let gameEndDate = null;
    const durWeeks = durationWeeks ? parseInt(durationWeeks, 10) : null;
    if (durWeeks && durWeeks > 0) {
      const endDate = new Date(gameTime);
      endDate.setDate(endDate.getDate() + durWeeks * 7);
      gameEndDate = endDate.toISOString().split('T')[0];
    }

    const campaign = await MarketingCampaign.create({
      worldMembershipId: membership.id,
      channels,
      weeklyBudget,
      demandBoost,
      gameStartDate,
      gameEndDate,
      durationWeeks: durWeeks || null,
      isActive: true
    });

    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        channels: campaign.channels,
        weeklyBudget: parseFloat(campaign.weeklyBudget),
        demandBoost: parseFloat(campaign.demandBoost),
        gameStartDate: campaign.gameStartDate,
        gameEndDate: campaign.gameEndDate,
        durationWeeks: campaign.durationWeeks,
        isActive: campaign.isActive
      }
    });
  } catch (err) {
    console.error('Marketing POST error:', err.message);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

/**
 * DELETE /:id — Cancel a campaign immediately
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) return res.status(400).json({ error: 'No active world selected' });

    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });
    if (!membership) return res.status(404).json({ error: 'Not a member of this world' });

    const campaign = await MarketingCampaign.findOne({
      where: { id: req.params.id, worldMembershipId: membership.id }
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    await campaign.update({ isActive: false });
    res.json({ success: true });
  } catch (err) {
    console.error('Marketing DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to cancel campaign' });
  }
});

module.exports = router;
