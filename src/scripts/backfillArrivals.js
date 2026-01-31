require('dotenv').config();
const sequelize = require('../config/database');

async function backfillArrivals() {
  try {
    console.log('Connecting...');
    await sequelize.authenticate();

    // Get flights missing arrival data, join with route for distance
    const [flights] = await sequelize.query(`
      SELECT sf.id, sf.scheduled_date, sf.departure_time, r.distance
      FROM scheduled_flights sf
      JOIN routes r ON sf.route_id = r.id
      WHERE sf.arrival_date IS NULL OR sf.arrival_time IS NULL
    `);

    console.log('Found', flights.length, 'flights to backfill');

    for (const flight of flights) {
      const cruiseSpeed = 450; // default knots
      const distance = parseFloat(flight.distance) || 500;
      const flightDurationHours = distance / cruiseSpeed;
      const flightDurationMs = flightDurationHours * 60 * 60 * 1000;

      const depDateTime = new Date(flight.scheduled_date + 'T' + flight.departure_time);
      const arrDateTime = new Date(depDateTime.getTime() + flightDurationMs);

      // Format arrival date using local time (avoids UTC timezone shift)
      const year = arrDateTime.getFullYear();
      const month = String(arrDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(arrDateTime.getDate()).padStart(2, '0');
      const arrivalDate = `${year}-${month}-${day}`;
      const arrivalTime = arrDateTime.toTimeString().split(' ')[0];

      await sequelize.query(`
        UPDATE scheduled_flights
        SET arrival_date = :arrivalDate, arrival_time = :arrivalTime
        WHERE id = :id
      `, {
        replacements: { id: flight.id, arrivalDate, arrivalTime }
      });
    }

    console.log('Backfill complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

backfillArrivals();
