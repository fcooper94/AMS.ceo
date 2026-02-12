const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * WorldMembership Model
 * Junction table for User-World many-to-many relationship
 */
const WorldMembership = sequelize.define('WorldMembership', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id',
    comment: 'Null for AI-controlled airlines',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  worldId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'world_id',
    references: {
      model: 'worlds',
      key: 'id'
    }
  },
  airlineName: {
    type: DataTypes.STRING,
    comment: 'User airline name in this world',
    field: 'airline_name'
  },
  airlineCode: {
    type: DataTypes.STRING(3),
    comment: 'ICAO airline code (3 letters)',
    field: 'airline_code'
  },
  iataCode: {
    type: DataTypes.STRING(2),
    comment: 'IATA airline code (2 letters) - used for flight number prefix',
    field: 'iata_code'
  },
  region: {
    type: DataTypes.STRING,
    comment: 'Starting region (Africa, Asia, Europe, North America, Oceania, South America)',
    field: 'region'
  },
  airlineType: {
    type: DataTypes.STRING,
    comment: 'Airline type (regional, medium-haul, long-haul)',
    field: 'airline_type'
  },
  baseAirportId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'base_airport_id',
    comment: 'Foreign key reference to Airport',
    references: {
      model: 'airports',
      key: 'id'
    }
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 1000000.00,
    comment: 'Starting balance for airline'
  },
  reputation: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    comment: 'Airline reputation score (0-100)'
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'joined_at'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether user is actively participating in this world',
    field: 'is_active'
  },
  lastCreditDeduction: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Last time credits were deducted for this membership',
    field: 'last_credit_deduction'
  },
  lastVisited: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time user entered this world',
    field: 'last_visited'
  },
  // AI airline fields
  isAI: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_ai',
    comment: 'Whether this membership represents an AI-controlled airline'
  },
  aiPersonality: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ai_personality',
    comment: 'AI behavior profile: aggressive, conservative, balanced'
  },
  aiLastDecisionTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ai_last_decision_time',
    comment: 'Game time of last AI decision cycle'
  },
  // Service contractor selections (budget, standard, premium)
  cleaningContractor: {
    type: DataTypes.STRING,
    defaultValue: 'standard',
    field: 'cleaning_contractor',
    comment: 'Cleaning/cabin services tier: budget, standard, premium'
  },
  groundContractor: {
    type: DataTypes.STRING,
    defaultValue: 'standard',
    field: 'ground_contractor',
    comment: 'Ground services/handling tier: budget, standard, premium'
  },
  engineeringContractor: {
    type: DataTypes.STRING,
    defaultValue: 'standard',
    field: 'engineering_contractor',
    comment: 'Engineering/maintenance tier: budget, standard, premium'
  }
}, {
  tableName: 'world_memberships',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'world_id'],
      where: {
        is_ai: false
      }
    },
    {
      unique: true,
      fields: ['world_id', 'airline_code'],
      where: {
        airline_code: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    },
    {
      unique: true,
      fields: ['world_id', 'iata_code'],
      where: {
        iata_code: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    }
  ]
});

module.exports = WorldMembership;
