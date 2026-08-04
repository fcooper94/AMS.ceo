const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * CabinLayout Model
 * Stores saved cabin+cargo presets per airline per aircraft variant.
 */
const CabinLayout = sequelize.define('CabinLayout', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  worldMembershipId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'world_membership_id',
    references: { model: 'world_memberships', key: 'id' }
  },
  aircraftId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'aircraft_id',
    comment: 'Catalog Aircraft variant UUID (e.g. Boeing 777-200)'
  },
  name: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  economySeats: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'economy_seats'
  },
  economyPlusSeats: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'economy_plus_seats'
  },
  businessSeats: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'business_seats'
  },
  firstSeats: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'first_seats'
  },
  toilets: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  cargoConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'cargo_config',
    comment: 'Cargo allocation JSON (same shape as UserAircraft.cargoConfig)'
  },
  cabinUpgrades: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'cabin_upgrades',
    comment: 'Cabin upgrade selections JSON: { economy: [...], _aircraft: [...] }'
  }
}, {
  tableName: 'cabin_layouts',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['world_membership_id', 'aircraft_id', 'name'],
      name: 'cabin_layouts_membership_aircraft_name'
    }
  ]
});

module.exports = CabinLayout;
