const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Flight Model
 * Represents a scheduled flight in the airline control system
 * State machine: Scheduled → Claimable → Executing → Pending Reconciliation → Resolved
 */
const Flight = sequelize.define('Flight', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  flightNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'flight_number'
  },
  callsign: {
    type: DataTypes.STRING,
    allowNull: false
  },
  state: {
    type: DataTypes.ENUM(
      'scheduled',
      'claimable',
      'executing_ai',
      'executing_human',
      'pending_reconciliation',
      'resolved'
    ),
    defaultValue: 'scheduled',
    allowNull: false
  },
  departureIcao: {
    type: DataTypes.STRING(4),
    allowNull: false,
    field: 'departure_icao'
  },
  arrivalIcao: {
    type: DataTypes.STRING(4),
    allowNull: false,
    field: 'arrival_icao'
  },
  scheduledDepartureTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'scheduled_departure_time'
  },
  scheduledArrivalTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'scheduled_arrival_time'
  },
  actualDepartureTime: {
    type: DataTypes.DATE,
    field: 'actual_departure_time'
  },
  actualArrivalTime: {
    type: DataTypes.DATE,
    field: 'actual_arrival_time'
  },
  aircraftId: {
    type: DataTypes.UUID,
    field: 'aircraft_id'
  },
  airlineId: {
    type: DataTypes.UUID,
    field: 'airline_id'
  },
  pilotId: {
    type: DataTypes.UUID,
    field: 'pilot_id'
  },
  executionType: {
    type: DataTypes.ENUM('ai', 'human'),
    field: 'execution_type'
  },
  vatsimFlightId: {
    type: DataTypes.STRING,
    field: 'vatsim_flight_id'
  },
  revenue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  fuelCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'fuel_cost'
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'flights',
  timestamps: true,
  underscored: true
});

module.exports = Flight;