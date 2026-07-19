const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Payment
 * One row per Stripe Checkout purchase of a credit pack. Written as `pending`
 * when checkout starts and flipped to `paid` by the webhook, which is also what
 * grants the credits and stores the invoice/receipt URLs.
 */
const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: { model: 'users', key: 'id' }
  },
  packId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'pack_id'
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Amount charged, in the smallest currency unit (pence)'
  },
  currency: {
    type: DataTypes.STRING(8),
    allowNull: false,
    defaultValue: 'gbp'
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  stripeSessionId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stripe_session_id'
  },
  stripePaymentIntent: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stripe_payment_intent'
  },
  invoiceUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'invoice_url',
    comment: 'Hosted Stripe invoice URL'
  },
  receiptUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'receipt_url',
    comment: 'Stripe charge receipt URL'
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'refunded_at',
    comment: 'When an admin refunded this payment (null = active)'
  },
  creditNoteUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'credit_note_url',
    comment: 'Stripe credit note (refund invoice) PDF, set on refund'
  }
}, {
  tableName: 'payments',
  timestamps: true,
  underscored: true
});

module.exports = Payment;
