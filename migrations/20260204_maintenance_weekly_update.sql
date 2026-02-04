-- Migration: Update maintenance checks system
-- Remove B check, add Weekly check, update intervals
-- Date: 2026-02-04

-- 1. Add new columns to user_aircraft table
ALTER TABLE user_aircraft
ADD COLUMN IF NOT EXISTS last_weekly_check_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_a_check_hours DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS a_check_interval_hours INTEGER,
ADD COLUMN IF NOT EXISTS auto_schedule_weekly BOOLEAN DEFAULT FALSE;

-- 2. Migrate B check data to weekly (if any B checks exist)
UPDATE user_aircraft
SET last_weekly_check_date = last_b_check_date
WHERE last_b_check_date IS NOT NULL AND last_weekly_check_date IS NULL;

-- 3. Migrate autoScheduleB to autoScheduleWeekly
UPDATE user_aircraft
SET auto_schedule_weekly = auto_schedule_b
WHERE auto_schedule_b IS NOT NULL;

-- 4. Update check_type ENUM in recurring_maintenance table
-- First, convert any 'B' checks to 'weekly'
UPDATE recurring_maintenance
SET check_type = 'weekly'
WHERE check_type = 'B';

-- 5. Update A check intervals from days to hours
-- Old: 35-50 days -> New: 800-1000 hours
-- Assuming ~10 flight hours per day average, convert existing intervals
UPDATE user_aircraft
SET a_check_interval_hours = COALESCE(a_check_interval_days * 20, 900)
WHERE a_check_interval_hours IS NULL;

-- 6. Update C check intervals to 2 years (730 days)
UPDATE user_aircraft
SET c_check_interval_days = 730
WHERE c_check_interval_days IS NOT NULL;

-- 7. Update D check intervals to 5-7 years range
UPDATE user_aircraft
SET d_check_interval_days = GREATEST(1825, LEAST(d_check_interval_days, 2555))
WHERE d_check_interval_days IS NOT NULL;

-- 8. Set lastACheckHours for existing aircraft based on current flight hours
UPDATE user_aircraft
SET last_a_check_hours = GREATEST(0, total_flight_hours - 400)
WHERE last_a_check_date IS NOT NULL AND last_a_check_hours IS NULL;

-- 9. Update comments on columns
COMMENT ON COLUMN user_aircraft.last_daily_check_date IS 'Daily check - valid for 1-2 days (30-90 mins duration)';
COMMENT ON COLUMN user_aircraft.last_weekly_check_date IS 'Weekly check - valid for 7-8 days (1.5-3 hrs duration)';
COMMENT ON COLUMN user_aircraft.last_a_check_date IS 'A Check - every 800-1000 flight hours (6-12 hours duration)';
COMMENT ON COLUMN user_aircraft.last_a_check_hours IS 'Flight hours at last A Check';
COMMENT ON COLUMN user_aircraft.a_check_interval_hours IS 'A Check interval in flight hours (800-1000)';
COMMENT ON COLUMN user_aircraft.c_check_interval_days IS 'C Check interval in days (730, i.e. 2 years)';
COMMENT ON COLUMN user_aircraft.d_check_interval_days IS 'D Check interval in days (1825-2555, i.e. 5-7 years)';

-- Note: The old B check columns (last_b_check_date, b_check_interval_days, auto_schedule_b)
-- are kept for backwards compatibility but are no longer used.
-- They can be dropped in a future migration after confirming the system works correctly.
