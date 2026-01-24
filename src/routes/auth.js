const express = require('express');
const router = express.Router();
const passport = require('../config/passport');

// Login route - redirects to VATSIM OAuth
router.get('/login', passport.authenticate('vatsim'));

// OAuth callback route
router.get('/vatsim/callback',
  passport.authenticate('vatsim', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to world selection
    res.redirect('/world-selection');
  }
);

// Logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

// Check auth status
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        vatsimId: req.user.vatsimId,
        name: `${req.user.firstName} ${req.user.lastName}`,
        rating: req.user.rating
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;
