const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MetroZone = sequelize.define('MetroZone', {
  id: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    comment: 'Short zone ID e.g. LON, NYC, DXB'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Display name e.g. London, New York'
  },
  countryCode: {
    type: DataTypes.STRING(2),
    allowNull: false,
    field: 'country_code',
    comment: 'ISO 2-letter country code'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  }
}, {
  tableName: 'metro_zones',
  timestamps: true,
  underscored: true
});

module.exports = MetroZone;
