const express = require('express');
const router = express.Router();
const { World, WorldMembership, User } = require('../models');

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

    // Get all active worlds
    const worlds = await World.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'description', 'era', 'currentTime', 'timeAcceleration', 'maxPlayers'],
      order: [['createdAt', 'DESC']]
    });

    // Get user's memberships if they exist
    let userMemberships = [];
    if (user) {
      userMemberships = await WorldMembership.findAll({
        where: { userId: user.id },
        attributes: ['worldId', 'airlineName', 'airlineCode']
      });
    }

    const membershipMap = new Map(userMemberships.map(m => [m.worldId, m]));

    // Enhance worlds with membership status
    const worldsWithStatus = await Promise.all(worlds.map(async (world) => {
      const memberCount = await WorldMembership.count({ where: { worldId: world.id } });
      const membership = membershipMap.get(world.id);

      return {
        ...world.toJSON(),
        memberCount,
        isMember: !!membership,
        airlineName: membership?.airlineName,
        airlineCode: membership?.airlineCode
      };
    }));

    res.json(worldsWithStatus);
  } catch (error) {
    console.error('Error fetching worlds:', error);
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

    const { worldId, airlineName, airlineCode } = req.body;

    if (!worldId || !airlineName || !airlineCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate airline code format (3 letters)
    if (!/^[A-Z]{3}$/.test(airlineCode)) {
      return res.status(400).json({ error: 'Airline code must be 3 uppercase letters' });
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

    // Check if world exists
    const world = await World.findByPk(worldId);
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }

    // Check if already a member
    const existing = await WorldMembership.findOne({
      where: { userId: user.id, worldId }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already a member of this world' });
    }

    // Check if airline code is taken
    const codeTaken = await WorldMembership.findOne({
      where: { worldId, airlineCode }
    });

    if (codeTaken) {
      return res.status(400).json({ error: 'Airline code already taken in this world' });
    }

    // Create membership
    const membership = await WorldMembership.create({
      userId: user.id,
      worldId,
      airlineName,
      airlineCode,
      balance: 1000000.00, // Starting capital
      reputation: 50
    });

    res.json({
      message: 'Successfully joined world',
      membership: {
        worldId: membership.worldId,
        airlineName: membership.airlineName,
        airlineCode: membership.airlineCode,
        balance: membership.balance
      }
    });
  } catch (error) {
    console.error('Error joining world:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Airline code already taken' });
    }

    res.status(500).json({ error: 'Failed to join world' });
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
        attributes: ['id', 'name', 'description', 'era', 'currentTime', 'timeAcceleration', 'status']
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
      joinedAt: m.joinedAt
    }));

    res.json(myWorlds);
  } catch (error) {
    console.error('Error fetching user worlds:', error);
    res.status(500).json({ error: 'Failed to fetch your worlds' });
  }
});

module.exports = router;
