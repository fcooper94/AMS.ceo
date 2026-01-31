require('dotenv').config();
const sequelize = require('../config/database');

async function recalculateArrivals() {
  try {
    console.log('Connecting...');
    await sequelize.authenticate();

    // Get ALL flights with route data (including turnaround time and tech stop info)
    const [flights] = await sequelize.query(`
      SELECT
        sf.id,
        sf.scheduled_date,
        sf.departure_time,
        r.distance,
        r.turnaround_time,
        r.tech_stop_airport_id
      FROM scheduled_flights sf
      JOIN routes r ON sf.route_id = r.id
    `);

    console.log('Found', flights.length, 'flights to recalculate');

    for (const flight of flights) {
      const cruiseSpeed = 450; // default knots
      const distance = parseFloat(flight.distance) || 500;
      const turnaroundMinutes = flight.turnaround_time || 45;
      const hasTechStop = !!flight.tech_stop_airport_id;

      let totalFlightMs;

      if (hasTechStop) {
        // Tech stop route: leg1 + techStop + leg2 + turnaround + leg3 + techStop + leg4
        const techStopMinutes = 30;
        const leg1Distance = Math.round(distance * 0.4);
        const leg2Distance = Math.round(distance * 0.6);

        const leg1Hours = leg1Distance / cruiseSpeed;
        const leg2Hours = leg2Distance / cruiseSpeed;
        const leg3Hours = leg2Distance / cruiseSpeed;
        const leg4Hours = leg1Distance / cruiseSpeed;

        const totalHours = leg1Hours + (techStopMinutes / 60) + leg2Hours +
                           (turnaroundMinutes / 60) +
                           leg3Hours + (techStopMinutes / 60) + leg4Hours;
        totalFlightMs = totalHours * 60 * 60 * 1000;
      } else {
        // Standard round-trip: outbound + turnaround + return
        const oneWayHours = distance / cruiseSpeed;
        const totalHours = oneWayHours + (turnaroundMinutes / 60) + oneWayHours;
        totalFlightMs = totalHours * 60 * 60 * 1000;
      }

      const depDateTime = new Date(flight.scheduled_date + 'T' + flight.departure_time);
      const arrDateTime = new Date(depDateTime.getTime() + totalFlightMs);

      // Format arrival date using local time (avoids UTC timezone shift)
      const year = arrDateTime.getFullYear();
      const month = String(arrDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(arrDateTime.getDate()).padStart(2, '0');
      const arrivalDate = `${year}-${month}-${day}`;
      const arrivalTime = arrDateTime.toTimeString().split(' ')[0];

      console.log(`Flight ${flight.id}: ${flight.scheduled_date} ${flight.departure_time} -> ${arrivalDate} ${arrivalTime} (${hasTechStop ? 'tech stop' : 'direct'})`);

      await sequelize.query(`
        UPDATE scheduled_flights
        SET arrival_date = :arrivalDate, arrival_time = :arrivalTime
        WHERE id = :id
      `, {
        replacements: { id: flight.id, arrivalDate, arrivalTime }
      });
    }

    console.log('Recalculation complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

recalculateArrivals();
