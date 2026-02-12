require('dotenv').config();
const seq = require('../config/database');
async function check() {
  console.log('=== EGLL Top 15 by demand_2010 ===');
  const [egll] = await seq.query(`
    SELECT a2.icao_code as dest, a2.name, a2.type,
           d.demand_1950, d.demand_2000, d.demand_2010, d.demand_2020
    FROM airport_route_demands d
    JOIN airports a1 ON d.from_airport_id = a1.id
    JOIN airports a2 ON d.to_airport_id = a2.id
    WHERE a1.icao_code = 'EGLL' ORDER BY d.demand_2010 DESC LIMIT 15
  `);
  egll.forEach(r => console.log(`  ${r.dest} [${r.type}] ${r.name}: d1950=${r.demand_1950} d2000=${r.demand_2000} d2010=${r.demand_2010} d2020=${r.demand_2020}`));

  console.log('\n=== Key Routes ===');
  const routes = [
    ['EGLL','KJFK','Heathrow-JFK'], ['EGLL','EGCC','Heathrow-Manchester'],
    ['EGLL','LFPG','Heathrow-Paris CDG'], ['EGLL','OMDB','Heathrow-Dubai'],
    ['EGLL','VIDP','Heathrow-Delhi'], ['EGLL','RJTT','Heathrow-Tokyo'],
    ['EGLL','LEMD','Heathrow-Madrid'], ['EGLL','YSSY','Heathrow-Sydney'],
    ['EGSS','LFPG','Stansted-Paris'], ['EGSS','LEMD','Stansted-Madrid'],
    ['KJFK','KLAX','JFK-LAX'], ['OMDB','VIDP','Dubai-Delhi'],
  ];
  for (const [f,t,label] of routes) {
    const [r] = await seq.query(`
      SELECT d.demand_1950, d.demand_1970, d.demand_2000, d.demand_2010, d.demand_2020
      FROM airport_route_demands d JOIN airports a1 ON d.from_airport_id=a1.id JOIN airports a2 ON d.to_airport_id=a2.id
      WHERE a1.icao_code='${f}' AND a2.icao_code='${t}'
    `);
    if (r.length) console.log(`  ${label}: d1950=${r[0].demand_1950} d1970=${r[0].demand_1970} d2000=${r[0].demand_2000} d2010=${r[0].demand_2010} d2020=${r[0].demand_2020}`);
    else console.log(`  ${label}: NO RECORD`);
  }

  console.log('\n=== Distribution ===');
  const [dist] = await seq.query(`
    SELECT CASE WHEN demand_2010>=80 THEN '80-100' WHEN demand_2010>=60 THEN '60-79'
      WHEN demand_2010>=40 THEN '40-59' WHEN demand_2010>=20 THEN '20-39'
      WHEN demand_2010>=10 THEN '10-19' WHEN demand_2010>=5 THEN '5-9' ELSE '3-4'
    END as range, COUNT(*) as cnt FROM airport_route_demands GROUP BY range ORDER BY MIN(demand_2010) DESC
  `);
  dist.forEach(r => console.log(`  ${r.range}: ${parseInt(r.cnt).toLocaleString()}`));
  await seq.close();
}
check();
