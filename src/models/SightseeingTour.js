const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * SightseeingTour Model
 * A scenic pleasure flight that departs from and returns to a single base
 * airport, flying over a set of scenic waypoints the player picks on a map.
 * Unlike a Route it has no destination airport — it's a loop. Duration is
 * derived from the summed leg distances and the assigned aircraft's speed.
 * Kept as its own table so it stays cleanly separate from scheduled routes.
 */
const SightseeingTour = sequelize.define('SightseeingTour', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  worldMembershipId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'world_membership_id',
    comment: 'The airline operating this tour',
    references: { model: 'world_memberships', key: 'id' }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Player-facing tour name (e.g. "London Skyline Tour")'
  },
  baseAirportId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'base_airport_id',
    comment: 'Airport the tour departs from and returns to',
    references: { model: 'airports', key: 'id' }
  },
  waypoints: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Ordered scenic points between base departure and return: [{lat, lng, name}]'
  },
  distanceNm: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'distance_nm',
    comment: 'Total round-trip distance in nautical miles (base -> waypoints -> base)'
  },
  durationMin: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'duration_min',
    comment: 'Estimated flight duration in minutes (from distance + aircraft speed)'
  },
  assignedAircraftId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assigned_aircraft_id',
    comment: 'Aircraft assigned to fly this tour',
    references: { model: 'user_aircraft', key: 'id' }
  },
  ticketPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'ticket_price',
    comment: 'Flat price per seat for the scenic flight'
  },
  scheduledDepartureTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'scheduled_departure_time',
    comment: 'Daily departure time'
  },
  daysOfWeek: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    defaultValue: [0, 1, 2, 3, 4, 5, 6],
    field: 'days_of_week',
    comment: 'Days of week the tour operates (0=Sunday, 6=Saturday)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Whether the tour is currently operating'
  },
  // Performance metrics (mirrors Route)
  totalFlights: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_flights'
  },
  totalRevenue: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'total_revenue'
  },
  totalCosts: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'total_costs'
  },
  totalPassengers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_passengers'
  },
  averageLoadFactor: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    field: 'average_load_factor'
  },
  lastRevenueGameDay: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'last_revenue_game_day',
    comment: 'Last game date (YYYY-MM-DD) revenue was processed'
  }
}, {
  tableName: 'sightseeing_tours',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['world_membership_id'] },
    { fields: ['base_airport_id', 'is_active'] }
  ]
});

module.exports = SightseeingTour;
