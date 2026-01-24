# VATSIM OAuth Setup Guide

## Setting up VATSIM Authentication (Development)

### Step 1: Register Your Application

1. Go to VATSIM Auth Dev Portal: https://auth-dev.vatsim.net/
2. Log in with your VATSIM credentials
3. Navigate to **"Settings"** → **"OAuth Clients"**
4. Click **"Create New Client"**

### Step 2: Configure OAuth Client

Fill in the following details:

- **Name**: `Airline Control` (or your preferred name)
- **Redirect URIs**: `http://localhost:3000/auth/vatsim/callback`
- **Scopes**: Select the following:
  - `full_name`
  - `email`
  - `vatsim_details`

### Step 3: Get Your Credentials

After creating the client, you'll receive:
- **Client ID**
- **Client Secret**

**IMPORTANT**: Save the Client Secret immediately - you won't be able to see it again!

### Step 4: Update Your `.env` File

Open your `.env` file and update the following variables:

```env
VATSIM_CLIENT_ID=your_client_id_from_step_3
VATSIM_CLIENT_SECRET=your_client_secret_from_step_3
VATSIM_CALLBACK_URL=http://localhost:3000/auth/vatsim/callback
VATSIM_AUTH_URL=https://auth-dev.vatsim.net
```

Also update the session secret:
```env
SESSION_SECRET=a_random_long_string_for_production_use_something_secure
```

### Step 5: Install Dependencies

Run:
```bash
npm install
```

### Step 6: Test the Authentication

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser to `http://localhost:3000`

3. Click **"Login with VATSIM"**

4. You'll be redirected to VATSIM's auth-dev page

5. After authorizing, you'll be redirected back to your dashboard

## Production Setup

When deploying to production:

1. Register a new OAuth client at **https://auth.vatsim.net/** (not auth-dev)
2. Update your `.env` with:
   ```env
   VATSIM_AUTH_URL=https://auth.vatsim.net
   VATSIM_CALLBACK_URL=https://yourdomain.com/auth/vatsim/callback
   ```
3. Update the redirect URI in your VATSIM OAuth client settings
4. Generate a strong session secret

## Troubleshooting

### "Invalid Client" Error
- Check that your Client ID and Secret are correct
- Ensure you're using the auth-dev credentials with the auth-dev URL

### "Redirect URI Mismatch" Error
- Verify the callback URL in `.env` matches exactly what's registered in VATSIM
- Check for trailing slashes (they matter!)
- Make sure you're using `http://localhost:3000` for local dev

### Session/Cookie Issues
- Clear your browser cookies
- Check that SESSION_SECRET is set in `.env`
- Verify session middleware is properly configured

## Security Notes

- **Never commit your `.env` file to version control**
- The `.gitignore` file already excludes `.env`
- Use different OAuth clients for development and production
- Generate a strong, random SESSION_SECRET for production
- In production, use HTTPS and set `cookie.secure: true`

## Available Auth Routes

- `GET /auth/login` - Initiates VATSIM OAuth flow
- `GET /auth/vatsim/callback` - OAuth callback handler
- `GET /auth/logout` - Logs out the user
- `GET /auth/status` - Returns current authentication status

## User Data Available

After authentication, the user object contains:
```javascript
{
  id: "VATSIM_CID",
  vatsimId: "VATSIM_CID",
  firstName: "First Name",
  lastName: "Last Name",
  email: "user@email.com",
  rating: 1,  // Controller rating
  pilotRating: 0,  // Pilot rating
  division: "USA",
  subdivision: "USW"
}
```

Access this in routes via `req.user` when authenticated.
