# Railway Deployment Guide

## Setting up PostgreSQL on Railway

### 1. Create PostgreSQL Database

In your Railway project:
1. Click **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway will automatically provision a PostgreSQL database

### 2. Get Database Credentials

Railway provides a `DATABASE_URL` variable automatically. To view it:
1. Click on your PostgreSQL service
2. Go to the **"Variables"** tab
3. Copy the `DATABASE_URL` value

It will look like:
```
postgresql://postgres:password@containers-us-west-xyz.railway.app:1234/railway
```

### 3. Configure Your Application

**Option A: Local Development**
1. Copy the `DATABASE_URL` from Railway
2. Add it to your `.env` file:
   ```
   DATABASE_URL=postgresql://postgres:password@containers-us-west-xyz.railway.app:1234/railway
   ```

**Option B: Railway Deployment**
1. In your Railway app service, go to **"Variables"** tab
2. Click **"New Variable"** → **"Add Reference"**
3. Select your PostgreSQL service's `DATABASE_URL`
4. Railway will automatically inject it into your app

### 4. Deploy to Railway

**Method 1: Deploy from GitHub**
1. Push your code to GitHub
2. In Railway: **"New"** → **"GitHub Repo"**
3. Select your repository
4. Railway will auto-detect Node.js and deploy

**Method 2: Deploy using Railway CLI**
```bash
npm install -g @railway/cli
railway login
railway link
railway up
```

### 5. Set Environment Variables in Railway

In your app service's **"Variables"** tab, add:

```
NODE_ENV=production
PORT=3000
VATSIM_DATA_URL=https://data.vatsim.net/v3/vatsim-data.json
VATSIM_POLL_INTERVAL=15000
WORLD_ERA=2010
WORLD_TIME_ACCELERATION=1.0
```

The `DATABASE_URL` should be automatically available if you linked the PostgreSQL service.

### 6. Initialize Database Tables

After deployment, you'll need to create the database tables. Options:

**Option A: Add migration script to package.json**
```json
"scripts": {
  "start": "node src/server.js",
  "dev": "nodemon src/server.js",
  "db:sync": "node -e \"require('./src/config/database'); require('./src/models/Flight'); setTimeout(() => process.exit(0), 3000)\""
}
```

Then run via Railway CLI:
```bash
railway run npm run db:sync
```

**Option B: Use Sequelize CLI (recommended for production)**
We can set this up with proper migrations if needed.

## Testing the Connection

Run locally with Railway database:
```bash
npm run dev
```

Check the console output for:
```
✓ Database connection established successfully
```

## Railway-Specific Configuration

The app is configured to:
- Support SSL connections (required by Railway)
- Auto-detect `DATABASE_URL` environment variable
- Fall back to individual DB parameters for local development
- Use connection pooling (max 5 connections)

## Common Issues

### SSL/TLS Errors
If you see SSL errors, the configuration already includes:
```javascript
dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
}
```

### Connection Timeouts
Railway databases may have connection limits. The pool is configured for:
- Max 5 connections
- 30s acquire timeout
- 10s idle timeout

### Port Binding
Railway automatically sets the `PORT` environment variable. The app uses:
```javascript
const PORT = process.env.PORT || 3000;
```

## Next Steps

1. Install dependencies: `npm install`
2. Configure `.env` with your Railway `DATABASE_URL`
3. Test connection: `npm run dev`
4. Deploy to Railway
5. Monitor logs in Railway dashboard

## Useful Railway Commands

```bash
# View logs
railway logs

# Run commands in Railway environment
railway run npm run db:sync

# Open Railway dashboard
railway open

# Check service status
railway status
```
