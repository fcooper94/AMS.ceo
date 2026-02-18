const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AirspaceRestriction = sequelize.define('AirspaceRestriction', {
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
  firCode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    field: 'fir_code'
  },
  firName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'fir_name'
  },
  restrictionType: {
    type: DataTypes.ENUM('until_further_notice', 'date_range'),
    allowNull: false,
    field: 'restriction_type'
  },
  startDate: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'end_date'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  affectedRouteCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'affected_route_count'
  },
  altitudeMin: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'altitude_min',
    comment: 'Minimum FL for restriction (null = surface)'
  },
  altitudeMax: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'altitude_max',
    comment: 'Maximum FL for restriction (null = unlimited)'
  }
}, {
  tableName: 'airspace_restrictions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['world_membership_id', 'is_active'] },
    { fields: ['fir_code'] }
  ]
});

module.exports = AirspaceRestriction;
