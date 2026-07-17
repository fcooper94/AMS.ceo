/**
 * Scrapyard Companies
 *
 * Real-world-inspired aircraft recycling and dismantling companies.
 * Used to generate scrap offers when players or AI dispose of aircraft.
 *
 * availableFrom: year the company starts operating (era-appropriate filtering)
 * Early eras had fewer dedicated scrapyards — aircraft were often scrapped
 * at military surplus yards or the airline's own maintenance base.
 */

module.exports = [
  // North America — desert boneyards existed from WW2 surplus era
  { name: 'Davis-Monthan Surplus Salvage', icaoCode: 'KDMA', city: 'Tucson', country: 'United States', lat: 32.1665, lon: -110.8831, region: 'North America', specialty: 'military surplus & early jets', availableFrom: 1950 },
  { name: 'Kingman Aircraft Storage', icaoCode: 'KIGM', city: 'Kingman', country: 'United States', lat: 35.2595, lon: -113.9381, region: 'North America', specialty: 'propeller aircraft', availableFrom: 1950 },
  { name: 'Mojave Air & Space Port Recycling', icaoCode: 'KMHV', city: 'Mojave', country: 'United States', lat: 35.0585, lon: -118.1518, region: 'North America', specialty: 'widebody specialist', availableFrom: 1972 },
  { name: 'Roswell Aerospace Salvage', icaoCode: 'KROW', city: 'Roswell', country: 'United States', lat: 33.3016, lon: -104.5307, region: 'North America', specialty: 'all types', availableFrom: 1967 },
  { name: 'Marana Aerospace Solutions', icaoCode: 'KMZJ', city: 'Marana', country: 'United States', lat: 32.5107, lon: -111.3283, region: 'North America', specialty: 'desert storage & part-out', availableFrom: 1965 },
  { name: 'Southern California Logistics Airport', icaoCode: 'KVCV', city: 'Victorville', country: 'United States', lat: 34.5975, lon: -117.3830, region: 'North America', specialty: 'narrowbody specialist', availableFrom: 1992 },
  { name: 'Montréal Aircraft Recycling', icaoCode: 'CYMX', city: 'Montréal', country: 'Canada', lat: 45.6795, lon: -74.0387, region: 'North America', specialty: 'regional aircraft', availableFrom: 1985 },

  // Europe
  { name: 'RAF Maintenance Unit Salvage', icaoCode: 'EGDX', city: 'St Athan', country: 'United Kingdom', lat: 51.4048, lon: -3.4357, region: 'Europe', specialty: 'British aircraft', availableFrom: 1950 },
  { name: 'Lasham Aircraft Disposal', icaoCode: 'EGHL', city: 'Lasham', country: 'United Kingdom', lat: 51.1872, lon: -1.0335, region: 'Europe', specialty: 'propeller & early jets', availableFrom: 1955 },
  { name: 'Cotswold Airport Aviation', icaoCode: 'EGBP', city: 'Kemble', country: 'United Kingdom', lat: 51.6681, lon: -2.0569, region: 'Europe', specialty: 'European narrowbodies', availableFrom: 1983 },
  { name: 'Châteaudun Aircraft Salvage', icaoCode: 'LFOC', city: 'Châteaudun', country: 'France', lat: 48.0581, lon: 1.3767, region: 'Europe', specialty: 'French aircraft', availableFrom: 1960 },
  { name: 'Tarmac Aerosave', icaoCode: 'LFBT', city: 'Tarbes', country: 'France', lat: 43.1788, lon: 0.0006, region: 'Europe', specialty: 'Airbus specialist', availableFrom: 2007 },
  { name: 'AELS Aircraft Recycling', icaoCode: 'EHBK', city: 'Maastricht', country: 'Netherlands', lat: 50.9117, lon: 5.7706, region: 'Europe', specialty: 'sustainable recycling', availableFrom: 1998 },
  { name: 'Tarmac España', icaoCode: 'LEMI', city: 'Teruel', country: 'Spain', lat: 40.3442, lon: -1.1076, region: 'Europe', specialty: 'storage & part-out', availableFrom: 2013 },

  // Asia-Pacific
  { name: 'GAMECO Aircraft Recycling', icaoCode: 'ZGGG', city: 'Guangzhou', country: 'China', lat: 23.3924, lon: 113.2988, region: 'Asia', specialty: 'all types, high volume', availableFrom: 2005 },
  { name: 'Alice Springs Aircraft Salvage', icaoCode: 'YBAS', city: 'Alice Springs', country: 'Australia', lat: -23.8067, lon: 133.9019, region: 'Oceania', specialty: 'desert storage & teardown', availableFrom: 1975 },
  { name: 'Narita Aircraft Maintenance', icaoCode: 'RJAA', city: 'Narita', country: 'Japan', lat: 35.7647, lon: 140.3864, region: 'Asia', specialty: 'Japanese fleet recycling', availableFrom: 1990 },

  // Middle East & Africa
  { name: 'Abu Dhabi Aircraft Technologies', icaoCode: 'OMAA', city: 'Abu Dhabi', country: 'United Arab Emirates', lat: 24.4440, lon: 54.6511, region: 'Middle East', specialty: 'widebody & engines', availableFrom: 2003 },
  { name: 'OR Tambo Aerospace Salvage', icaoCode: 'FAOR', city: 'Johannesburg', country: 'South Africa', lat: -26.1392, lon: 28.2460, region: 'Africa', specialty: 'African fleet recycling', availableFrom: 1980 },
];
