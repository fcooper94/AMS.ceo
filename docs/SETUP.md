# Airline Control - Setup Guide

## Project Overview
A persistent, real-time airline operations management platform integrated with VATSIM.

## Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
Create a PostgreSQL database:
```sql
CREATE DATABASE airline_control;
```

### 3. Environment Configuration
Copy the example environment file and configure it:
```bash
cp .env.example .env
```

Edit `.env` with your database credentials and configuration.

### 4. Run the Application

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Project Structure

```
airline-control/
├── src/
│   ├── server.js              # Main server entry point
│   ├── config/
│   │   └── database.js        # Database configuration
│   ├── models/                # Database models (Sequelize)
│   │   └── Flight.js          # Flight state machine model
│   ├── routes/                # API routes (to be implemented)
│   ├── services/              # Business logic
│   │   └── vatsimService.js   # VATSIM integration
│   └── controllers/           # Route controllers (to be implemented)
├── .env.example               # Environment variables template
├── .gitignore
└── package.json
```

## Key Features Implemented

### 1. Flight State Machine
Flights follow this state flow:
- `scheduled` → `claimable` → `executing_ai`/`executing_human` → `pending_reconciliation` → `resolved`

### 2. VATSIM Integration
- Non-intrusive observation of VATSIM network data
- Real-time flight tracking
- Polling service (default: 15 second intervals)

### 3. Real-time Communication
- WebSocket support via Socket.IO
- Live updates for flight status changes

## Next Steps

### Immediate Tasks
1. Create additional models:
   - Aircraft
   - Airline
   - Crew
   - Airport
   - Route

2. Implement core services:
   - Flight scheduler
   - Resource manager (aircraft/crew locking)
   - Flight reconciliation engine
   - AI flight executor

3. Build API routes:
   - `/api/flights` - Flight management
   - `/api/aircraft` - Aircraft fleet
   - `/api/airlines` - Airline management
   - `/api/schedule` - Schedule operations

4. Implement frontend:
   - Management dashboard
   - Flight board
   - Resource allocation interface
   - Real-time flight tracking

### Architecture Considerations

#### Time Management
- Strategic time acceleration for management layer
- Real-time execution for human-flown flights
- Deferred consequence calculation

#### Resource Locking
- Soft locks for provisional reservations
- Hard locks during flight execution
- Buffer-based downline flight scheduling

#### Scalability
- Event-driven architecture
- Asynchronous flight resolution
- Stateless API design
- Database indexing on flight states and times

## API Endpoints (Current)

### Health Check
```
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-24T20:00:00.000Z",
  "uptime": 123.456
}
```

## VATSIM Integration Notes

- Data URL: https://data.vatsim.net/v3/vatsim-data.json
- Respect rate limits (15 second minimum interval recommended)
- Observe-only integration (no traffic injection)
- Track flights by callsign matching

## Development Notes

- Uses Sequelize ORM for PostgreSQL
- Express.js for REST API
- Socket.IO for WebSockets
- Morgan for HTTP logging
- Environment-based configuration

## License
ISC