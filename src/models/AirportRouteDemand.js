const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AirportRouteDemand = sequelize.define('AirportRouteDemand', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  fromAirportId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'from_airport_id',
    references: {
      model: 'airports',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Origin airport for this route demand'
  },
  toAirportId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'to_airport_id',
    references: {
      model: 'airports',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Destination airport for this route demand'
  },
  baseDemand: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50,
    field: 'base_demand'
  },
  demandCategory: {
    type: DataTypes.ENUM('very_high', 'high', 'medium', 'low', 'very_low'),
    allowNull: false,
    defaultValue: 'medium',
    field: 'demand_category'
  },
  routeType: {
    type: DataTypes.ENUM('business', 'leisure', 'mixed', 'cargo', 'regional'),
    allowNull: true,
    defaultValue: 'mixed',
    field: 'route_type'
  },
  // Era-specific demand columns (0-100 scale, computed by gravity model)
  demand1950: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'demand_1950',
    comment: 'Demand level for 1950s (0-100)'
  },
  demand1960: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'demand_1960',
    comment: 'Demand level for 1960s (0-100)'
  },
  demand1970: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'demand_1970',
    comment: 'Demand level for 1970s (0-100)'
  },
  demand1980: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'demand_1980',
    comment: 'Demand level for 1980s (0-100)'
  },
  demand1990: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'demand_1990',
    comment: 'Demand level for 1990s (0-100)'
  },
  demand2000: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'demand_2000',
    comment: 'Demand level for 2000s (0-100)'
  },
  demand2010: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'demand_2010',
    comment: 'Demand level for 2010s (0-100)'
  },
  demand2020: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'demand_2020',
    comment: 'Demand level for 2020s (0-100)'
  },
  // Zone references for traceability
  fromZoneId: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'from_zone_id',
    comment: 'Source metro zone ID'
  },
  toZoneId: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'to_zone_id',
    comment: 'Destination metro zone ID'
  }
}, {
  tableName: 'airport_route_demands',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['from_airport_id', 'to_airport_id'],
      name: 'unique_airport_pair'
    },
    {
      fields: ['from_airport_id']
    },
    {
      fields: ['to_airport_id']
    },
    {
      fields: ['from_airport_id', 'base_demand'],
      name: 'idx_route_demands_from_demand'
    },
    {
      fields: ['demand_category']
    },
    {
      fields: ['from_airport_id', 'demand_2000'],
      name: 'idx_route_demands_from_d2000'
    }
  ],
  validate: {
    differentAirports() {
      if (this.fromAirportId === this.toAirportId) {
        throw new Error('From and To airports must be different');
      }
    }
  }
});

/**
 * Get demand category label
 */
AirportRouteDemand.prototype.getCategoryLabel = function() {
  return this.demandCategory.replace('_', ' ').toUpperCase();
};

/**
 * Decade columns mapping for interpolation
 */
const DECADE_FIELDS = [
  { year: 1950, field: 'demand1950' },
  { year: 1960, field: 'demand1960' },
  { year: 1970, field: 'demand1970' },
  { year: 1980, field: 'demand1980' },
  { year: 1990, field: 'demand1990' },
  { year: 2000, field: 'demand2000' },
  { year: 2010, field: 'demand2010' },
  { year: 2020, field: 'demand2020' }
];

/**
 * Get interpolated demand for a specific year
 * Uses linear interpolation between bracketing decade columns
 */
AirportRouteDemand.prototype.getAdjustedDemand = function(year) {
  // Before 1950, scale down from 1950 value
  if (year < 1950) {
    return Math.max(0, Math.round(this.demand1950 * 0.3));
  }

  // After 2020, use 2020 value
  if (year >= 2020) {
    return this.demand2020;
  }

  // Find bracketing decades
  let lowerIdx = 0;
  for (let i = DECADE_FIELDS.length - 1; i >= 0; i--) {
    if (year >= DECADE_FIELDS[i].year) {
      lowerIdx = i;
      break;
    }
  }

  const upperIdx = Math.min(lowerIdx + 1, DECADE_FIELDS.length - 1);
  if (lowerIdx === upperIdx) return this[DECADE_FIELDS[lowerIdx].field];

  const lowerYear = DECADE_FIELDS[lowerIdx].year;
  const upperYear = DECADE_FIELDS[upperIdx].year;
  const lowerDemand = this[DECADE_FIELDS[lowerIdx].field] || 0;
  const upperDemand = this[DECADE_FIELDS[upperIdx].field] || 0;
  const fraction = (year - lowerYear) / (upperYear - lowerYear);

  return Math.round(lowerDemand + fraction * (upperDemand - lowerDemand));
};

/**
 * Get demand category for a specific year (re-derived from interpolated value)
 */
AirportRouteDemand.prototype.getCategoryForYear = function(year) {
  const demand = this.getAdjustedDemand(year);
  if (demand >= 80) return 'very_high';
  if (demand >= 60) return 'high';
  if (demand >= 40) return 'medium';
  if (demand >= 20) return 'low';
  return 'very_low';
};

module.exports = AirportRouteDemand;
