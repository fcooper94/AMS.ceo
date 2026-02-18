-- Realistic aircraft acquisition system: order tracking, delivery delays, financing
-- Add 'on_order' to the status ENUM
ALTER TYPE enum_user_aircraft_status ADD VALUE IF NOT EXISTS 'on_order';

-- Order tracking fields
ALTER TABLE user_aircraft ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ;
ALTER TABLE user_aircraft ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMPTZ;
ALTER TABLE user_aircraft ADD COLUMN IF NOT EXISTS deposit_paid DECIMAL(15,2) DEFAULT 0;
ALTER TABLE user_aircraft ADD COLUMN IF NOT EXISTS remaining_payment DECIMAL(15,2) DEFAULT 0;
ALTER TABLE user_aircraft ADD COLUMN IF NOT EXISTS financing_method VARCHAR(10);
ALTER TABLE user_aircraft ADD COLUMN IF NOT EXISTS financing_bank_id VARCHAR(50);
ALTER TABLE user_aircraft ADD COLUMN IF NOT EXISTS financing_term_weeks INTEGER;
ALTER TABLE user_aircraft ADD COLUMN IF NOT EXISTS transaction_discount DECIMAL(5,2) DEFAULT 0;
ALTER TABLE user_aircraft ADD COLUMN IF NOT EXISTS bulk_order_index INTEGER DEFAULT 0;

-- Index for efficient delivery processing
CREATE INDEX IF NOT EXISTS idx_user_aircraft_on_order ON user_aircraft (status, expected_delivery_date) WHERE status = 'on_order';
