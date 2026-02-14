-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_membership_id UUID NOT NULL REFERENCES world_memberships(id) ON DELETE CASCADE,
  bank_id VARCHAR(255) NOT NULL,
  loan_type VARCHAR(255) NOT NULL CHECK (loan_type IN ('working_capital', 'fleet_expansion', 'infrastructure')),
  status VARCHAR(255) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted')),
  principal_amount DECIMAL(15, 2) NOT NULL,
  remaining_principal DECIMAL(15, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) NOT NULL,
  term_months INTEGER NOT NULL,
  months_remaining INTEGER NOT NULL,
  repayment_strategy VARCHAR(255) NOT NULL DEFAULT 'fixed' CHECK (repayment_strategy IN ('fixed', 'reducing', 'interest_only')),
  monthly_payment DECIMAL(15, 2) DEFAULT 0,
  total_interest_paid DECIMAL(15, 2) DEFAULT 0,
  total_principal_paid DECIMAL(15, 2) DEFAULT 0,
  early_repayment_fee DECIMAL(5, 2) DEFAULT 0,
  payment_holidays_total INTEGER DEFAULT 0,
  payment_holidays_used INTEGER DEFAULT 0,
  is_on_holiday BOOLEAN DEFAULT FALSE,
  missed_payments INTEGER DEFAULT 0,
  last_payment_game_date VARCHAR(255),
  origination_game_date VARCHAR(255) NOT NULL,
  credit_score_at_origin INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loans_membership_status ON loans (world_membership_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_membership ON loans (world_membership_id);

-- Add loan_payments column to weekly_financials
ALTER TABLE weekly_financials ADD COLUMN IF NOT EXISTS loan_payments DECIMAL(15, 2) DEFAULT 0;
