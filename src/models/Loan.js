const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Loan Model
 * Tracks bank loans taken by airlines. Monthly payments are processed
 * automatically by the tick loop in worldTimeService.
 */
const Loan = sequelize.define('Loan', {
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
  bankId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'bank_id',
    comment: 'Key into bankConfig (e.g. skyvault, atlas)'
  },
  loanType: {
    type: DataTypes.ENUM('working_capital', 'fleet_expansion', 'infrastructure'),
    allowNull: false,
    field: 'loan_type'
  },
  status: {
    type: DataTypes.ENUM('active', 'paid_off', 'defaulted'),
    defaultValue: 'active'
  },
  principalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'principal_amount',
    comment: 'Original borrowed amount'
  },
  remainingPrincipal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'remaining_principal',
    comment: 'Current outstanding principal'
  },
  interestRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    field: 'interest_rate',
    comment: 'Annual interest rate % locked at origination'
  },
  termMonths: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'term_months',
    comment: 'Total loan term in game months'
  },
  monthsRemaining: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'months_remaining'
  },
  repaymentStrategy: {
    type: DataTypes.ENUM('fixed', 'reducing', 'interest_only'),
    allowNull: false,
    defaultValue: 'fixed',
    field: 'repayment_strategy'
  },
  monthlyPayment: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'monthly_payment',
    comment: 'Pre-calculated monthly payment (for fixed strategy)'
  },
  totalInterestPaid: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'total_interest_paid'
  },
  totalPrincipalPaid: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'total_principal_paid'
  },
  earlyRepaymentFee: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    field: 'early_repayment_fee',
    comment: 'Percentage fee for early repayment'
  },
  paymentHolidaysTotal: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'payment_holidays_total'
  },
  paymentHolidaysUsed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'payment_holidays_used'
  },
  isOnHoliday: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_on_holiday'
  },
  missedPayments: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'missed_payments',
    comment: 'Consecutive missed payments (3 = default)'
  },
  lastPaymentGameDate: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'last_payment_game_date',
    comment: 'YYYY-MM-DD of last processed payment'
  },
  originationGameDate: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'origination_game_date',
    comment: 'YYYY-MM-DD when loan was taken'
  },
  creditScoreAtOrigin: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'credit_score_at_origin'
  }
}, {
  tableName: 'loans',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['world_membership_id', 'status']
    },
    {
      fields: ['world_membership_id']
    }
  ]
});

module.exports = Loan;
