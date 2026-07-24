const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');
const { User } = require('../models');

// Configure VATSIM OAuth2 Strategy — only when credentials are present.
// The sim service (and any env without VATSIM keys) boots without it;
// passport.authenticate('vatsim') resolves the strategy per-request, so
// /auth/login simply 500s instead of the whole process crashing at require.
if (process.env.VATSIM_CLIENT_ID && process.env.VATSIM_CLIENT_SECRET) {
passport.use('vatsim', new OAuth2Strategy({
    authorizationURL: `${process.env.VATSIM_AUTH_URL}/oauth/authorize`,
    tokenURL: `${process.env.VATSIM_AUTH_URL}/oauth/token`,
    clientID: process.env.VATSIM_CLIENT_ID,
    clientSecret: process.env.VATSIM_CLIENT_SECRET,
    callbackURL: process.env.VATSIM_CALLBACK_URL,
    scope: ['full_name', 'email', 'vatsim_details']
  },
  async (accessToken, refreshToken, profile, cb) => {
    try {
      // Fetch user data from VATSIM
      const response = await axios.get(`${process.env.VATSIM_AUTH_URL}/api/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      const userData = response.data.data;

      // Find or create user in database
      const [dbUser, created] = await User.findOrCreate({
        where: { vatsimId: userData.cid.toString() },
        defaults: {
          vatsimId: userData.cid.toString(),
          firstName: userData.personal.name_first,
          lastName: userData.personal.name_last,
          email: userData.personal.email,
          rating: userData.vatsim.rating.id,
          pilotRating: userData.vatsim.pilotrating.id,
          division: userData.vatsim.division.id,
          subdivision: userData.vatsim.subdivision.id,
          lastLogin: new Date()
        }
      });

      // Update last login if user exists
      if (!created) {
        await dbUser.update({ lastLogin: new Date() });
      }

      // Create session user object
      const user = {
        id: dbUser.id,
        vatsimId: dbUser.vatsimId,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        email: dbUser.email,
        rating: dbUser.rating,
        pilotRating: dbUser.pilotRating,
        division: dbUser.division,
        subdivision: dbUser.subdivision,
        accessToken: accessToken
      };

      return cb(null, user);
    } catch (error) {
      console.error('VATSIM auth error:', error.message);
      return cb(error);
    }
  }
));
} else {
  console.log('VATSIM OAuth not configured (no VATSIM_CLIENT_ID) — /auth/login disabled on this instance');
}

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;
