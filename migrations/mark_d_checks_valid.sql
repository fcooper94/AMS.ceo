-- Mark all D checks as valid by setting last D check date to today (game time)
-- D checks are valid for 5-7 years, so setting to 2014-02-01 makes them valid

UPDATE user_aircraft SET
  last_d_check_date = '2014-02-01'
WHERE last_d_check_date IS NULL OR last_d_check_date < '2010-01-01';

-- Verify the update
SELECT registration, last_d_check_date FROM user_aircraft;
