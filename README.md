# AMS.ceo - Airline Management Simulation

A persistent, real-time airline management simulation where you build and run an airline across aviation history — from the 1950s prop era to the modern jet age.

Purchase aircraft, open routes, schedule flights, set pricing, hire staff, manage maintenance, and compete against hundreds of AI airlines across 6,000+ real-world airports. Worlds run 24/7 with accelerated game time, so your airline keeps operating even when you're offline.

Integrated with [VATSIM](https://vatsim.net) for live flight simulation network connectivity.

## Core Features

- **Persistent Worlds** - Worlds run continuously at up to 240x time acceleration. AI airlines make independent decisions, open routes, and compete for market share around the clock
- **Era System** - Play from the 1950s through to the present day with era-appropriate aircraft, ticket pricing, demand patterns, and economics
- **Fleet Management** - Buy, lease, or finance aircraft. Configure cabins (economy through first class), cargo holds, and maintenance schedules
- **Route Network** - Build routes between 6,000+ real airports with gravity-model demand, seasonal variation, and competition-aware load factors
- **Flight Scheduling** - Drag-and-drop weekly scheduling with pre/post-flight ops, turnaround times, overnight flights, and tech stops
- **Cargo System** - 8 cargo types (general, express, heavy, perishable, dangerous, live animal, high-value, oversized) with per-route market sizing, rate elasticity, and belly vs freighter split
- **Sightseeing Tours** - Scenic loop flights with map-based waypoint builder, separate from the route system
- **AI Competition** - 200-460 AI airlines per world with personality-driven decisions (conservative/balanced/aggressive), fleet financing variety, and competitive pricing responses
- **Maintenance Engine** - Daily, weekly, A, C, and D checks with auto-scheduling, concurrency limits, and aircraft grounding
- **Financial Management** - Weekly P&L breakdown, loans from multiple banks, staff costs, contractor tiers, fleet commonality costs, and insurance
- **Marketing Campaigns** - Boost route demand with targeted campaigns
- **Airline Branding** - Procedural SVG logos and colour schemes for player and AI airlines
- **VATSIM Integration** - Live flight tracking and reconciliation with the VATSIM network
- **Multiplayer** - Join shared worlds with other players, or run a singleplayer world with AI competition
- **Aircraft Marketplace** - Buy, sell, and lease aircraft to/from other players and NPC buyers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express, Socket.IO |
| **Database** | PostgreSQL (Sequelize 6), hosted on Railway |
| **Frontend** | Vanilla JS, server-rendered HTML/CSS (no framework, no build step) |
| **Auth** | VATSIM OAuth 2.0 + local email/password |
| **Payments** | Stripe Checkout (credit packs) |
| **Hosting** | Railway |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- VATSIM developer account (optional — local auth works without it)

### Setup

```bash
git clone https://github.com/fcooper94/AMS.ceo.git
cd AMS.ceo
npm install
cp .env.example .env  # Configure your database URL and secrets
npm run go            # Interactive prompt: pick Railway or Local DB
```

### Running

```bash
npm run go    # Interactive DB selector + nodemon
npm run dev   # Direct nodemon (uses whatever DATABASE_URL is in .env)
npm start     # Production start
```

The server gates page requests behind a loading screen until the database is ready and the demand cache is loaded (~2-3 seconds).

## Time System

Worlds operate with configurable time acceleration:

| Acceleration | Real Time | Game Time |
|-------------|-----------|-----------|
| 60x (default) | 1 second | 1 minute |
| 240x (fast) | 1 second | 4 minutes |
| 1x (real-time) | 1 second | 1 second |

Each world runs independently — a 1950s world and a 2010s world can coexist with different time scales and era economics.

## Demand Model

Route demand uses a two-layer system:

1. **Potential demand** (gravity model) - Deterministic 0-100 score based on airport size, distance, cultural ties, and era. Anchored to real-world UK and US domestic traffic data
2. **Actual demand** (load factor) - Dynamic per-flight calculation incorporating demand score, competition, pricing, maturity, prestige, reputation, time-of-day, and seasonal variation

Seasonal archetypes (ski, beach, winter sun, sunbelt, business, etc.) modulate demand by game month with era-appropriate damping.

## Licence

ISC
