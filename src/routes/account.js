const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sequelize = require('../config/database');
const { User, Payment, WorldMembership, World, UserAircraft, Route,
        ScheduledFlight, Loan, WeeklyFinancial, SightseeingTour,
        MarketingCampaign } = require('../models');

// ── 2FA helpers (same logic as admin2fa.js, for any authenticated user) ───
let authenticator, QRCode;
try { authenticator = require('otplib').authenticator; authenticator.options = { window: 1 }; } catch (_) { /* otplib optional */ }
try { QRCode = require('qrcode'); } catch (_) { /* qrcode optional */ }

const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');

function genBackupCodes(n) {
  n = n || 8;
  const codes = [], hashes = [];
  for (let i = 0; i < n; i++) {
    const c = crypto.randomBytes(5).toString('hex');
    codes.push(c.replace(/(.{5})(.{5})/, '$1-$2'));
    hashes.push(sha256(c));
  }
  return { codes, hashes };
}

async function me(req) {
  return User.findOne({ where: req.user.id ? { id: req.user.id } : { vatsimId: req.user.vatsimId } });
}

// GET /api/account — return the current user's profile
router.get('/', async (req, res) => {
  try {
    const user = await User.findOne({
      where: req.user.id ? { id: req.user.id } : { vatsimId: req.user.vatsimId },
      attributes: ['id', 'firstName', 'lastName', 'email', 'credits', 'unlimitedCredits', 'notificationPreferences', 'createdAt']
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
      credits: user.credits,
      unlimitedCredits: user.unlimitedCredits,
      notificationPreferences: user.notificationPreferences || {},
      memberSince: user.createdAt
    });
  } catch (err) {
    console.error('[Account] Failed to fetch profile:', err.message);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// PUT /api/account/name — update display name
router.put('/name', async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    if (!firstName || !firstName.trim()) return res.status(400).json({ error: 'First name is required' });
    if (!lastName || !lastName.trim()) return res.status(400).json({ error: 'Last name is required' });

    const user = await User.findOne({
      where: req.user.id ? { id: req.user.id } : { vatsimId: req.user.vatsimId }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.firstName = firstName.trim();
    user.lastName = lastName.trim();
    await user.save();

    // Update session so the navbar reflects the change immediately
    req.user.firstName = user.firstName;
    req.user.lastName = user.lastName;

    res.json({ success: true });
  } catch (err) {
    console.error('[Account] Failed to update name:', err.message);
    res.status(500).json({ error: 'Failed to update name' });
  }
});

// PUT /api/account/email — update email address
router.put('/email', async (req, res) => {
  try {
    const { email, password, totpCode } = req.body;
    if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required' });
    if (!password) return res.status(400).json({ error: 'Current password is required to change email' });

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const user = await User.findOne({
      where: req.user.id ? { id: req.user.id } : { vatsimId: req.user.vatsimId }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify current password
    if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(403).json({ error: 'Incorrect password' });
    }

    // Verify 2FA code if enabled
    if (user.totpEnabled && user.totpSecret) {
      if (!totpCode) return res.status(400).json({ error: '2FA code is required' });
      if (!authenticator || !authenticator.verify({ token: totpCode.replace(/\s/g, ''), secret: user.totpSecret })) {
        return res.status(403).json({ error: 'Invalid 2FA code' });
      }
    }

    // Check email isn't taken by another user
    const existing = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existing && existing.id !== user.id) {
      return res.status(409).json({ error: 'That email is already in use' });
    }

    user.email = email.trim().toLowerCase();
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error('[Account] Failed to update email:', err.message);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// PUT /api/account/password — change password
router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword, totpCode } = req.body;
    if (!currentPassword) return res.status(400).json({ error: 'Current password is required' });
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain letters, a number and a symbol' });
    }

    const user = await User.findOne({
      where: req.user.id ? { id: req.user.id } : { vatsimId: req.user.vatsimId }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify current password
    if (!user.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(403).json({ error: 'Incorrect current password' });
    }

    // Verify 2FA code if enabled
    if (user.totpEnabled && user.totpSecret) {
      if (!totpCode) return res.status(400).json({ error: '2FA code is required' });
      if (!authenticator || !authenticator.verify({ token: totpCode.replace(/\s/g, ''), secret: user.totpSecret })) {
        return res.status(403).json({ error: 'Invalid 2FA code' });
      }
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error('[Account] Failed to change password:', err.message);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /api/account/invoices — payment/invoice history
router.get('/invoices', async (req, res) => {
  try {
    const user = await User.findOne({
      where: req.user.id ? { id: req.user.id } : { vatsimId: req.user.vatsimId },
      attributes: ['id']
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const payments = await Payment.findAll({
      where: { userId: user.id, status: 'paid' },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'packId', 'credits', 'amount', 'currency', 'invoiceUrl', 'receiptUrl', 'refundedAt', 'creditNoteUrl', 'createdAt']
    });

    res.json(payments.map(p => ({
      id: p.id,
      pack: p.packId,
      credits: p.credits,
      amount: p.amount,
      currency: p.currency,
      invoiceUrl: p.invoiceUrl,
      receiptUrl: p.receiptUrl,
      refunded: !!p.refundedAt,
      refundedAt: p.refundedAt,
      creditNoteUrl: p.creditNoteUrl,
      date: p.createdAt
    })));
  } catch (err) {
    console.error('[Account] Failed to fetch invoices:', err.message);
    res.status(500).json({ error: 'Failed to load invoices' });
  }
});

// ── 2FA routes (/api/account/2fa/*) ───────────────────────────────────────

// Status
router.get('/2fa/status', async (req, res) => {
  try {
    const u = await me(req);
    res.json({
      enabled: !!(u && u.totpEnabled),
      loginRequired: !!(u && u.totpLoginRequired),
      isAdmin: !!(u && u.isAdmin)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check 2FA status' });
  }
});

// Begin setup — generate secret + QR + backup codes
router.post('/2fa/setup', async (req, res) => {
  if (!authenticator || !QRCode) return res.status(500).json({ error: '2FA dependencies not installed' });
  try {
    const u = await me(req);
    if (!u) return res.status(404).json({ error: 'User not found' });
    if (u.totpEnabled) return res.status(400).json({ error: '2FA is already enabled. Disable it first to re-enrol.' });

    const secret = authenticator.generateSecret();
    const account = u.email || (u.firstName + ' ' + u.lastName).trim() || u.vatsimId || 'user';
    const otpauth = authenticator.keyuri(account, 'AMS.ceo', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    const { codes, hashes } = genBackupCodes();

    req.session.pendingTotp = { secret, backupHashes: hashes };
    res.json({ secret, otpauth, qrDataUrl, backupCodes: codes });
  } catch (err) {
    console.error('[Account-2FA] setup failed:', err.message);
    res.status(500).json({ error: 'Could not start 2FA setup' });
  }
});

// Confirm setup — verify code then persist
router.post('/2fa/enable', async (req, res) => {
  if (!authenticator) return res.status(500).json({ error: '2FA dependencies not installed' });
  try {
    const pending = req.session.pendingTotp;
    if (!pending) return res.status(400).json({ error: 'No pending setup — start again.' });
    const code = (req.body && req.body.code || '').replace(/\s/g, '');
    if (!authenticator.verify({ token: code, secret: pending.secret })) {
      return res.status(400).json({ error: 'Incorrect code — check your authenticator and try again.' });
    }
    const u = await me(req);
    u.totpSecret = pending.secret;
    u.totpEnabled = true;
    u.totpBackupCodes = pending.backupHashes;
    await u.save();
    delete req.session.pendingTotp;
    // Also mark admin 2FA session as verified so they don't get prompted again
    req.session.adminTwoFA = true;
    res.json({ success: true });
  } catch (err) {
    console.error('[Account-2FA] enable failed:', err.message);
    res.status(500).json({ error: 'Could not enable 2FA' });
  }
});

// Disable 2FA — requires a valid current code
router.post('/2fa/disable', async (req, res) => {
  if (!authenticator) return res.status(500).json({ error: '2FA dependencies not installed' });
  try {
    const u = await me(req);
    if (!u || !u.totpEnabled) return res.status(400).json({ error: '2FA is not enabled' });
    const code = (req.body && req.body.code || '').replace(/\s/g, '');
    if (!authenticator.verify({ token: code, secret: u.totpSecret })) {
      return res.status(400).json({ error: 'Incorrect code.' });
    }
    u.totpEnabled = false;
    u.totpSecret = null;
    u.totpBackupCodes = null;
    await u.save();
    res.json({ success: true });
  } catch (err) {
    console.error('[Account-2FA] disable failed:', err.message);
    res.status(500).json({ error: 'Could not disable 2FA' });
  }
});

// Toggle login-time 2FA requirement (any user with 2FA enabled)
router.put('/2fa/login-required', async (req, res) => {
  try {
    const u = await me(req);
    if (!u) return res.status(404).json({ error: 'User not found' });
    if (!u.totpEnabled) return res.status(400).json({ error: 'Enable 2FA first' });
    u.totpLoginRequired = !!req.body.enabled;
    await u.save();
    res.json({ success: true, loginRequired: u.totpLoginRequired });
  } catch (err) {
    console.error('[Account-2FA] toggle login-required failed:', err.message);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// ── Notification preferences (/api/account/notifications) ────────────────

router.put('/notifications', async (req, res) => {
  try {
    const u = await me(req);
    if (!u) return res.status(404).json({ error: 'User not found' });
    const prefs = req.body.preferences;
    if (!prefs || typeof prefs !== 'object') return res.status(400).json({ error: 'Invalid preferences' });
    // Only allow known keys
    const allowed = ['fleet_alerts', 'financial_warnings', 'maintenance_reminders', 'world_events'];
    const clean = {};
    for (const k of allowed) {
      if (k in prefs) clean[k] = !!prefs[k];
    }
    u.notificationPreferences = clean;
    await u.save();
    res.json({ success: true, preferences: clean });
  } catch (err) {
    console.error('[Account] notification prefs failed:', err.message);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ── Logout all other sessions (/api/account/logout-all) ──────────────────

router.post('/logout-all', async (req, res) => {
  try {
    const currentSessionId = req.sessionID;
    const store = req.sessionStore;
    if (!store) return res.status(500).json({ error: 'Session store not available' });

    // For Redis store: scan and destroy sessions belonging to this user
    if (store.client && typeof store.client.keys === 'function') {
      const prefix = store.prefix || 'ams:sess:';
      const keys = await store.client.keys(prefix + '*');
      let destroyed = 0;
      for (const key of keys) {
        const sid = key.replace(prefix, '');
        if (sid === currentSessionId) continue;
        try {
          const raw = await store.client.get(key);
          if (!raw) continue;
          const sess = JSON.parse(raw);
          if (sess.passport && sess.passport.user && sess.passport.user.id === req.user.id) {
            await store.client.del(key);
            destroyed++;
          }
        } catch (_) { /* skip unparseable sessions */ }
      }
      return res.json({ success: true, destroyed });
    }

    // For MemoryStore (local dev): iterate sessions
    if (typeof store.all === 'function') {
      store.all((err, sessions) => {
        if (err) return res.status(500).json({ error: 'Failed to read sessions' });
        let destroyed = 0;
        const entries = sessions ? (Array.isArray(sessions) ? sessions : Object.entries(sessions)) : [];
        for (const entry of entries) {
          const [sid, sess] = Array.isArray(entry) ? entry : [entry.id, entry];
          if (!sid || sid === currentSessionId) continue;
          if (sess && sess.passport && sess.passport.user && sess.passport.user.id === req.user.id) {
            store.destroy(sid);
            destroyed++;
          }
        }
        res.json({ success: true, destroyed });
      });
      return;
    }

    // Fallback — can't enumerate
    res.json({ success: true, destroyed: 0, note: 'Session store does not support enumeration' });
  } catch (err) {
    console.error('[Account] logout-all failed:', err.message);
    res.status(500).json({ error: 'Failed to log out other sessions' });
  }
});

// ── Export user data (/api/account/export) ────────────────────────────────

router.get('/export', async (req, res) => {
  try {
    const u = await me(req);
    if (!u) return res.status(404).json({ error: 'User not found' });

    // Profile
    const profile = {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      credits: u.credits,
      memberSince: u.createdAt,
      lastLogin: u.lastLogin,
      authMethod: u.authMethod,
      notificationPreferences: u.notificationPreferences
    };

    // Payments
    const payments = await Payment.findAll({
      where: { userId: u.id },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'packId', 'credits', 'amount', 'currency', 'status', 'createdAt', 'refundedAt']
    });

    // World memberships
    const memberships = await WorldMembership.findAll({
      where: { userId: u.id },
      include: [{ model: World, as: 'world', attributes: ['id', 'name', 'era', 'currentTime', 'worldType', 'status'] }]
    });

    const worlds = [];
    for (const m of memberships) {
      const mId = m.id;
      const fleet = await UserAircraft.findAll({
        where: { worldMembershipId: mId },
        attributes: ['id', 'registration', 'status', 'aircraftId', 'purchasePrice', 'totalFlightHours', 'createdAt']
      });
      const routes = await Route.findAll({
        where: { worldMembershipId: mId },
        attributes: ['id', 'departureAirportId', 'arrivalAirportId', 'distance', 'isActive', 'createdAt']
      });
      const loans = await Loan.findAll({
        where: { worldMembershipId: mId },
        attributes: ['id', 'bankId', 'principalAmount', 'interestRate', 'weeklyPayment', 'remainingPrincipal', 'status', 'createdAt']
      });
      const tours = await SightseeingTour.findAll({
        where: { worldMembershipId: mId },
        attributes: ['id', 'baseAirportId', 'waypoints', 'distanceNm', 'ticketPrice', 'isActive', 'createdAt']
      });

      worlds.push({
        worldId: m.world ? m.world.id : null,
        worldName: m.world ? m.world.name : 'Unknown',
        worldType: m.world ? m.world.worldType : null,
        era: m.world ? m.world.era : null,
        currentTime: m.world ? m.world.currentTime : null,
        worldStatus: m.world ? m.world.status : null,
        airlineName: m.airlineName,
        icaoCode: m.airlineCode,
        iataCode: m.iataCode,
        balance: m.balance,
        joinedAt: m.createdAt,
        fleet: fleet.map(a => a.toJSON()),
        routes: routes.map(r => r.toJSON()),
        loans: loans.map(l => l.toJSON()),
        sightseeingTours: tours.map(t => t.toJSON())
      });
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      profile,
      payments: payments.map(p => p.toJSON()),
      worlds
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="ams-account-data.json"');
    res.json(exportData);
  } catch (err) {
    console.error('[Account] data export failed:', err.message);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// ── Delete account (/api/account/delete) ─────────────────────────────────

router.post('/delete', async (req, res) => {
  try {
    const { password, confirmation, totpCode } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });
    if (confirmation !== 'DELETE') return res.status(400).json({ error: 'Please type DELETE to confirm' });

    const u = await me(req);
    if (!u) return res.status(404).json({ error: 'User not found' });

    // Verify password
    if (!u.passwordHash || !(await bcrypt.compare(password, u.passwordHash))) {
      return res.status(403).json({ error: 'Incorrect password' });
    }

    // Verify 2FA code if enabled
    if (u.totpEnabled && u.totpSecret) {
      if (!totpCode) return res.status(400).json({ error: '2FA code is required' });
      if (!authenticator || !authenticator.verify({ token: totpCode.replace(/\s/g, ''), secret: u.totpSecret })) {
        return res.status(403).json({ error: 'Invalid 2FA code' });
      }
    }

    const userId = u.id;

    // Cascading delete — mirrors admin.js DELETE /users/:userId
    await sequelize.transaction(async (t) => {
      await sequelize.query(`SET session_replication_role = 'replica'`, { transaction: t });

      const [mRows] = await sequelize.query(
        `SELECT id FROM world_memberships WHERE user_id = :userId`,
        { replacements: { userId }, transaction: t }
      );

      if (mRows.length > 0) {
        const mIds = mRows.map(r => r.id);

        const [rRows] = await sequelize.query(
          `SELECT id FROM routes WHERE world_membership_id IN (:mIds)`,
          { replacements: { mIds }, transaction: t }
        );
        const rIds = rRows.map(r => r.id);

        const [aRows] = await sequelize.query(
          `SELECT id FROM user_aircraft WHERE world_membership_id IN (:mIds)`,
          { replacements: { mIds }, transaction: t }
        );
        const aIds = aRows.map(r => r.id);

        if (rIds.length > 0) {
          await sequelize.query(`DELETE FROM scheduled_flights WHERE route_id IN (:rIds)`, { replacements: { rIds }, transaction: t });
        }
        if (aIds.length > 0) {
          await sequelize.query(`DELETE FROM scheduled_flights WHERE aircraft_id IN (:aIds)`, { replacements: { aIds }, transaction: t });
          await sequelize.query(`DELETE FROM recurring_maintenance WHERE aircraft_id IN (:aIds)`, { replacements: { aIds }, transaction: t });
        }
        // Delete sightseeing tours
        await sequelize.query(`DELETE FROM sightseeing_tours WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
        await sequelize.query(`DELETE FROM routes WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
        await sequelize.query(`DELETE FROM user_aircraft WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
        await sequelize.query(`DELETE FROM pricing_defaults WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
        await sequelize.query(`DELETE FROM weekly_financials WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
        await sequelize.query(`DELETE FROM loans WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
        await sequelize.query(`DELETE FROM notifications WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
        await sequelize.query(`DELETE FROM airspace_restrictions WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
        await sequelize.query(`DELETE FROM marketing_campaigns WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
        await sequelize.query(`DELETE FROM world_memberships WHERE user_id = :userId`, { replacements: { userId }, transaction: t });
      }

      // Null out owned worlds
      await sequelize.query(`UPDATE worlds SET owner_user_id = NULL WHERE owner_user_id = :userId`, { replacements: { userId }, transaction: t });

      // Delete payments
      await sequelize.query(`DELETE FROM payments WHERE user_id = :userId`, { replacements: { userId }, transaction: t });

      // Delete user
      await sequelize.query(`DELETE FROM users WHERE id = :userId`, { replacements: { userId }, transaction: t });

      await sequelize.query(`SET session_replication_role = 'origin'`, { transaction: t });
    });

    // Destroy session
    req.logout(() => {
      req.session.destroy(() => {
        res.json({ success: true });
      });
    });
  } catch (err) {
    console.error('[Account] delete account failed:', err.message);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
