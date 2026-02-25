const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * User Model
 * Represents a VATSIM user who can participate in multiple worlds
 */
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vatsimId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'vatsim_id'
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'last_name'
  },
  email: {
    type: DataTypes.STRING,
    field: 'email'
  },
  rating: {
    type: DataTypes.INTEGER,
    comment: 'VATSIM controller rating'
  },
  pilotRating: {
    type: DataTypes.INTEGER,
    comment: 'VATSIM pilot rating',
    field: 'pilot_rating'
  },
  division: {
    type: DataTypes.STRING,
    comment: 'VATSIM division'
  },
  subdivision: {
    type: DataTypes.STRING,
    comment: 'VATSIM subdivision'
  },
  lastLogin: {
    type: DataTypes.DATE,
    field: 'last_login'
  },
  credits: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
    allowNull: false,
    comment: 'User credits for participating in worlds (1 credit per game week)'
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'is_admin',
    comment: 'Whether user has admin access'
  },
  isContributor: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'is_contributor',
    comment: 'Whether user has contributor (elevated) access'
  },
  unlimitedCredits: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'unlimited_credits',
    comment: 'Whether user has unlimited credits (no deductions)'
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'password_hash',
    comment: 'Bcrypt hash for local (non-VATSIM) accounts'
  },
  authMethod: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'vatsim',
    field: 'auth_method',
    comment: 'Authentication method: vatsim or local'
  },
  resetToken: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'reset_token',
    comment: 'Password reset token'
  },
  resetTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reset_token_expiry',
    comment: 'Password reset token expiration'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

module.exports = User;
