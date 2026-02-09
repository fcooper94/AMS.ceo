# AMS.ceo - Airline Management Sim

A persistent, real-time airline operations management platform integrated with the VATSIM flight simulation network.

Build and manage your airline empire: purchase aircraft, create routes, set pricing, schedule flights, and compete against AI airlines across thousands of real-world airports spanning aviation history from the 1950s to the present day.

## Features

- **Fleet Management** - Purchase, maintain, and manage aircraft from multiple aviation eras
- **Route Network** - Create routes between 6,000+ real-world airports with demand-based pricing
- **Flight Scheduling** - Daily and weekly scheduling with turnaround, maintenance, and overnight flight support
- **VATSIM Integration** - Live flight tracking and reconciliation with the VATSIM network
- **Single-Player Worlds** - Compete against 200-460 AI airlines with configurable difficulty (Easy/Medium/Hard)
- **Multiplayer Worlds** - Join shared worlds with other players
- **Era System** - Play across different aviation decades with era-appropriate aircraft, pricing, and economics
- **Maintenance System** - Daily checks, weekly inspections, A/C/D checks with auto-scheduling
- **Financial Management** - Revenue tracking, operating costs, balance management, and financial reports
- **Competition Intelligence** - Leaderboards, market share analysis, and competitive route tracking
- **Aircraft Marketplace** - Buy, sell, and lease aircraft with other players
- **Real-Time Updates** - WebSocket-powered live dashboard with accelerated game time

## Tech Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: PostgreSQL with Sequelize ORM
- **Frontend**: Vanilla JavaScript, server-rendered HTML
- **Auth**: VATSIM OAuth 2.0 (with dev bypass for local development)

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- VATSIM developer account (for OAuth - optional with dev bypass)

## Time System

The world operates with configurable time acceleration:
- 1x to 1440x acceleration (default 60x)
- 1 real second = 1 game minute at 60x
- Era-aware economics scale prices and demand to the selected decade

## License

ISC
