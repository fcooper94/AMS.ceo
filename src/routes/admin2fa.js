// Admin two-factor auth (TOTP — works with Authy, Google Authenticator, etc.).
// Mounted at /api/admin/2fa behind requireAdmin. The requireAdmin 2FA gate
// exempts this path so setup/verify stay reachable before the session is verified.
const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { authenticator } = require('otplib');
const { User } = require('../models');

const router = express.Router();
authenticator.options = { window: 1 }; // tolerate ±1 time step of clock drift

const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');

function genBackupCodes(n = 8) {
  const codes = [], hashes = [];
  for (let i = 0; i < n; i++) {
    const c = crypto.randomBytes(5).toString('hex'); // 10 hex chars
    codes.push(c.replace(/(.{5})(.{5})/, '$1-$2'));   // pretty: xxxxx-xxxxx
    hashes.push(sha256(c));
  }
  return { codes, hashes };
}

async function me(req) {
  return User.findOne({ where: req.user.id ? { id: req.user.id } : { vatsimId: req.user.vatsimId } });
}

// Is 2FA enabled for this admin, and has this session passed it?
router.get('/status', async (req, res) => {
  const u = await me(req);
  res.json({ enabled: !!(u && u.totpEnabled), verified: !!(req.session && req.session.adminTwoFA) });
});

// Begin setup: generate a fresh secret + backup codes (held in the session until
// confirmed). Returns the QR + secret + plaintext backup codes (shown once).
router.post('/setup', async (req, res) => {
  try {
    const u = await me(req);
    if (!u) return res.status(404).json({ error: 'User not found' });
    if (u.totpEnabled) return res.status(400).json({ error: '2FA is already enabled. Disable it first to re-enrol.' });

    const secret = authenticator.generateSecret();
    const account = u.email || `${u.firstName} ${u.lastName}`.trim() || u.vatsimId || 'admin';
    const otpauth = authenticator.keyuri(account, 'AMS.ceo Admin', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    const { codes, hashes } = genBackupCodes();

    req.session.pendingTotp = { secret, backupHashes: hashes };
    res.json({ secret, otpauth, qrDataUrl, backupCodes: codes });
  } catch (err) {
    console.error('[2fa] setup failed:', err.message);
    res.status(500).json({ error: 'Could not start 2FA setup' });
  }
});

// Confirm setup: verify a code against the pending secret, then persist + verify session.
router.post('/enable', async (req, res) => {
  try {
    const pending = req.session.pendingTotp;
    if (!pending) return res.status(400).json({ error: 'No pending setup — start again.' });
    const code = (req.body && req.body.code || '').replace(/\s/g, '');
    if (!authenticator.verify({ token: code, secret: pending.secret })) {
      return res.status(400).json({ error: 'That code is incorrect — check your authenticator and try again.' });
    }
    const u = await me(req);
    u.totpSecret = pending.secret;
    u.totpEnabled = true;
    u.totpBackupCodes = pending.backupHashes;
    await u.save();
    delete req.session.pendingTotp;
    req.session.adminTwoFA = true;
    res.json({ success: true });
  } catch (err) {
    console.error('[2fa] enable failed:', err.message);
    res.status(500).json({ error: 'Could not enable 2FA' });
  }
});

// Step-up: verify a TOTP code (or a one-time backup code) to unlock this session.
router.post('/verify', async (req, res) => {
  try {
    const u = await me(req);
    if (!u || !u.totpEnabled || !u.totpSecret) return res.status(400).json({ error: '2FA is not set up' });
    const code = (req.body && req.body.code || '').replace(/\s/g, '');

    if (authenticator.verify({ token: code, secret: u.totpSecret })) {
      req.session.adminTwoFA = true;
      return res.json({ success: true });
    }
    // Try backup codes (single-use)
    const hashes = Array.isArray(u.totpBackupCodes) ? u.totpBackupCodes : [];
    const h = sha256(code.replace(/-/g, ''));
    const hDash = sha256(code);
    const idx = hashes.findIndex(x => x === h || x === hDash);
    if (idx !== -1) {
      hashes.splice(idx, 1);
      u.totpBackupCodes = hashes;
      await u.save();
      req.session.adminTwoFA = true;
      return res.json({ success: true, backupUsed: true, backupRemaining: hashes.length });
    }
    return res.status(400).json({ error: 'Invalid code.' });
  } catch (err) {
    console.error('[2fa] verify failed:', err.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Disable 2FA (requires a valid current code).
router.post('/disable', async (req, res) => {
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
    console.error('[2fa] disable failed:', err.message);
    res.status(500).json({ error: 'Could not disable 2FA' });
  }
});

module.exports = router;
