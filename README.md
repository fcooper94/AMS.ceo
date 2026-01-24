# Airline Control

A persistent, real-time airline operations management platform integrated with live flight simulation networks.

## Overview

Airline Control is a management-first aviation simulation inspired by Football Manager and AirwaysSim. Manage your airline in a shared, persistent world where real flights flown on VATSIM directly shape your airline's success.

## Key Features

- **Persistent World**: Continuous 24/7 operations that never pause
- **Accelerated Time**: 60x time acceleration (1 real second = 1 game minute)
- **VATSIM Integration**: Real flights on VATSIM impact your airline operations
- **Management Depth**: Schedule flights, manage fleet, track finances
- **Era-Based Progression**: Start in different eras and unlock aircraft over time
- **Real-Time Updates**: WebSocket-powered live dashboard

## Quick Start

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- VATSIM account (for authentication)
- Railway account (for hosted database - optional)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database and VATSIM credentials
   ```

3. **Set up database:**
   ```bash
   npm run db:sync
   ```

4. **Create a game world:**
   ```bash
   npm run world:create
   ```

5. **Start the server:**
   ```bash
   npm run dev
   ```

6. **Open the app:**
   ```
   http://localhost:3000
   ```

## Documentation

- **[Setup Guide](docs/SETUP.md)** - Detailed installation and configuration
- **[Railway Deployment](docs/RAILWAY.md)** - Deploy to Railway with PostgreSQL
- **[VATSIM OAuth Setup](docs/VATSIM_OAUTH_SETUP.md)** - Configure VATSIM authentication
- **[World System](docs/WORLD_SYSTEM.md)** - Understanding the persistent world and time system

## Project Structure

```
airline-control/
├── src/
│   ├── server.js              # Main server
│   ├── config/                # Database & auth configuration
│   ├── models/                # Database models (Flight, World)
│   ├── routes/                # API routes
│   ├── services/              # Business logic (world time, VATSIM)
│   ├── middleware/            # Auth middleware
│   └── scripts/               # Utility scripts
├── public/                    # Frontend assets
│   ├── css/                   # Stylesheets
│   ├── js/                    # Client-side JavaScript
│   ├── index.html             # Homepage
│   └── dashboard.html         # Game dashboard
└── docs/                      # Documentation
```

## Technology Stack

- **Backend**: Node.js, Express, Socket.IO
- **Database**: PostgreSQL, Sequelize ORM
- **Authentication**: Passport.js with VATSIM OAuth2
- **Frontend**: Vanilla JavaScript, CSS3
- **Real-time**: WebSockets (Socket.IO)
- **Deployment**: Railway (recommended)

## Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm start` - Start production server
- `npm run db:sync` - Sync database schema
- `npm run world:create` - Create a new game world

## Core Concepts

### Time System

The world operates with 60x time acceleration:
- 1 real second = 1 game minute
- 1 real minute = 1 game hour
- 24 real minutes = 1 game day

Human-flown flights on VATSIM execute in real-time, while management operations use accelerated time.

### Flight State Machine

```
Scheduled → Claimable → Executing (AI/Human) → Pending Reconciliation → Resolved
```

### VATSIM Integration

- **Observe-only**: Never injects traffic or interferes with ATC
- **Real-time tracking**: Monitor flights via public VATSIM data
- **Flight validation**: Match airline callsigns to validate operations

## Development Status

**Currently Implemented:**
- ✅ Express server with WebSocket support
- ✅ PostgreSQL database with Sequelize
- ✅ VATSIM OAuth authentication
- ✅ Persistent world system with accelerated time
- ✅ Real-time game clock on dashboard
- ✅ Responsive dark-themed UI

**Coming Soon:**
- ⏳ Flight scheduling system
- ⏳ Aircraft fleet management
- ⏳ Resource locking (aircraft/crew)
- ⏳ AI flight execution
- ⏳ Financial tracking
- ⏳ VATSIM flight reconciliation

## License

ISC

## Contributing

This project is in active development. Contributions welcome!

## Support

For issues or questions, please open an issue on GitHub.
