-- Reset all maintenance check history
-- This allows testing the maintenance system from scratch

-- 1. Clear all last check dates on aircraft
UPDATE user_aircraft SET
  last_daily_check_date = NULL,
  last_weekly_check_date = NULL,
  last_a_check_date = NULL,
  last_a_check_hours = NULL,
  last_c_check_date = NULL,
  last_d_check_date = NULL;

-- 2. Delete all scheduled/recurring maintenance
DELETE FROM recurring_maintenance;

-- 3. Verify the reset
SELECT 'Aircraft maintenance history cleared' AS status;
SELECT COUNT(*) AS aircraft_count FROM user_aircraft;
SELECT COUNT(*) AS maintenance_records FROM recurring_maintenance;
