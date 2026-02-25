const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { User, SystemSettings } = require('../models');
const { Op } = require('sequelize');
const { sendEmail } = require('../utils/mailer');

// Login route - redirects to VATSIM OAuth
router.get('/login', passport.authenticate('vatsim'));

// Check if dev bypass is enabled (public endpoint for login page)
// Can be enabled via: 1) SystemSettings in DB, 2) DEV_BYPASS_ENABLED env var, 3) NODE_ENV=development
router.get('/bypass-enabled', async (req, res) => {
  try {
    // Check environment variable first (allows bypass without DB access)
    if (process.env.DEV_BYPASS_ENABLED === 'true' || process.env.NODE_ENV === 'development') {
      return res.json({ enabled: true });
    }
    const enabled = await SystemSettings.get('devBypassEnabled', false);
    res.json({ enabled: enabled === true || enabled === 'true' });
  } catch (error) {
    // If DB fails but we're in dev mode, still allow bypass
    if (process.env.NODE_ENV === 'development') {
      return res.json({ enabled: true });
    }
    res.json({ enabled: false });
  }
});

// Dev bypass login - only works when enabled in settings or dev environment
router.post('/dev-bypass', async (req, res) => {
  try {
    // Check environment first
    const envEnabled = process.env.DEV_BYPASS_ENABLED === 'true' || process.env.NODE_ENV === 'development';

    if (!envEnabled) {
      // Fall back to DB setting
      const enabled = await SystemSettings.get('devBypassEnabled', false);
      if (enabled !== true && enabled !== 'true') {
        return res.status(403).json({ error: 'Dev bypass is not enabled' });
      }
    }

    const { bypassPassword, userId } = req.body;

    // Validate bypass password from environment variable (defaults to 'devpass' if not set)
    const expectedPassword = process.env.DEV_BYPASS_PASSWORD || 'devpass';
    if (bypassPassword !== expectedPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // If no userId provided, return user list for selection
    if (!userId) {
      try {
        const users = await User.findAll({
          attributes: ['id', 'vatsimId', 'firstName', 'lastName', 'email', 'isAdmin'],
          order: [['lastName', 'ASC'], ['firstName', 'ASC']]
        });
        return res.json({ authenticated: true, users: users.map(u => u.toJSON()) });
      } catch (dbErr) {
        console.error('Error fetching users for dev bypass:', dbErr);
        return res.status(500).json({ error: 'Failed to fetch user list: ' + dbErr.message });
      }
    }

    // Find or create the target user
    let user;
    if (userId === 'new') {
      // Create/find default dev user
      user = await User.findOne({ where: { vatsimId: '10000010' } });
      if (!user) {
        user = await User.create({
          vatsimId: '10000010',
          firstName: 'WebTen',
          lastName: 'Dev',
          email: 'dev@localhost',
          rating: 'C1',
          pilotRating: 0,
          division: 'DEV',
          isAdmin: true,
          credits: 100
        });
      }
    } else {
      user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    // Log the user in
    req.login(user, (err) => {
      if (err) {
        console.error('Dev bypass req.login() failed:', err);
        return res.status(500).json({ error: 'Login failed: ' + err.message });
      }
      res.json({ success: true, redirect: '/world-selection' });
    });
  } catch (error) {
    console.error('Dev bypass error:', error);
    res.status(500).json({ error: 'Dev bypass failed: ' + error.message });
  }
});

// Local registration
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, captcha, captchaExpected } = req.body;

    // Validate captcha
    if (!captcha || !captchaExpected) {
      return res.status(400).json({ error: 'Human verification is required' });
    }
    if (captcha.toString().trim() !== captchaExpected.toString().trim()) {
      return res.status(400).json({ error: 'Human verification failed. Please try again.' });
    }

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (firstName.trim().length < 1 || lastName.trim().length < 1) {
      return res.status(400).json({ error: 'First and last name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check email uniqueness among local users
    const existing = await User.findOne({
      where: { email: email.toLowerCase(), authMethod: 'local' }
    });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      vatsimId: 'LOCAL-' + uuidv4(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase(),
      passwordHash,
      authMethod: 'local',
      lastLogin: new Date()
    });

    // Send welcome email (non-blocking)
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    sendEmail({
      to: user.email,
      subject: `Welcome to AMS.ceo, ${user.firstName}!`,
      html: `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #0d1117; margin: 0; padding: 0;">
          <tr><td align="center" style="padding: 2rem 1rem;">
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #161b22; color: #c9d1d9; border-radius: 8px; overflow: hidden; border: 1px solid #21262d;">
              <div style="background: #0d1117; padding: 2rem 2rem 1.5rem; text-align: center; border-bottom: 1px solid #21262d;">
                <div style="font-size: 2rem; font-weight: 700; color: #fff; letter-spacing: -0.5px;">AMS<span style="color: #93c5fd; font-size: 0.6em; font-weight: 400;">.ceo</span></div>
                <div style="font-size: 0.65rem; color: #8b949e; text-transform: uppercase; letter-spacing: 2px; margin-top: 0.25rem;">Airline Management Sim</div>
              </div>
              <div style="padding: 2rem;">
                <h1 style="color: #fff; font-size: 1.4rem; margin: 0 0 0.5rem 0;">Welcome aboard, ${user.firstName}!</h1>
                <p style="color: #8b949e; font-size: 0.85rem; margin: 0 0 1.5rem 0;">Your account has been created and you're ready to build your airline empire.</p>
                <div style="background: #0d1117; border: 1px solid #21262d; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem;">
                  <div style="font-size: 0.7rem; font-weight: 700; color: #8b949e; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 1rem;">Getting Started</div>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 0.5rem 0.75rem 0.5rem 0; vertical-align: top; width: 24px;">
                        <div style="width: 22px; height: 22px; border-radius: 50%; background: rgba(37, 99, 235, 0.2); color: #93c5fd; font-size: 0.7rem; font-weight: 700; text-align: center; line-height: 22px;">1</div>
                      </td>
                      <td style="padding: 0.5rem 0; color: #c9d1d9; font-size: 0.85rem;"><strong style="color: #fff;">Join a World</strong> - Choose a multiplayer or singleplayer world to start in</td>
                    </tr>
                    <tr>
                      <td style="padding: 0.5rem 0.75rem 0.5rem 0; vertical-align: top;">
                        <div style="width: 22px; height: 22px; border-radius: 50%; background: rgba(37, 99, 235, 0.2); color: #93c5fd; font-size: 0.7rem; font-weight: 700; text-align: center; line-height: 22px;">2</div>
                      </td>
                      <td style="padding: 0.5rem 0; color: #c9d1d9; font-size: 0.85rem;"><strong style="color: #fff;">Set Up Your Airline</strong> - Pick a name, codes, and your home hub</td>
                    </tr>
                    <tr>
                      <td style="padding: 0.5rem 0.75rem 0.5rem 0; vertical-align: top;">
                        <div style="width: 22px; height: 22px; border-radius: 50%; background: rgba(37, 99, 235, 0.2); color: #93c5fd; font-size: 0.7rem; font-weight: 700; text-align: center; line-height: 22px;">3</div>
                      </td>
                      <td style="padding: 0.5rem 0; color: #c9d1d9; font-size: 0.85rem;"><strong style="color: #fff;">Buy Your First Aircraft</strong> - Head to the marketplace and start flying</td>
                    </tr>
                  </table>
                </div>
                <div style="text-align: center; margin-bottom: 1.5rem;">
                  <a href="${baseUrl}/dashboard" style="display: inline-block; background: #2563eb; color: #fff; padding: 0.75rem 2.5rem; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.9rem;">Go to Dashboard</a>
                </div>
                <div style="background: #0d1117; border: 1px solid #21262d; border-radius: 8px; padding: 1rem 1.25rem;">
                  <table style="width: 100%;"><tr>
                    <td style="text-align: center; padding: 0.25rem;">
                      <a href="${baseUrl}/wiki" style="color: #93c5fd; text-decoration: none; font-size: 0.85rem; font-weight: 600;">Wiki &amp; Guides</a>
                      <div style="color: #8b949e; font-size: 0.75rem; margin-top: 0.25rem;">Step-by-step tutorials</div>
                    </td>
                    <td style="width: 1px; background: #21262d;"></td>
                    <td style="text-align: center; padding: 0.25rem;">
                      <a href="${baseUrl}/contact" style="color: #93c5fd; text-decoration: none; font-size: 0.85rem; font-weight: 600;">Contact Us</a>
                      <div style="color: #8b949e; font-size: 0.75rem; margin-top: 0.25rem;">Questions or feedback</div>
                    </td>
                  </tr></table>
                </div>
              </div>
              <div style="padding: 1.25rem 2rem; border-top: 1px solid #21262d; text-align: center;">
                <p style="font-size: 0.7rem; color: #8b949e; margin: 0;">Expand &#9670; Explore &#9670; Evolve</p>
                <p style="font-size: 0.7rem; color: #484f58; margin: 0.5rem 0 0 0;">&copy; 2026 AMS.ceo - Airline Management Sim</p>
              </div>
            </div>
          </td></tr>
        </table>
      `,
      text: `Welcome aboard, ${user.firstName}!\n\nYour AMS.ceo account has been created and you're ready to build your airline empire.\n\nGetting Started:\n1. Join a World - Choose a multiplayer or singleplayer world\n2. Set Up Your Airline - Pick a name, codes, and your home hub\n3. Buy Your First Aircraft - Head to the marketplace and start flying\n\nGo to Dashboard: ${baseUrl}/dashboard\n\nNeed help?\n- Wiki & Guides: ${baseUrl}/wiki\n- Contact Us: ${baseUrl}/contact\n\nExpand ~ Explore ~ Evolve\nAMS.ceo - Airline Management Sim`
    }).catch(err => console.error('Welcome email error:', err));

    // Create session (same shape as VATSIM users)
    const sessionUser = {
      id: user.id,
      vatsimId: user.vatsimId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      rating: 0,
      pilotRating: 0,
      division: null,
      subdivision: null
    };

    req.login(sessionUser, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Registration succeeded but login failed' });
      }
      res.json({ success: true, redirect: '/world-selection' });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Local login
router.post('/local-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find local user by email
    const user = await User.findOne({
      where: { email: email.toLowerCase(), authMethod: 'local' }
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Create session (same shape as VATSIM users)
    const sessionUser = {
      id: user.id,
      vatsimId: user.vatsimId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      rating: 0,
      pilotRating: 0,
      division: null,
      subdivision: null
    };

    req.login(sessionUser, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }
      res.json({ success: true, redirect: '/world-selection' });
    });
  } catch (error) {
    console.error('Local login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

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
router.get('/status', async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      // Fetch full user data from database to get current credits and roles
      const dbUser = await User.findOne({
        where: { vatsimId: req.user.vatsimId },
        attributes: ['credits', 'isAdmin', 'isContributor', 'unlimitedCredits']
      });

      res.json({
        authenticated: true,
        user: {
          vatsimId: req.user.vatsimId,
          name: `${req.user.firstName} ${req.user.lastName}`,
          rating: req.user.rating,
          credits: dbUser ? dbUser.credits : 0,
          isAdmin: dbUser ? dbUser.isAdmin : false,
          isContributor: dbUser ? dbUser.isContributor : false,
          unlimitedCredits: dbUser ? dbUser.unlimitedCredits : false
        }
      });
    } catch (error) {
      console.error('Error fetching user credits:', error);
      res.json({
        authenticated: true,
        user: {
          vatsimId: req.user.vatsimId,
          name: `${req.user.firstName} ${req.user.lastName}`,
          rating: req.user.rating,
          credits: 0,
          isAdmin: false,
          isContributor: false
        }
      });
    }
  } else {
    res.json({ authenticated: false });
  }
});

// Request password reset (sends email with reset link)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    // Always return success to prevent email enumeration
    const successMsg = 'If an account with that email exists, a password reset link has been sent.';

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim(), authMethod: 'local' }
    });

    if (!user) {
      return res.json({ success: true, message: successMsg });
    }

    // Generate reset token and set 1-hour expiry
    const resetToken = uuidv4();
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // Build reset URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // Send email
    await sendEmail({
      to: user.email,
      subject: 'AMS.ceo - Password Reset',
      html: `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #0d1117; margin: 0; padding: 0;">
          <tr><td align="center" style="padding: 2rem 1rem;">
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #161b22; color: #c9d1d9; padding: 2rem; border-radius: 8px; border: 1px solid #21262d;">
              <div style="text-align: center; margin-bottom: 1.5rem;">
                <span style="font-size: 1.5rem; font-weight: 700; color: #fff;">AMS<span style="color: #93c5fd; font-size: 0.65em;">.ceo</span></span>
              </div>
              <h2 style="color: #fff; margin-bottom: 0.5rem;">Password Reset</h2>
              <p>Hi ${user.firstName},</p>
              <p>We received a request to reset your password. Click the button below to set a new password:</p>
              <div style="text-align: center; margin: 1.5rem 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 0.75rem 2rem; border-radius: 6px; text-decoration: none; font-weight: 600;">Reset Password</a>
              </div>
              <p style="font-size: 0.85rem; color: #8b949e;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #21262d; margin: 1.5rem 0;">
              <p style="font-size: 0.75rem; color: #8b949e; text-align: center;">AMS.ceo - Airline Management Sim</p>
            </div>
          </td></tr>
        </table>
      `,
      text: `Hi ${user.firstName},\n\nWe received a request to reset your password. Visit the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.\n\nAMS.ceo - Airline Management Sim`
    });

    res.json({ success: true, message: successMsg });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Reset password via token (from email link)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ success: true, message: 'Password has been reset. You can now sign in.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

module.exports = router;
