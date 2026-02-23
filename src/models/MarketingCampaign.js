const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * MarketingCampaign Model
 * Represents a bundled advertising campaign run by an airline.
 * Multiple channels can be selected at once. The demand boost is
 * applied to all routes for this airline while the campaign is active.
 * Weekly costs are charged via recordWeeklyOverheads in worldTimeService.
 */
const MarketingCampaign = sequelize.define('MarketingCampaign', {
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
  channels: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of channel keys e.g. ["tv","radio","billboards"]'
  },
  weeklyBudget: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'weekly_budget',
    comment: 'Combined era-scaled weekly cost for all channels'
  },
  demandBoost: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'demand_boost',
    comment: 'Pre-calculated capped demand boost % (e.g. 11.0 = +11%)'
  },
  gameStartDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'game_start_date',
    comment: 'In-game date campaign began (YYYY-MM-DD)'
  },
  gameEndDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'game_end_date',
    comment: 'In-game date campaign ends (YYYY-MM-DD). NULL = indefinite.'
  },
  durationWeeks: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'duration_weeks',
    comment: 'Total planned weeks (null = indefinite)'
  },
  audienceLevels: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    field: 'audience_levels',
    comment: 'Per-channel audience level e.g. {"tv":"national","radio":"local"}'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'marketing_campaigns',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['world_membership_id'] },
    { fields: ['world_membership_id', 'is_active'] }
  ]
});

module.exports = MarketingCampaign;
