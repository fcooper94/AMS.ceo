const express = require('express');
const router = express.Router();
const worldTimeService = require('../services/worldTimeService');
const World = require('../models/World');

/**
 * Get current world information
 */
router.get('/info', async (req, res) => {
  try {
    const worldInfo = await worldTimeService.getWorldInfo();

    if (!worldInfo) {
      return res.status(404).json({
        error: 'No active world found',
        message: 'Please create a world first'
      });
    }

    res.json(worldInfo);
  } catch (error) {
    console.error('Error getting world info:', error);
    res.status(500).json({ error: 'Failed to get world information' });
  }
});

/**
 * Get current game time
 */
router.get('/time', async (req, res) => {
  try {
    const currentTime = await worldTimeService.getCurrentTime();

    if (!currentTime) {
      return res.status(404).json({ error: 'No active world found' });
    }

    res.json({
      gameTime: currentTime.toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting world time:', error);
    res.status(500).json({ error: 'Failed to get world time' });
  }
});

/**
 * Pause the world
 */
router.post('/pause', async (req, res) => {
  try {
    await worldTimeService.pauseWorld();
    res.json({ message: 'World paused', status: 'paused' });
  } catch (error) {
    console.error('Error pausing world:', error);
    res.status(500).json({ error: 'Failed to pause world' });
  }
});

/**
 * Resume the world
 */
router.post('/resume', async (req, res) => {
  try {
    await worldTimeService.resumeWorld();
    res.json({ message: 'World resumed', status: 'active' });
  } catch (error) {
    console.error('Error resuming world:', error);
    res.status(500).json({ error: 'Failed to resume world' });
  }
});

/**
 * Set time acceleration
 */
router.post('/acceleration', async (req, res) => {
  try {
    const { factor } = req.body;

    if (!factor || factor <= 0) {
      return res.status(400).json({ error: 'Invalid acceleration factor' });
    }

    await worldTimeService.setTimeAcceleration(parseFloat(factor));

    res.json({
      message: 'Time acceleration updated',
      factor: parseFloat(factor)
    });
  } catch (error) {
    console.error('Error setting acceleration:', error);
    res.status(500).json({ error: 'Failed to set time acceleration' });
  }
});

/**
 * Get all worlds
 */
router.get('/list', async (req, res) => {
  try {
    const worlds = await World.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.json(worlds);
  } catch (error) {
    console.error('Error listing worlds:', error);
    res.status(500).json({ error: 'Failed to list worlds' });
  }
});

module.exports = router;
