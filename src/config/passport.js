const passport = require('passport');

// VATSIM OAuth was removed 2026-07 — authentication is local email/password
// (see routes/auth.js: /register, /local-login, support PIN, dev-bypass).
// Passport remains purely for session plumbing: req.login()/req.logout() and
// the (de)serializers below. Users are still keyed by the legacy `vatsimId`
// column internally; local accounts use 'LOCAL-<uuid>' values there.

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;
