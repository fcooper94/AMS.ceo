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
    allowNull: false,
    field: 'user_id',
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
    comment: 'ICAO airline code',
    field: 'airline_code'
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
  }
}, {
  tableName: 'world_memberships',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'world_id']
    },
    {
      unique: true,
      fields: ['world_id', 'airline_code'],
      where: {
        airline_code: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    }
  ]
});

module.exports = WorldMembership;
