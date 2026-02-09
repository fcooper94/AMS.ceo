const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * ScheduledFlight Model
 * Represents a weekly recurring flight template.
 * Each record defines a flight that repeats every week on the specified day.
 */
const ScheduledFlight = sequelize.define('ScheduledFlight', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  routeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'route_id',
    references: {
      model: 'routes',
      key: 'id'
    }
  },
  aircraftId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'aircraft_id',
    references: {
      model: 'user_aircraft',
      key: 'id'
    }
  },
  dayOfWeek: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'day_of_week',
    comment: 'Day of week this flight departs (0=Sunday, 1=Monday ... 6=Saturday)',
    validate: {
      min: 0,
      max: 6
    }
  },
  departureTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'departure_time',
    comment: 'Scheduled departure time'
  },
  arrivalTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'arrival_time',
    comment: 'Scheduled arrival time (when round-trip completes)'
  },
  arrivalDayOffset: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'arrival_day_offset',
    comment: 'Days after departure when round-trip completes (0=same day, 1=next day, etc.)'
  },
  totalDurationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'total_duration_minutes',
    comment: 'Cached total round-trip duration in minutes'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Whether this flight template is active'
  }
}, {
  tableName: 'scheduled_flights',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['route_id']
    },
    {
      fields: ['aircraft_id']
    },
    {
      fields: ['day_of_week']
    },
    {
      unique: true,
      fields: ['aircraft_id', 'day_of_week', 'departure_time']
    }
  ]
});

module.exports = ScheduledFlight;
