# World System Guide

## Overview

The Airline Control world system creates a persistent, continuously running game environment where time progresses at an accelerated rate. By default, **1 real-time second = 1 game minute** (60x acceleration).

Inspired by AirwaysSim, the world never pauses and operates 24/7, creating a living, breathing airline management experience.

## Time Acceleration

### Default Configuration
- **60x acceleration**: 1 real second = 1 game minute
- **1 real minute** = 1 game hour
- **24 real minutes** = 1 game day
- **1 real day** = 60 game days

This means:
- A typical flight (2 hours) takes 2 real minutes
- A day's operations take 24 real minutes
- A month of game time passes in ~12 real hours

## Getting Started

### 1. Sync Database

First, create the necessary database tables:

```bash
npm run db:sync
```

### 2. Create a World

Create your first game world:

```bash
npm run world:create
```

Or with a custom name:

```bash
npm run world:create "My Airline World"
```

This will create a world with:
- Start date: 1995-01-01 (configurable via `WORLD_ERA` in .env)
- Time acceleration: 60x (configurable via `WORLD_TIME_ACCELERATION` in .env)
- Status: Active
- Operating hours: 24/7 (configurable)

### 3. Start the Server

```bash
npm run dev
```

The world time service will automatically start and begin progressing time.

## Configuration

### Environment Variables

Edit your `.env` file to configure the world:

```env
# World starting year/era
WORLD_ERA=1995

# Time acceleration factor
# 60 = 1 real second = 1 game minute
# 120 = 1 real second = 2 game minutes (faster)
# 30 = 1 real second = 30 game seconds (slower)
WORLD_TIME_ACCELERATION=60.0
```

### Operating Hours

By default, the world runs 24/7. To limit when the world progresses (e.g., for development or testing), you can set operating hours in the database:

```sql
UPDATE worlds
SET operating_hours_start = '08:00:00',
    operating_hours_end = '23:00:00'
WHERE id = 'your-world-id';
```

The world will only progress during these hours (UTC).

## World Management

### View World Information

The dashboard displays current world information:
- Current game time (live updating)
- Game date
- Time acceleration rate
- Days elapsed since world start
- Era

### API Endpoints

#### Get World Info
```
GET /api/world/info
```

Returns:
```json
{
  "id": "uuid",
  "name": "World Alpha",
  "currentTime": "1995-01-15T14:30:00.000Z",
  "startDate": "1995-01-01T00:00:00.000Z",
  "timeAcceleration": 60,
  "era": 1995,
  "status": "active",
  "isPaused": false,
  "isOperating": true,
  "elapsedDays": 14
}
```

#### Get Current Game Time
```
GET /api/world/time
```

#### Pause World
```
POST /api/world/pause
```

#### Resume World
```
POST /api/world/resume
```

#### Change Time Acceleration
```
POST /api/world/acceleration
Content-Type: application/json

{
  "factor": 120
}
```

## How It Works

### Time Progression

1. **Server Tick Loop**: Every 1 second (real-time), the world service calculates how much game time has passed
2. **Time Advancement**: Game time advances by `realSeconds × accelerationFactor`
3. **Database Sync**: World state is saved to the database every 10 seconds
4. **Client Updates**: Game time is broadcast via WebSocket to all connected clients

### Client-Side Display

The dashboard shows live updating game time:
- Receives initial time from server
- Advances locally based on acceleration factor
- Re-syncs with server every 30 seconds via HTTP
- Receives tick events via WebSocket for precision

### Flight Integration

When integrated with the flight system:
- Scheduled flights are evaluated against game time
- AI flights execute based on game time
- Human-flown flights execute in real-time (bypass acceleration)
- Flight outcomes are reconciled when they complete

## Design Principles

From the project specification:

> "The simulation operates with layered time abstraction. Strategic progression (fleet, reputation, eras) is accelerated, while operational execution for human-flown flights always occurs in real time."

This means:
- **Management layer**: Uses accelerated time
- **Human flights**: Execute in real-time
- **AI flights**: Execute in accelerated time
- **Consequences**: Calculated asynchronously after flight completion

## Multiple Worlds

You can create multiple worlds with different configurations:

```bash
npm run world:create "Fast World"    # Then set acceleration to 120x
npm run world:create "Slow World"    # Then set acceleration to 30x
npm run world:create "Era 2010"      # Different starting era
```

Only one world can be `active` at a time. The server automatically loads the active world on startup.

## Database Schema

```sql
CREATE TABLE worlds (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  current_time TIMESTAMP NOT NULL,
  time_acceleration FLOAT DEFAULT 60.0,
  operating_hours_start TIME,
  operating_hours_end TIME,
  is_paused BOOLEAN DEFAULT FALSE,
  last_tick_at TIMESTAMP,
  era INTEGER DEFAULT 2010,
  max_players INTEGER DEFAULT 100,
  status ENUM('setup', 'active', 'paused', 'completed') DEFAULT 'setup',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Troubleshooting

### World not progressing?

Check:
1. Is the world status `active`? (Check database or `/api/world/info`)
2. Is the world paused? (Check `isPaused` field)
3. Are you within operating hours? (If set)
4. Check server logs for errors

### Time not displaying on dashboard?

1. Check browser console for errors
2. Verify `/api/world/info` returns data
3. Ensure WebSocket connection is established
4. Hard refresh the page (Ctrl+F5)

### Create a new world

```bash
# First, pause or deactivate existing world
# Then create new world
npm run world:create "New World Name"
```

## Future Enhancements

Planned features:
- World pause/resume UI controls
- Time acceleration adjustment in dashboard
- World history and snapshots
- Multi-world support with switching
- Era progression triggers
- Seasonal effects based on game date
