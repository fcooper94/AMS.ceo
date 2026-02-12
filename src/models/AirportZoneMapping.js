const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AirportZoneMapping = sequelize.define('AirportZoneMapping', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  airportId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'airport_id',
    references: {
      model: 'airports',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  zoneId: {
    type: DataTypes.STRING(10),
    allowNull: false,
    field: 'zone_id',
    references: {
      model: 'metro_zones',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  demandShare: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: false,
    defaultValue: 1.0,
    field: 'demand_share',
    comment: 'Fraction of zone demand this airport handles (0.0-1.0)'
  }
}, {
  tableName: 'airport_zone_mappings',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['airport_id', 'zone_id'],
      name: 'unique_airport_zone'
    },
    {
      fields: ['airport_id']
    },
    {
      fields: ['zone_id']
    }
  ]
});

module.exports = AirportZoneMapping;
