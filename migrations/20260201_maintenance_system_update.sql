-- Migration: Maintenance System Update
-- Date: 2026-02-01
-- Description: Updates the maintenance system with new check types and intervals

-- 1. Add new columns to user_aircraft table
ALTER TABLE user_aircraft
ADD COLUMN IF NOT EXISTS last_daily_check_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_transit_check_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS a_check_interval_days INTEGER,
ADD COLUMN IF NOT EXISTS b_check_interval_days INTEGER,
ADD COLUMN IF NOT EXISTS c_check_interval_days INTEGER,
ADD COLUMN IF NOT EXISTS d_check_interval_days INTEGER;

-- 2. Add comments to describe the columns
COMMENT ON COLUMN user_aircraft.last_daily_check_date IS 'Daily check - valid for 2 calendar days until midnight UTC (1 hour duration)';
COMMENT ON COLUMN user_aircraft.last_transit_check_date IS 'Transit check - completed automatically between flights (20 mins duration)';
COMMENT ON COLUMN user_aircraft.last_a_check_date IS 'A Check - valid for 35-50 days (3 hours duration)';
COMMENT ON COLUMN user_aircraft.last_b_check_date IS 'B Check - valid for 6-8 months (6 hours duration)';
COMMENT ON COLUMN user_aircraft.last_c_check_date IS 'C Check - valid for 20-24 months (14 days duration)';
COMMENT ON COLUMN user_aircraft.last_d_check_date IS 'D Check - valid for 6-10 years (60 days duration)';
COMMENT ON COLUMN user_aircraft.a_check_interval_days IS 'A Check interval in days (35-50, randomized per aircraft)';
COMMENT ON COLUMN user_aircraft.b_check_interval_days IS 'B Check interval in days (180-240, i.e. 6-8 months)';
COMMENT ON COLUMN user_aircraft.c_check_interval_days IS 'C Check interval in days (600-720, i.e. 20-24 months)';
COMMENT ON COLUMN user_aircraft.d_check_interval_days IS 'D Check interval in days (2190-3650, i.e. 6-10 years)';

-- 3. Update existing aircraft with random maintenance intervals
-- This sets random intervals for each aircraft for variety
UPDATE user_aircraft
SET
  a_check_interval_days = FLOOR(RANDOM() * (50 - 35 + 1) + 35),
  b_check_interval_days = FLOOR(RANDOM() * (240 - 180 + 1) + 180),
  c_check_interval_days = FLOOR(RANDOM() * (720 - 600 + 1) + 600),
  d_check_interval_days = FLOOR(RANDOM() * (3650 - 2190 + 1) + 2190)
WHERE a_check_interval_days IS NULL;

-- 4. Migrate existing maintenance data (if old A/B checks were daily/weekly)
-- The old A check was "daily" - copy to new daily check field
-- The old B check was "weekly" - this concept no longer exists, data kept for reference
-- Note: Run this only if you want to migrate old data
-- UPDATE user_aircraft
-- SET last_daily_check_date = last_a_check_date
-- WHERE last_a_check_date IS NOT NULL AND last_daily_check_date IS NULL;

-- 5. Update check_type enum in recurring_maintenance to include 'daily'
-- First, we need to add the new value to the enum
-- Note: PostgreSQL enum modifications require special handling

-- Create a new type with the additional value
DO $$
BEGIN
  -- Check if 'daily' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'check_type_enum'::regtype
    AND enumlabel = 'daily'
  ) THEN
    -- Add 'daily' to the enum
    ALTER TYPE check_type_enum ADD VALUE IF NOT EXISTS 'daily' BEFORE 'A';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- Enum doesn't exist or has different name, try alternate approach
    BEGIN
      -- Try with the actual enum name from the table
      ALTER TYPE recurring_maintenance_check_type_enum ADD VALUE IF NOT EXISTS 'daily' BEFORE 'A';
    EXCEPTION
      WHEN undefined_object THEN
        -- If that also fails, the enum might have a different name
        RAISE NOTICE 'Could not find enum type. You may need to manually add "daily" to the check_type enum.';
    END;
END $$;

-- 6. Initialize check dates for new aircraft (optional - set to current game time when acquired)
-- This would typically be done in the application code when aircraft is acquired

-- Summary of check types:
-- Daily Check: 1 hour duration, valid for 2 calendar days, manually scheduled
-- Transit Check: 20 min duration, automatic between every flight
-- A Check: 3 hours duration, 35-50 days interval, manually scheduled
-- B Check: 6 hours duration, 6-8 months interval, manually scheduled
-- C Check: 14 days duration, 20-24 months interval, AUTOMATIC (day before expiry)
-- D Check: 60 days duration, 6-10 years interval, AUTOMATIC (day before expiry)
