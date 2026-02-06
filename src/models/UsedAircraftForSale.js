const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * UsedAircraftForSale Model
 * Represents aircraft that have been retired from airline fleets and are now for sale on the used market
 */
const UsedAircraftForSale = sequelize.define('UsedAircraftForSale', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  aircraftId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'aircraft_id',
    references: {
      model: 'aircraft',
      key: 'id'
    },
    comment: 'Reference to the base aircraft type'
  },
  // Seller information
  sellerName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'seller_name',
    comment: 'Name of the selling company'
  },
  sellerType: {
    type: DataTypes.ENUM('airline', 'lessor', 'broker'),
    defaultValue: 'airline',
    field: 'seller_type'
  },
  sellerCountry: {
    type: DataTypes.STRING,
    field: 'seller_country'
  },
  sellerReason: {
    type: DataTypes.STRING,
    field: 'seller_reason',
    comment: 'Reason for sale (Fleet Renewal, Restructuring, etc.)'
  },
  // Aircraft condition
  condition: {
    type: DataTypes.STRING,
    defaultValue: 'Good',
    comment: 'Condition description (Excellent, Very Good, Good, Fair, Poor)'
  },
  conditionPercentage: {
    type: DataTypes.INTEGER,
    defaultValue: 70,
    field: 'condition_percentage'
  },
  // Age and usage
  ageYears: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    field: 'age_years'
  },
  totalFlightHours: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'total_flight_hours'
  },
  // Pricing
  purchasePrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'purchase_price'
  },
  leasePrice: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'lease_price'
  },
  // Maintenance check validity (days remaining)
  cCheckRemainingDays: {
    type: DataTypes.INTEGER,
    field: 'c_check_remaining_days'
  },
  dCheckRemainingDays: {
    type: DataTypes.INTEGER,
    field: 'd_check_remaining_days'
  },
  // Status
  status: {
    type: DataTypes.ENUM('available', 'sold', 'withdrawn'),
    defaultValue: 'available'
  },
  listedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'listed_at'
  },
  soldAt: {
    type: DataTypes.DATE,
    field: 'sold_at'
  }
}, {
  tableName: 'used_aircraft_for_sale',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['world_id']
    },
    {
      fields: ['aircraft_id']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = UsedAircraftForSale;
