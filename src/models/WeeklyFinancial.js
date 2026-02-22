const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * WeeklyFinancial Model
 * Stores per-game-week financial data for each airline.
 * Flight revenue/costs are incremented per-flight by processFlightRevenue.
 * Overhead costs are recorded once per game week by the tick loop.
 */
const WeeklyFinancial = sequelize.define('WeeklyFinancial', {
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
  weekStart: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'week_start',
    comment: 'Monday of the game week (YYYY-MM-DD)'
  },

  // Flight revenue
  flightRevenue: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'flight_revenue'
  },
  passengerRevenueBreakdown: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'passenger_revenue_breakdown',
    comment: 'Per-cabin revenue: {economy, economyPlus, business, first}'
  },
  cargoRevenueBreakdown: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'cargo_revenue_breakdown',
    comment: 'Per-cargo-type revenue: {general, express, heavy, oversized, perishable, dangerous, liveAnimal, highValue}'
  },

  // Flight operating costs (broken down)
  fuelCosts: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'fuel_costs'
  },
  crewCosts: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'crew_costs'
  },
  maintenanceCosts: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'maintenance_costs'
  },
  airportFees: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'airport_fees'
  },

  // Weekly overhead costs (recorded once per week)
  staffCosts: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'staff_costs'
  },
  leaseCosts: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'lease_costs'
  },
  contractorCosts: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'contractor_costs'
  },
  fleetCommonalityCosts: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'fleet_commonality_costs'
  },
  overheadRecorded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'overhead_recorded',
    comment: 'Whether weekly overhead costs have been snapshotted'
  },

  // Loan payments (recorded by weekly loan processor)
  loanPayments: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'loan_payments'
  },

  // Stats
  flights: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  passengers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'weekly_financials',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['world_membership_id', 'week_start']
    },
    {
      fields: ['world_membership_id']
    }
  ]
});

/**
 * Get the Monday date string for a given game time
 */
WeeklyFinancial.getWeekStart = function(gameTime) {
  const d = new Date(gameTime);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split('T')[0];
};

module.exports = WeeklyFinancial;
