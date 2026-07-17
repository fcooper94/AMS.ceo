// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
};

// Middleware to check if user is already authenticated
const redirectIfAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/world-selection');
  }
  next();
};

// Middleware to require admin privileges. Verified against the DB because the
// session user object doesn't reliably carry isAdmin. An impersonating admin's
// active session user is the (non-admin) impersonated user, so /stop-impersonation
// is allowed through when an impersonation is in progress.
const requireAdmin = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const path = (req.originalUrl || '').split('?')[0];
  if (req.session && req.session.impersonatorUserId && path.endsWith('/stop-impersonation')) {
    return next();
  }
  try {
    const { User } = require('../models');
    const me = await User.findOne({
      where: req.user.id ? { id: req.user.id } : { vatsimId: req.user.vatsimId },
      attributes: ['id', 'isAdmin']
    });
    if (!me || !me.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return next();
  } catch (e) {
    console.error('requireAdmin check failed:', e);
    return res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Middleware to check if user has selected a world
const requireWorld = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }

  if (!req.session.activeWorldId) {
    return res.redirect('/world-selection');
  }

  next();
};

module.exports = {
  requireAuth,
  redirectIfAuth,
  requireAdmin,
  requireWorld
};
