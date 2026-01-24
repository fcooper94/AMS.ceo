const User = require('./User');
const World = require('./World');
const WorldMembership = require('./WorldMembership');
const Flight = require('./Flight');

// Define associations
User.belongsToMany(World, {
  through: WorldMembership,
  foreignKey: 'user_id',
  as: 'worlds'
});

World.belongsToMany(User, {
  through: WorldMembership,
  foreignKey: 'world_id',
  as: 'members'
});

// Direct access to memberships
User.hasMany(WorldMembership, { foreignKey: 'user_id', as: 'memberships' });
World.hasMany(WorldMembership, { foreignKey: 'world_id', as: 'memberships' });
WorldMembership.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
WorldMembership.belongsTo(World, { foreignKey: 'world_id', as: 'world' });

module.exports = {
  User,
  World,
  WorldMembership,
  Flight
};
