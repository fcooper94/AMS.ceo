const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Payment } = require('../models');

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
      attributes: ['id', 'firstName', 'lastName', 'email', 'createdAt']
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
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

module.exports = router;
