require('dotenv').config();
const sequelize = require('../config/database');
const { Aircraft } = require('../models');

/**
 * COMPREHENSIVE AIRCRAFT DATABASE (150+ AIRCRAFT) - 1950 to Present
 *
 * Coverage:
 * - Western Jets & Turboprops
 * - Russian/Soviet Aircraft (Tupolev, Ilyushin, Antonov, Yakovlev, Sukhoi)
 * - Regional Jets & Turboprops (12-100 seats)
 * - Cargo Aircraft
 * - All major variants
 *
 * All aircraft set to isActive: true - availableFrom/availableUntil control world availability
 * Prices adjusted for inflation using 2024 USD values
 */

const COMPREHENSIVE_AIRCRAFT = [

  // ========================================
  // 1950s ERA - PROPELLER & EARLY JETS
  // ========================================

  // Classic Propeller Aircraft
  {
    manufacturer: 'Douglas', model: 'DC-3', variant: null, icaoCode: 'DC3', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 1500, cruiseSpeed: 180,
    passengerCapacity: 32, cargoCapacityKg: 2700, fuelCapacityLiters: 3180,
    purchasePrice: 8500000, usedPrice: 4000000, maintenanceCostPerHour: 800,
    maintenanceCostPerMonth: 64000, fuelBurnPerHour: 500,
    firstIntroduced: 1936, availableFrom: 1950, availableUntil: 1975,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Legendary propeller aircraft that revolutionized air travel'
  },

  {
    manufacturer: 'Lockheed', model: 'L-1049', variant: 'Super Constellation', icaoCode: 'CONI', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 2400, cruiseSpeed: 300,
    passengerCapacity: 95, cargoCapacityKg: 6800, fuelCapacityLiters: 22700,
    purchasePrice: 18000000, usedPrice: 9000000, maintenanceCostPerHour: 1200,
    maintenanceCostPerMonth: 96000, fuelBurnPerHour: 1800,
    firstIntroduced: 1951, availableFrom: 1951, availableUntil: 1968,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Iconic triple-tail luxury propeller airliner'
  },

  {
    manufacturer: 'Vickers', model: 'Viscount', variant: '800', icaoCode: 'VISC', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1200, cruiseSpeed: 312,
    passengerCapacity: 65, cargoCapacityKg: 4000, fuelCapacityLiters: 7100,
    purchasePrice: 12000000, usedPrice: 5000000, maintenanceCostPerHour: 900,
    maintenanceCostPerMonth: 72000, fuelBurnPerHour: 900,
    firstIntroduced: 1950, availableFrom: 1950, availableUntil: 1970,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'First turboprop airliner - smooth and quiet'
  },

  // First Generation Jets
  {
    manufacturer: 'de Havilland', model: 'Comet 4', variant: null, icaoCode: 'COMT', type: 'Narrowbody',
    rangeCategory: 'Long Haul', rangeNm: 3225, cruiseSpeed: 450,
    passengerCapacity: 81, cargoCapacityKg: 5000, fuelCapacityLiters: 28680,
    purchasePrice: 22000000, usedPrice: 10000000, maintenanceCostPerHour: 1400,
    maintenanceCostPerMonth: 112000, fuelBurnPerHour: 3200,
    firstIntroduced: 1958, availableFrom: 1958, availableUntil: 1981,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'First commercial jetliner - pioneered jet travel'
  },

  {
    manufacturer: 'Sud Aviation', model: 'Caravelle', variant: null, icaoCode: 'S210', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 1700, cruiseSpeed: 450,
    passengerCapacity: 80, cargoCapacityKg: 4500, fuelCapacityLiters: 14000,
    purchasePrice: 20000000, usedPrice: 9000000, maintenanceCostPerHour: 1300,
    maintenanceCostPerMonth: 104000, fuelBurnPerHour: 2800,
    firstIntroduced: 1955, availableFrom: 1955, availableUntil: 1972,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'French jet - rear-mounted engines, pioneering design'
  },

  // Soviet Era - 1950s
  {
    manufacturer: 'Tupolev', model: 'Tu-104', variant: null, icaoCode: 'T104', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 2000, cruiseSpeed: 500,
    passengerCapacity: 100, cargoCapacityKg: 5000, fuelCapacityLiters: 25000,
    purchasePrice: 18000000, usedPrice: 8000000, maintenanceCostPerHour: 1400,
    maintenanceCostPerMonth: 112000, fuelBurnPerHour: 3500,
    firstIntroduced: 1955, availableFrom: 1955, availableUntil: 1979,
    requiredPilots: 3, requiredCabinCrew: 3, isActive: true,
    description: 'Soviet first jet airliner - world\'s second commercial jet'
  },

  {
    manufacturer: 'Ilyushin', model: 'Il-14', variant: null, icaoCode: 'IL14', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 800, cruiseSpeed: 250,
    passengerCapacity: 32, cargoCapacityKg: 3500, fuelCapacityLiters: 4800,
    purchasePrice: 9000000, usedPrice: 4000000, maintenanceCostPerHour: 750,
    maintenanceCostPerMonth: 60000, fuelBurnPerHour: 700,
    firstIntroduced: 1954, availableFrom: 1954, availableUntil: 1970,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Soviet twin-engine prop - DC-3 successor in USSR'
  },

  {
    manufacturer: 'Antonov', model: 'An-24', variant: null, icaoCode: 'AN24', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1000, cruiseSpeed: 280,
    passengerCapacity: 52, cargoCapacityKg: 5500, fuelCapacityLiters: 5500,
    purchasePrice: 10000000, usedPrice: 4500000, maintenanceCostPerHour: 800,
    maintenanceCostPerMonth: 64000, fuelBurnPerHour: 750,
    firstIntroduced: 1959, availableFrom: 1959, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Rugged Soviet turboprop - extremely reliable, still flying'
  },

  {
    manufacturer: 'Antonov', model: 'An-2', variant: null, icaoCode: 'AN2', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 525, cruiseSpeed: 120,
    passengerCapacity: 12, cargoCapacityKg: 1500, fuelCapacityLiters: 1200,
    purchasePrice: 3500000, usedPrice: 1500000, maintenanceCostPerHour: 450,
    maintenanceCostPerMonth: 36000, fuelBurnPerHour: 200,
    firstIntroduced: 1947, availableFrom: 1950, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Legendary Soviet biplane - most produced aircraft ever'
  },

  {
    manufacturer: 'Beechcraft', model: '18', variant: 'Twin Beech', icaoCode: 'BE18', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1200, cruiseSpeed: 220,
    passengerCapacity: 11, cargoCapacityKg: 1200, fuelCapacityLiters: 950,
    purchasePrice: 4000000, usedPrice: 1800000, maintenanceCostPerHour: 500,
    maintenanceCostPerMonth: 40000, fuelBurnPerHour: 250,
    firstIntroduced: 1937, availableFrom: 1950, availableUntil: 1970,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Classic twin prop - versatile commuter aircraft'
  },

  {
    manufacturer: 'de Havilland', model: 'Dove', variant: null, icaoCode: 'DOVE', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 800, cruiseSpeed: 165,
    passengerCapacity: 11, cargoCapacityKg: 900, fuelCapacityLiters: 750,
    purchasePrice: 3500000, usedPrice: 1600000, maintenanceCostPerHour: 480,
    maintenanceCostPerMonth: 38400, fuelBurnPerHour: 220,
    firstIntroduced: 1945, availableFrom: 1950, availableUntil: 1967,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'British commuter aircraft - elegant design'
  },

  {
    manufacturer: 'de Havilland', model: 'Heron', variant: null, icaoCode: 'HERN', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 915, cruiseSpeed: 183,
    passengerCapacity: 17, cargoCapacityKg: 1400, fuelCapacityLiters: 1100,
    purchasePrice: 5000000, usedPrice: 2200000, maintenanceCostPerHour: 550,
    maintenanceCostPerMonth: 44000, fuelBurnPerHour: 280,
    firstIntroduced: 1950, availableFrom: 1950, availableUntil: 1968,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Four-engine commuter - stretched Dove'
  },

  {
    manufacturer: 'Grumman', model: 'G-21', variant: 'Goose', icaoCode: 'G21', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 640, cruiseSpeed: 201,
    passengerCapacity: 12, cargoCapacityKg: 1000, fuelCapacityLiters: 850,
    purchasePrice: 4500000, usedPrice: 2000000, maintenanceCostPerHour: 520,
    maintenanceCostPerMonth: 41600, fuelBurnPerHour: 260,
    firstIntroduced: 1937, availableFrom: 1950, availableUntil: 1965,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Amphibious aircraft - island hopper classic'
  },

  // ========================================
  // 1960s ERA - JET AGE EXPANSION
  // ========================================

  {
    manufacturer: 'Boeing', model: '707', variant: '320B', icaoCode: 'B703', type: 'Narrowbody',
    rangeCategory: 'Long Haul', rangeNm: 4300, cruiseSpeed: 525,
    passengerCapacity: 189, cargoCapacityKg: 15000, fuelCapacityLiters: 90770,
    purchasePrice: 45000000, usedPrice: 20000000, maintenanceCostPerHour: 2000,
    maintenanceCostPerMonth: 160000, fuelBurnPerHour: 5000,
    firstIntroduced: 1958, availableFrom: 1958, availableUntil: 1991,
    requiredPilots: 3, requiredCabinCrew: 5, isActive: true,
    description: 'Aircraft that started the jet age'
  },

  {
    manufacturer: 'Douglas', model: 'DC-8', variant: '63', icaoCode: 'DC86', type: 'Narrowbody',
    rangeCategory: 'Long Haul', rangeNm: 4500, cruiseSpeed: 520,
    passengerCapacity: 259, cargoCapacityKg: 18000, fuelCapacityLiters: 102200,
    purchasePrice: 48000000, usedPrice: 22000000, maintenanceCostPerHour: 2100,
    maintenanceCostPerMonth: 168000, fuelBurnPerHour: 5200,
    firstIntroduced: 1959, availableFrom: 1959, availableUntil: 1995,
    requiredPilots: 3, requiredCabinCrew: 6, isActive: true,
    description: 'Douglas rival to 707 - stretched Super 60 series'
  },

  {
    manufacturer: 'Boeing', model: '727', variant: '200', icaoCode: 'B722', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 1900, cruiseSpeed: 467,
    passengerCapacity: 189, cargoCapacityKg: 12000, fuelCapacityLiters: 31160,
    purchasePrice: 35000000, usedPrice: 15000000, maintenanceCostPerHour: 1700,
    maintenanceCostPerMonth: 136000, fuelBurnPerHour: 3800,
    firstIntroduced: 1963, availableFrom: 1963, availableUntil: 2001,
    requiredPilots: 3, requiredCabinCrew: 4, isActive: true,
    description: 'Tri-jet workhorse - short runway capability'
  },

  {
    manufacturer: 'Boeing', model: '737', variant: '200', icaoCode: 'B732', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2370, cruiseSpeed: 440,
    passengerCapacity: 130, cargoCapacityKg: 8000, fuelCapacityLiters: 19870,
    purchasePrice: 28000000, usedPrice: 12000000, maintenanceCostPerHour: 1400,
    maintenanceCostPerMonth: 112000, fuelBurnPerHour: 2800,
    firstIntroduced: 1968, availableFrom: 1968, availableUntil: 2000,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Original 737 - most successful aircraft family'
  },

  {
    manufacturer: 'McDonnell Douglas', model: 'DC-9', variant: '30', icaoCode: 'DC93', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 1450, cruiseSpeed: 450,
    passengerCapacity: 115, cargoCapacityKg: 7500, fuelCapacityLiters: 15900,
    purchasePrice: 25000000, usedPrice: 10000000, maintenanceCostPerHour: 1300,
    maintenanceCostPerMonth: 104000, fuelBurnPerHour: 2600,
    firstIntroduced: 1965, availableFrom: 1965, availableUntil: 1990,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Popular short-haul jet - competed with 737'
  },

  {
    manufacturer: 'BAC', model: 'One-Eleven', variant: '500', icaoCode: 'BA11', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 1480, cruiseSpeed: 461,
    passengerCapacity: 119, cargoCapacityKg: 7000, fuelCapacityLiters: 17800,
    purchasePrice: 24000000, usedPrice: 9000000, maintenanceCostPerHour: 1250,
    maintenanceCostPerMonth: 100000, fuelBurnPerHour: 2550,
    firstIntroduced: 1963, availableFrom: 1963, availableUntil: 1989,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'British short-haul jet - rear-mounted engines'
  },

  {
    manufacturer: 'Fokker', model: 'F28', variant: 'Fellowship', icaoCode: 'F28', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1100, cruiseSpeed: 435,
    passengerCapacity: 85, cargoCapacityKg: 5000, fuelCapacityLiters: 7800,
    purchasePrice: 18000000, usedPrice: 7500000, maintenanceCostPerHour: 1100,
    maintenanceCostPerMonth: 88000, fuelBurnPerHour: 1900,
    firstIntroduced: 1969, availableFrom: 1969, availableUntil: 1987,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Dutch regional jet - efficient short-haul operations'
  },

  // Soviet/Russian - 1960s
  {
    manufacturer: 'Tupolev', model: 'Tu-134', variant: null, icaoCode: 'T134', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 1900, cruiseSpeed: 490,
    passengerCapacity: 80, cargoCapacityKg: 5000, fuelCapacityLiters: 14000,
    purchasePrice: 22000000, usedPrice: 9000000, maintenanceCostPerHour: 1300,
    maintenanceCostPerMonth: 104000, fuelBurnPerHour: 2900,
    firstIntroduced: 1967, availableFrom: 1967, availableUntil: 2019,
    requiredPilots: 3, requiredCabinCrew: 3, isActive: true,
    description: 'Soviet short-haul jet - DC-9 competitor'
  },

  {
    manufacturer: 'Tupolev', model: 'Tu-154', variant: 'M', icaoCode: 'T154', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 3900, cruiseSpeed: 500,
    passengerCapacity: 180, cargoCapacityKg: 12000, fuelCapacityLiters: 36000,
    purchasePrice: 35000000, usedPrice: 15000000, maintenanceCostPerHour: 1900,
    maintenanceCostPerMonth: 152000, fuelBurnPerHour: 4200,
    firstIntroduced: 1968, availableFrom: 1968, availableUntil: 2013,
    requiredPilots: 3, requiredCabinCrew: 4, isActive: true,
    description: 'Soviet tri-jet workhorse - extremely popular in Eastern Bloc'
  },

  {
    manufacturer: 'Ilyushin', model: 'Il-62', variant: null, icaoCode: 'IL62', type: 'Narrowbody',
    rangeCategory: 'Long Haul', rangeNm: 6800, cruiseSpeed: 500,
    passengerCapacity: 186, cargoCapacityKg: 15000, fuelCapacityLiters: 84000,
    purchasePrice: 42000000, usedPrice: 18000000, maintenanceCostPerHour: 2200,
    maintenanceCostPerMonth: 176000, fuelBurnPerHour: 5800,
    firstIntroduced: 1967, availableFrom: 1967, availableUntil: 1995,
    requiredPilots: 3, requiredCabinCrew: 5, isActive: true,
    description: 'Soviet long-haul jet - rear-mounted engines, elegant design'
  },

  {
    manufacturer: 'Yakovlev', model: 'Yak-40', variant: null, icaoCode: 'YK40', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 900, cruiseSpeed: 342,
    passengerCapacity: 32, cargoCapacityKg: 2500, fuelCapacityLiters: 4200,
    purchasePrice: 12000000, usedPrice: 5000000, maintenanceCostPerHour: 900,
    maintenanceCostPerMonth: 72000, fuelBurnPerHour: 1200,
    firstIntroduced: 1966, availableFrom: 1966, availableUntil: 1981,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Soviet regional tri-jet - first regional jet with no reverse thrust needed'
  },

  // Small Props & Turboprops - 1960s
  {
    manufacturer: 'Britten-Norman', model: 'BN-2', variant: 'Islander', icaoCode: 'BN2P', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 870, cruiseSpeed: 170,
    passengerCapacity: 9, cargoCapacityKg: 900, fuelCapacityLiters: 540,
    purchasePrice: 2800000, usedPrice: 1200000, maintenanceCostPerHour: 400,
    maintenanceCostPerMonth: 32000, fuelBurnPerHour: 150,
    firstIntroduced: 1965, availableFrom: 1965, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Island hopper - simplest twin-engine aircraft'
  },

  {
    manufacturer: 'Handley Page', model: 'HPR.7', variant: 'Herald', icaoCode: 'HPR7', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1050, cruiseSpeed: 275,
    passengerCapacity: 50, cargoCapacityKg: 5000, fuelCapacityLiters: 5400,
    purchasePrice: 11000000, usedPrice: 4800000, maintenanceCostPerHour: 750,
    maintenanceCostPerMonth: 60000, fuelBurnPerHour: 600,
    firstIntroduced: 1959, availableFrom: 1959, availableUntil: 1970,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'British turboprop - competed with Fokker F27'
  },

  {
    manufacturer: 'NAMC', model: 'YS-11', variant: null, icaoCode: 'YS11', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 680, cruiseSpeed: 290,
    passengerCapacity: 60, cargoCapacityKg: 6000, fuelCapacityLiters: 7500,
    purchasePrice: 12000000, usedPrice: 5200000, maintenanceCostPerHour: 800,
    maintenanceCostPerMonth: 64000, fuelBurnPerHour: 750,
    firstIntroduced: 1962, availableFrom: 1962, availableUntil: 1974,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Japanese turboprop - only Japanese transport aircraft'
  },

  {
    manufacturer: 'Fairchild', model: 'F-27', variant: null, icaoCode: 'F27', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1100, cruiseSpeed: 280,
    passengerCapacity: 44, cargoCapacityKg: 5000, fuelCapacityLiters: 5730,
    purchasePrice: 13000000, usedPrice: 5600000, maintenanceCostPerHour: 780,
    maintenanceCostPerMonth: 62400, fuelBurnPerHour: 620,
    firstIntroduced: 1958, availableFrom: 1958, availableUntil: 1986,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'US-built Fokker F27 - license production'
  },

  {
    manufacturer: 'Beechcraft', model: '99', variant: 'Airliner', icaoCode: 'BE99', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 730, cruiseSpeed: 230,
    passengerCapacity: 15, cargoCapacityKg: 1400, fuelCapacityLiters: 1200,
    purchasePrice: 4500000, usedPrice: 2000000, maintenanceCostPerHour: 520,
    maintenanceCostPerMonth: 41600, fuelBurnPerHour: 280,
    firstIntroduced: 1966, availableFrom: 1966, availableUntil: 1986,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Commuter turboprop - very popular in USA'
  },

  {
    manufacturer: 'Let', model: 'L-410', variant: 'Turbolet', icaoCode: 'L410', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 870, cruiseSpeed: 229,
    passengerCapacity: 19, cargoCapacityKg: 1800, fuelCapacityLiters: 1260,
    purchasePrice: 5500000, usedPrice: 2400000, maintenanceCostPerHour: 580,
    maintenanceCostPerMonth: 46400, fuelBurnPerHour: 300,
    firstIntroduced: 1969, availableFrom: 1969, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Czech commuter - rugged and reliable'
  },

  {
    manufacturer: 'Nord', model: '262', variant: null, icaoCode: 'N262', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 680, cruiseSpeed: 240,
    passengerCapacity: 29, cargoCapacityKg: 2600, fuelCapacityLiters: 2200,
    purchasePrice: 7500000, usedPrice: 3200000, maintenanceCostPerHour: 600,
    maintenanceCostPerMonth: 48000, fuelBurnPerHour: 380,
    firstIntroduced: 1964, availableFrom: 1964, availableUntil: 1976,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'French commuter - pressurized twin'
  },

  {
    manufacturer: 'GAF', model: 'N22', variant: 'Nomad', icaoCode: 'NOMA', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 840, cruiseSpeed: 193,
    passengerCapacity: 16, cargoCapacityKg: 1850, fuelCapacityLiters: 1080,
    purchasePrice: 4200000, usedPrice: 1900000, maintenanceCostPerHour: 520,
    maintenanceCostPerMonth: 41600, fuelBurnPerHour: 220,
    firstIntroduced: 1971, availableFrom: 1971, availableUntil: 1984,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Australian utility - STOL capability'
  },

  {
    manufacturer: 'Partenavia', model: 'P.68', variant: 'Observer', icaoCode: 'P68', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 940, cruiseSpeed: 174,
    passengerCapacity: 6, cargoCapacityKg: 550, fuelCapacityLiters: 380,
    purchasePrice: 1200000, usedPrice: 550000, maintenanceCostPerHour: 250,
    maintenanceCostPerMonth: 20000, fuelBurnPerHour: 90,
    firstIntroduced: 1970, availableFrom: 1970, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Italian light twin - observation/commuter'
  },

  {
    manufacturer: 'Reims-Cessna', model: 'F406', variant: 'Caravan II', icaoCode: 'F406', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 815, cruiseSpeed: 230,
    passengerCapacity: 14, cargoCapacityKg: 1600, fuelCapacityLiters: 1350,
    purchasePrice: 4500000, usedPrice: 2000000, maintenanceCostPerHour: 540,
    maintenanceCostPerMonth: 43200, fuelBurnPerHour: 230,
    firstIntroduced: 1985, availableFrom: 1985, availableUntil: 1994,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'French-built twin - light commuter'
  },

  // ========================================
  // 1970s ERA - WIDEBODY REVOLUTION
  // ========================================

  {
    manufacturer: 'Boeing', model: '747', variant: '100', icaoCode: 'B741', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 5300, cruiseSpeed: 490,
    passengerCapacity: 452, cargoCapacityKg: 40000, fuelCapacityLiters: 183380,
    purchasePrice: 180000000, usedPrice: 80000000, maintenanceCostPerHour: 3500,
    maintenanceCostPerMonth: 315000, fuelBurnPerHour: 11500,
    firstIntroduced: 1970, availableFrom: 1970, availableUntil: 1993,
    requiredPilots: 3, requiredCabinCrew: 8, isActive: true,
    description: 'Queen of the Skies - revolutionary jumbo jet'
  },

  {
    manufacturer: 'McDonnell Douglas', model: 'DC-10', variant: '30', icaoCode: 'DC10', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 5200, cruiseSpeed: 490,
    passengerCapacity: 380, cargoCapacityKg: 35000, fuelCapacityLiters: 138710,
    purchasePrice: 150000000, usedPrice: 65000000, maintenanceCostPerHour: 3200,
    maintenanceCostPerMonth: 288000, fuelBurnPerHour: 9800,
    firstIntroduced: 1971, availableFrom: 1971, availableUntil: 2000,
    requiredPilots: 3, requiredCabinCrew: 7, isActive: true,
    description: 'Tri-jet widebody - competed with 747'
  },

  {
    manufacturer: 'Lockheed', model: 'L-1011', variant: 'TriStar', icaoCode: 'L101', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 4850, cruiseSpeed: 495,
    passengerCapacity: 400, cargoCapacityKg: 36000, fuelCapacityLiters: 155770,
    purchasePrice: 160000000, usedPrice: 70000000, maintenanceCostPerHour: 3300,
    maintenanceCostPerMonth: 297000, fuelBurnPerHour: 10200,
    firstIntroduced: 1972, availableFrom: 1972, availableUntil: 1984,
    requiredPilots: 3, requiredCabinCrew: 7, isActive: true,
    description: 'Advanced tri-jet with sophisticated systems'
  },

  {
    manufacturer: 'Airbus', model: 'A300', variant: 'B4', icaoCode: 'A30B', type: 'Widebody',
    rangeCategory: 'Medium Haul', rangeNm: 3900, cruiseSpeed: 470,
    passengerCapacity: 345, cargoCapacityKg: 28000, fuelCapacityLiters: 62900,
    purchasePrice: 85000000, usedPrice: 35000000, maintenanceCostPerHour: 2400,
    maintenanceCostPerMonth: 192000, fuelBurnPerHour: 5800,
    firstIntroduced: 1974, availableFrom: 1974, availableUntil: 2007,
    requiredPilots: 3, requiredCabinCrew: 5, isActive: true,
    description: 'First Airbus - twin-engine widebody pioneer'
  },

  {
    manufacturer: 'Aerospatiale-BAC', model: 'Concorde', variant: null, icaoCode: 'CONC', type: 'Narrowbody',
    rangeCategory: 'Long Haul', rangeNm: 3900, cruiseSpeed: 1350,
    passengerCapacity: 100, cargoCapacityKg: 2500, fuelCapacityLiters: 119500,
    purchasePrice: 280000000, usedPrice: 150000000, maintenanceCostPerHour: 8000,
    maintenanceCostPerMonth: 640000, fuelBurnPerHour: 25600,
    firstIntroduced: 1976, availableFrom: 1976, availableUntil: 2003,
    requiredPilots: 3, requiredCabinCrew: 4, isActive: true,
    description: 'Supersonic legend - flew at Mach 2.04'
  },

  {
    manufacturer: 'Boeing', model: '737', variant: '300', icaoCode: 'B733', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2800, cruiseSpeed: 450,
    passengerCapacity: 149, cargoCapacityKg: 10000, fuelCapacityLiters: 23800,
    purchasePrice: 38000000, usedPrice: 16000000, maintenanceCostPerHour: 1500,
    maintenanceCostPerMonth: 120000, fuelBurnPerHour: 2900,
    firstIntroduced: 1984, availableFrom: 1984, availableUntil: 2008,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: '737 Classic - stretched and improved'
  },

  // Soviet - 1970s
  {
    manufacturer: 'Ilyushin', model: 'Il-86', variant: null, icaoCode: 'IL86', type: 'Widebody',
    rangeCategory: 'Medium Haul', rangeNm: 2400, cruiseSpeed: 475,
    passengerCapacity: 350, cargoCapacityKg: 30000, fuelCapacityLiters: 103000,
    purchasePrice: 95000000, usedPrice: 40000000, maintenanceCostPerHour: 2800,
    maintenanceCostPerMonth: 224000, fuelBurnPerHour: 9500,
    firstIntroduced: 1976, availableFrom: 1976, availableUntil: 2011,
    requiredPilots: 3, requiredCabinCrew: 7, isActive: true,
    description: 'Soviet widebody - unique lower deck boarding'
  },

  {
    manufacturer: 'Yakovlev', model: 'Yak-42', variant: null, icaoCode: 'YK42', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 1300, cruiseSpeed: 460,
    passengerCapacity: 120, cargoCapacityKg: 8000, fuelCapacityLiters: 15000,
    purchasePrice: 26000000, usedPrice: 11000000, maintenanceCostPerHour: 1400,
    maintenanceCostPerMonth: 112000, fuelBurnPerHour: 2700,
    firstIntroduced: 1975, availableFrom: 1975, availableUntil: 2003,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Soviet tri-jet - Tu-134 replacement'
  },

  // Turboprops - 1970s
  {
    manufacturer: 'Fokker', model: 'F27', variant: 'Friendship', icaoCode: 'F27', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1100, cruiseSpeed: 280,
    passengerCapacity: 52, cargoCapacityKg: 6000, fuelCapacityLiters: 5730,
    purchasePrice: 14000000, usedPrice: 6000000, maintenanceCostPerHour: 850,
    maintenanceCostPerMonth: 68000, fuelBurnPerHour: 650,
    firstIntroduced: 1958, availableFrom: 1958, availableUntil: 1987,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Popular turboprop - extremely successful regional aircraft'
  },

  {
    manufacturer: 'de Havilland Canada', model: 'DHC-6', variant: 'Twin Otter', icaoCode: 'DHC6', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 770, cruiseSpeed: 182,
    passengerCapacity: 19, cargoCapacityKg: 1800, fuelCapacityLiters: 1135,
    purchasePrice: 6500000, usedPrice: 3000000, maintenanceCostPerHour: 600,
    maintenanceCostPerMonth: 48000, fuelBurnPerHour: 350,
    firstIntroduced: 1965, availableFrom: 1965, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'STOL utility turboprop - legendary reliability'
  },

  {
    manufacturer: 'de Havilland Canada', model: 'DHC-7', variant: 'Dash 7', icaoCode: 'DHC7', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 800, cruiseSpeed: 215,
    passengerCapacity: 54, cargoCapacityKg: 5000, fuelCapacityLiters: 5700,
    purchasePrice: 16000000, usedPrice: 7000000, maintenanceCostPerHour: 950,
    maintenanceCostPerMonth: 76000, fuelBurnPerHour: 900,
    firstIntroduced: 1975, availableFrom: 1975, availableUntil: 1988,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Quiet STOL turboprop - city airport specialist'
  },

  // More Small Props - 1970s
  {
    manufacturer: 'Britten-Norman', model: 'BN-2A', variant: 'Trislander', icaoCode: 'TRIS', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1000, cruiseSpeed: 180,
    passengerCapacity: 18, cargoCapacityKg: 1800, fuelCapacityLiters: 900,
    purchasePrice: 4200000, usedPrice: 1800000, maintenanceCostPerHour: 480,
    maintenanceCostPerMonth: 38400, fuelBurnPerHour: 220,
    firstIntroduced: 1970, availableFrom: 1970, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Three-engine Islander - unique configuration'
  },

  {
    manufacturer: 'Shorts', model: 'SC.7', variant: 'Skyvan', icaoCode: 'SC7', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 600, cruiseSpeed: 203,
    passengerCapacity: 19, cargoCapacityKg: 2100, fuelCapacityLiters: 1360,
    purchasePrice: 5000000, usedPrice: 2200000, maintenanceCostPerHour: 540,
    maintenanceCostPerMonth: 43200, fuelBurnPerHour: 280,
    firstIntroduced: 1963, availableFrom: 1963, availableUntil: 1986,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Box-shaped utility aircraft - rugged design'
  },

  {
    manufacturer: 'CASA', model: 'C-212', variant: 'Aviocar', icaoCode: 'C212', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 930, cruiseSpeed: 215,
    passengerCapacity: 26, cargoCapacityKg: 2700, fuelCapacityLiters: 2100,
    purchasePrice: 7000000, usedPrice: 3100000, maintenanceCostPerHour: 620,
    maintenanceCostPerMonth: 49600, fuelBurnPerHour: 350,
    firstIntroduced: 1971, availableFrom: 1971, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Spanish utility turboprop - robust construction'
  },

  {
    manufacturer: 'Embraer', model: 'EMB 110', variant: 'Bandeirante', icaoCode: 'E110', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1100, cruiseSpeed: 240,
    passengerCapacity: 21, cargoCapacityKg: 1800, fuelCapacityLiters: 1420,
    purchasePrice: 5500000, usedPrice: 2400000, maintenanceCostPerHour: 560,
    maintenanceCostPerMonth: 44800, fuelBurnPerHour: 290,
    firstIntroduced: 1972, availableFrom: 1972, availableUntil: 1990,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Brazilian commuter - very successful'
  },

  {
    manufacturer: 'Piper', model: 'PA-31', variant: 'Navajo Chieftain', icaoCode: 'PA31', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 830, cruiseSpeed: 210,
    passengerCapacity: 9, cargoCapacityKg: 850, fuelCapacityLiters: 640,
    purchasePrice: 2500000, usedPrice: 1100000, maintenanceCostPerHour: 380,
    maintenanceCostPerMonth: 30400, fuelBurnPerHour: 180,
    firstIntroduced: 1972, availableFrom: 1972, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Twin piston commuter - affordable operations'
  },

  {
    manufacturer: 'Pilatus', model: 'PC-6', variant: 'Porter', icaoCode: 'PC6T', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 460, cruiseSpeed: 150,
    passengerCapacity: 10, cargoCapacityKg: 1200, fuelCapacityLiters: 450,
    purchasePrice: 3000000, usedPrice: 1300000, maintenanceCostPerHour: 420,
    maintenanceCostPerMonth: 33600, fuelBurnPerHour: 140,
    firstIntroduced: 1959, availableFrom: 1959, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Swiss STOL utility aircraft - mountain specialist'
  },

  {
    manufacturer: 'Cessna', model: '208', variant: 'Caravan', icaoCode: 'C208', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 960, cruiseSpeed: 185,
    passengerCapacity: 14, cargoCapacityKg: 1600, fuelCapacityLiters: 1340,
    purchasePrice: 3500000, usedPrice: 1600000, maintenanceCostPerHour: 450,
    maintenanceCostPerMonth: 36000, fuelBurnPerHour: 180,
    firstIntroduced: 1982, availableFrom: 1982, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Utility turboprop - workhorse of bush aviation'
  },

  {
    manufacturer: 'Harbin', model: 'Y-12', variant: null, icaoCode: 'Y12', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 560, cruiseSpeed: 127,
    passengerCapacity: 17, cargoCapacityKg: 1700, fuelCapacityLiters: 980,
    purchasePrice: 3500000, usedPrice: 1600000, maintenanceCostPerHour: 440,
    maintenanceCostPerMonth: 35200, fuelBurnPerHour: 180,
    firstIntroduced: 1985, availableFrom: 1985, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Chinese utility twin - simple and rugged'
  },

  {
    manufacturer: 'de Havilland Canada', model: 'DHC-2', variant: 'Turbo Beaver', icaoCode: 'DH2T', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 455, cruiseSpeed: 135,
    passengerCapacity: 8, cargoCapacityKg: 900, fuelCapacityLiters: 380,
    purchasePrice: 1800000, usedPrice: 900000, maintenanceCostPerHour: 320,
    maintenanceCostPerMonth: 25600, fuelBurnPerHour: 110,
    firstIntroduced: 1963, availableFrom: 1970, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Turboprop conversion of classic Beaver - STOL legend'
  },

  {
    manufacturer: 'de Havilland Canada', model: 'DHC-3', variant: 'Otter', icaoCode: 'DHC3', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 600, cruiseSpeed: 138,
    passengerCapacity: 10, cargoCapacityKg: 1100, fuelCapacityLiters: 550,
    purchasePrice: 2200000, usedPrice: 1000000, maintenanceCostPerHour: 350,
    maintenanceCostPerMonth: 28000, fuelBurnPerHour: 130,
    firstIntroduced: 1951, availableFrom: 1970, availableUntil: 1967,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Larger Beaver - bush flying workhorse'
  },

  // ========================================
  // 1980s ERA - MODERN EFFICIENCY
  // ========================================

  {
    manufacturer: 'Boeing', model: '757', variant: '200', icaoCode: 'B752', type: 'Narrowbody',
    rangeCategory: 'Long Haul', rangeNm: 3900, cruiseSpeed: 470,
    passengerCapacity: 228, cargoCapacityKg: 15000, fuelCapacityLiters: 42680,
    purchasePrice: 80000000, usedPrice: 35000000, maintenanceCostPerHour: 1900,
    maintenanceCostPerMonth: 152000, fuelBurnPerHour: 3200,
    firstIntroduced: 1983, availableFrom: 1983, availableUntil: 2005,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Powerful narrowbody - long range capability'
  },

  {
    manufacturer: 'Boeing', model: '767', variant: '300ER', icaoCode: 'B763', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 6385, cruiseSpeed: 470,
    passengerCapacity: 350, cargoCapacityKg: 32000, fuelCapacityLiters: 91380,
    purchasePrice: 140000000, usedPrice: 60000000, maintenanceCostPerHour: 2600,
    maintenanceCostPerMonth: 234000, fuelBurnPerHour: 5500,
    firstIntroduced: 1982, availableFrom: 1982, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 5, isActive: true,
    description: 'Twin widebody - pioneered ETOPS'
  },

  {
    manufacturer: 'Airbus', model: 'A310', variant: '300', icaoCode: 'A310', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 5150, cruiseSpeed: 470,
    passengerCapacity: 280, cargoCapacityKg: 25000, fuelCapacityLiters: 68250,
    purchasePrice: 95000000, usedPrice: 40000000, maintenanceCostPerHour: 2300,
    maintenanceCostPerMonth: 184000, fuelBurnPerHour: 5000,
    firstIntroduced: 1983, availableFrom: 1983, availableUntil: 2007,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Shortened A300 - advanced glass cockpit'
  },

  {
    manufacturer: 'Airbus', model: 'A320', variant: '200', icaoCode: 'A320', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3300, cruiseSpeed: 470,
    passengerCapacity: 186, cargoCapacityKg: 18000, fuelCapacityLiters: 24210,
    purchasePrice: 95000000, usedPrice: 40000000, maintenanceCostPerHour: 1600,
    maintenanceCostPerMonth: 128000, fuelBurnPerHour: 2500,
    firstIntroduced: 1988, availableFrom: 1988, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Revolutionary fly-by-wire narrowbody'
  },

// MD-80/83 replaced by individual MD variants below

  {
    manufacturer: 'Boeing', model: '747', variant: '400', icaoCode: 'B744', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 7260, cruiseSpeed: 493,
    passengerCapacity: 524, cargoCapacityKg: 45000, fuelCapacityLiters: 216840,
    purchasePrice: 260000000, usedPrice: 120000000, maintenanceCostPerHour: 4000,
    maintenanceCostPerMonth: 360000, fuelBurnPerHour: 12000,
    firstIntroduced: 1989, availableFrom: 1989, availableUntil: 2018,
    requiredPilots: 2, requiredCabinCrew: 9, isActive: true,
    description: 'Improved 747 - glass cockpit, winglets'
  },

  {
    manufacturer: 'BAe', model: '146', variant: '300', icaoCode: 'B463', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1480, cruiseSpeed: 436,
    passengerCapacity: 112, cargoCapacityKg: 8000, fuelCapacityLiters: 11070,
    purchasePrice: 28000000, usedPrice: 12000000, maintenanceCostPerHour: 1350,
    maintenanceCostPerMonth: 108000, fuelBurnPerHour: 2200,
    firstIntroduced: 1988, availableFrom: 1988, availableUntil: 2002,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'British quad-jet - very quiet, city airport specialist'
  },

  {
    manufacturer: 'Fokker', model: '100', variant: null, icaoCode: 'F100', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1400, cruiseSpeed: 442,
    passengerCapacity: 109, cargoCapacityKg: 7500, fuelCapacityLiters: 13365,
    purchasePrice: 26000000, usedPrice: 11000000, maintenanceCostPerHour: 1300,
    maintenanceCostPerMonth: 104000, fuelBurnPerHour: 2100,
    firstIntroduced: 1988, availableFrom: 1988, availableUntil: 1997,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Stretched F28 - last Fokker jet'
  },

  {
    manufacturer: 'Fokker', model: '70', variant: null, icaoCode: 'F70', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1500, cruiseSpeed: 442,
    passengerCapacity: 80, cargoCapacityKg: 6000, fuelCapacityLiters: 10260,
    purchasePrice: 22000000, usedPrice: 9500000, maintenanceCostPerHour: 1200,
    maintenanceCostPerMonth: 96000, fuelBurnPerHour: 1900,
    firstIntroduced: 1994, availableFrom: 1994, availableUntil: 1997,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Shortened F100 - efficient regional jet'
  },

  // Turboprops - 1980s
  {
    manufacturer: 'ATR', model: '42', variant: '500', icaoCode: 'AT45', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 800, cruiseSpeed: 300,
    passengerCapacity: 50, cargoCapacityKg: 5000, fuelCapacityLiters: 4500,
    purchasePrice: 18000000, usedPrice: 8000000, maintenanceCostPerHour: 750,
    maintenanceCostPerMonth: 60000, fuelBurnPerHour: 550,
    firstIntroduced: 1984, availableFrom: 1984, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'French-Italian turboprop - fuel efficient'
  },

  {
    manufacturer: 'ATR', model: '42', variant: '320', icaoCode: 'AT43', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 750, cruiseSpeed: 295,
    passengerCapacity: 46, cargoCapacityKg: 4800, fuelCapacityLiters: 4500,
    purchasePrice: 15000000, usedPrice: 5500000, maintenanceCostPerHour: 720,
    maintenanceCostPerMonth: 57600, fuelBurnPerHour: 530,
    firstIntroduced: 1988, availableFrom: 1988, availableUntil: 2005,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Uprated ATR 42 - improved hot & high performance'
  },

  {
    manufacturer: 'ATR', model: '72', variant: '500', icaoCode: 'AT75', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 890, cruiseSpeed: 315,
    passengerCapacity: 74, cargoCapacityKg: 7200, fuelCapacityLiters: 5000,
    purchasePrice: 24000000, usedPrice: 10000000, maintenanceCostPerHour: 830,
    maintenanceCostPerMonth: 66400, fuelBurnPerHour: 640,
    firstIntroduced: 1997, availableFrom: 1997, availableUntil: 2011,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'ATR 72-212A - improved engines and six-blade props'
  },

  {
    manufacturer: 'de Havilland Canada', model: 'DHC-8', variant: 'Dash 8-100', icaoCode: 'DH8A', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1000, cruiseSpeed: 310,
    passengerCapacity: 39, cargoCapacityKg: 3500, fuelCapacityLiters: 3400,
    purchasePrice: 15000000, usedPrice: 6500000, maintenanceCostPerHour: 700,
    maintenanceCostPerMonth: 56000, fuelBurnPerHour: 500,
    firstIntroduced: 1984, availableFrom: 1984, availableUntil: 2005,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Quiet turboprop - Active Noise and Vibration Suppression'
  },

  {
    manufacturer: 'de Havilland Canada', model: 'DHC-8', variant: 'Dash 8-300', icaoCode: 'DH8C', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 950, cruiseSpeed: 328,
    passengerCapacity: 56, cargoCapacityKg: 5000, fuelCapacityLiters: 4500,
    purchasePrice: 19000000, usedPrice: 8500000, maintenanceCostPerHour: 800,
    maintenanceCostPerMonth: 64000, fuelBurnPerHour: 600,
    firstIntroduced: 1989, availableFrom: 1989, availableUntil: 2009,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Stretched Dash 8 - quiet and efficient'
  },

  {
    manufacturer: 'Saab', model: '340', variant: 'B', icaoCode: 'SF34', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 930, cruiseSpeed: 285,
    passengerCapacity: 36, cargoCapacityKg: 3500, fuelCapacityLiters: 3200,
    purchasePrice: 13000000, usedPrice: 5500000, maintenanceCostPerHour: 650,
    maintenanceCostPerMonth: 52000, fuelBurnPerHour: 450,
    firstIntroduced: 1983, availableFrom: 1983, availableUntil: 1999,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Swedish regional turboprop - reliable and efficient'
  },

  {
    manufacturer: 'Saab', model: '2000', variant: null, icaoCode: 'SB20', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1300, cruiseSpeed: 370,
    passengerCapacity: 58, cargoCapacityKg: 5000, fuelCapacityLiters: 5600,
    purchasePrice: 21000000, usedPrice: 9000000, maintenanceCostPerHour: 900,
    maintenanceCostPerMonth: 72000, fuelBurnPerHour: 700,
    firstIntroduced: 1992, availableFrom: 1992, availableUntil: 1999,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Fast turboprop - fastest commercial turboprop'
  },

  {
    manufacturer: 'British Aerospace', model: 'ATP', variant: 'Advanced Turboprop', icaoCode: 'ATP', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 930, cruiseSpeed: 270,
    passengerCapacity: 72, cargoCapacityKg: 6500, fuelCapacityLiters: 6000,
    purchasePrice: 20000000, usedPrice: 8500000, maintenanceCostPerHour: 850,
    maintenanceCostPerMonth: 68000, fuelBurnPerHour: 750,
    firstIntroduced: 1988, availableFrom: 1988, availableUntil: 1996,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Advanced turboprop - quiet and spacious cabin'
  },

  {
    manufacturer: 'Fokker', model: '50', variant: null, icaoCode: 'F50', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1180, cruiseSpeed: 282,
    passengerCapacity: 58, cargoCapacityKg: 5500, fuelCapacityLiters: 5170,
    purchasePrice: 17000000, usedPrice: 7500000, maintenanceCostPerHour: 800,
    maintenanceCostPerMonth: 64000, fuelBurnPerHour: 650,
    firstIntroduced: 1987, availableFrom: 1987, availableUntil: 1997,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Modern F27 - glass cockpit upgrade'
  },

  // Small Props - 1980s
  {
    manufacturer: 'Dornier', model: '228', variant: null, icaoCode: 'D228', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 730, cruiseSpeed: 225,
    passengerCapacity: 19, cargoCapacityKg: 2000, fuelCapacityLiters: 1100,
    purchasePrice: 5800000, usedPrice: 2500000, maintenanceCostPerHour: 590,
    maintenanceCostPerMonth: 47200, fuelBurnPerHour: 280,
    firstIntroduced: 1981, availableFrom: 1981, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'German commuter - STOL capability, still in production'
  },

  {
    manufacturer: 'Shorts', model: '360', variant: null, icaoCode: 'SH36', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 645, cruiseSpeed: 243,
    passengerCapacity: 36, cargoCapacityKg: 3600, fuelCapacityLiters: 2350,
    purchasePrice: 9500000, usedPrice: 4000000, maintenanceCostPerHour: 620,
    maintenanceCostPerMonth: 49600, fuelBurnPerHour: 420,
    firstIntroduced: 1981, availableFrom: 1981, availableUntil: 1991,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Stretched Shorts 330 - boxy but reliable'
  },

  {
    manufacturer: 'Beechcraft', model: '1900', variant: 'Airliner', icaoCode: 'B190', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1200, cruiseSpeed: 280,
    passengerCapacity: 19, cargoCapacityKg: 2200, fuelCapacityLiters: 2120,
    purchasePrice: 6200000, usedPrice: 2700000, maintenanceCostPerHour: 600,
    maintenanceCostPerMonth: 48000, fuelBurnPerHour: 340,
    firstIntroduced: 1982, availableFrom: 1982, availableUntil: 2002,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Popular commuter - pressurized, comfortable'
  },

  {
    manufacturer: 'British Aerospace', model: 'Jetstream', variant: '31', icaoCode: 'JS31', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 750, cruiseSpeed: 270,
    passengerCapacity: 19, cargoCapacityKg: 1900, fuelCapacityLiters: 1800,
    purchasePrice: 5700000, usedPrice: 2400000, maintenanceCostPerHour: 580,
    maintenanceCostPerMonth: 46400, fuelBurnPerHour: 310,
    firstIntroduced: 1982, availableFrom: 1982, availableUntil: 1993,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'British commuter - pressurized turboprop'
  },

  {
    manufacturer: 'British Aerospace', model: 'Jetstream', variant: '32', icaoCode: 'JS32', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 750, cruiseSpeed: 270,
    passengerCapacity: 19, cargoCapacityKg: 1900, fuelCapacityLiters: 1800,
    purchasePrice: 6000000, usedPrice: 2600000, maintenanceCostPerHour: 590,
    maintenanceCostPerMonth: 47200, fuelBurnPerHour: 310,
    firstIntroduced: 1988, availableFrom: 1988, availableUntil: 1993,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Improved Jetstream - better avionics'
  },

  {
    manufacturer: 'Embraer', model: 'EMB 120', variant: 'Brasilia', icaoCode: 'E120', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1000, cruiseSpeed: 290,
    passengerCapacity: 30, cargoCapacityKg: 3200, fuelCapacityLiters: 3050,
    purchasePrice: 8500000, usedPrice: 3700000, maintenanceCostPerHour: 610,
    maintenanceCostPerMonth: 48800, fuelBurnPerHour: 430,
    firstIntroduced: 1983, availableFrom: 1983, availableUntil: 2001,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Brazilian turboprop - very successful commuter'
  },

  {
    manufacturer: 'Fairchild', model: 'Metro', variant: 'III', icaoCode: 'SW4', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 600, cruiseSpeed: 280,
    passengerCapacity: 19, cargoCapacityKg: 2000, fuelCapacityLiters: 1750,
    purchasePrice: 5300000, usedPrice: 2300000, maintenanceCostPerHour: 570,
    maintenanceCostPerMonth: 45600, fuelBurnPerHour: 320,
    firstIntroduced: 1981, availableFrom: 1981, availableUntil: 1998,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Fairchild commuter - fast and efficient'
  },

  {
    manufacturer: 'Swearingen', model: 'SA-227', variant: 'Metro', icaoCode: 'SW4', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 575, cruiseSpeed: 285,
    passengerCapacity: 19, cargoCapacityKg: 1950, fuelCapacityLiters: 1700,
    purchasePrice: 5100000, usedPrice: 2200000, maintenanceCostPerHour: 560,
    maintenanceCostPerMonth: 44800, fuelBurnPerHour: 310,
    firstIntroduced: 1980, availableFrom: 1980, availableUntil: 1991,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Original Metro - corporate shuttle'
  },

  {
    manufacturer: 'Piper', model: 'PA-42', variant: 'Cheyenne III', icaoCode: 'PAY3', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1350, cruiseSpeed: 290,
    passengerCapacity: 11, cargoCapacityKg: 1300, fuelCapacityLiters: 1750,
    purchasePrice: 4500000, usedPrice: 2000000, maintenanceCostPerHour: 540,
    maintenanceCostPerMonth: 43200, fuelBurnPerHour: 290,
    firstIntroduced: 1980, availableFrom: 1980, availableUntil: 1993,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Corporate turboprop - used as commuter'
  },

  {
    manufacturer: 'Cessna', model: '441', variant: 'Conquest II', icaoCode: 'C441', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1550, cruiseSpeed: 285,
    passengerCapacity: 11, cargoCapacityKg: 1400, fuelCapacityLiters: 1900,
    purchasePrice: 4800000, usedPrice: 2100000, maintenanceCostPerHour: 550,
    maintenanceCostPerMonth: 44000, fuelBurnPerHour: 310,
    firstIntroduced: 1977, availableFrom: 1980, availableUntil: 1986,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Cessna turboprop - commuter use'
  },

  // Soviet - 1980s
  {
    manufacturer: 'Ilyushin', model: 'Il-96', variant: '300', icaoCode: 'IL96', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 6000, cruiseSpeed: 480,
    passengerCapacity: 300, cargoCapacityKg: 35000, fuelCapacityLiters: 107000,
    purchasePrice: 140000000, usedPrice: 60000000, maintenanceCostPerHour: 2900,
    maintenanceCostPerMonth: 232000, fuelBurnPerHour: 7800,
    firstIntroduced: 1988, availableFrom: 1988, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 6, isActive: true,
    description: 'Russian widebody - fly-by-wire, glass cockpit'
  },

  // ========================================
  // 1990s ERA - ETOPS & REGIONAL JETS
  // ========================================

  {
    manufacturer: 'Boeing', model: '777', variant: '200ER', icaoCode: 'B772', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 7065, cruiseSpeed: 490,
    passengerCapacity: 440, cargoCapacityKg: 38000, fuelCapacityLiters: 171170,
    purchasePrice: 250000000, usedPrice: 110000000, maintenanceCostPerHour: 3200,
    maintenanceCostPerMonth: 288000, fuelBurnPerHour: 7500,
    firstIntroduced: 1995, availableFrom: 1995, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 6, isActive: true,
    description: 'First fly-by-wire Boeing - largest twin jet'
  },

  {
    manufacturer: 'Boeing', model: '777', variant: '300ER', icaoCode: 'B77W', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 7370, cruiseSpeed: 490,
    passengerCapacity: 550, cargoCapacityKg: 42000, fuelCapacityLiters: 181280,
    purchasePrice: 320000000, usedPrice: 160000000, maintenanceCostPerHour: 3400,
    maintenanceCostPerMonth: 306000, fuelBurnPerHour: 7900,
    firstIntroduced: 2004, availableFrom: 2004, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 8, isActive: true,
    description: 'Stretched 777 - ultra long range'
  },

  {
    manufacturer: 'Airbus', model: 'A330', variant: '300', icaoCode: 'A333', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 6350, cruiseSpeed: 470,
    passengerCapacity: 440, cargoCapacityKg: 42000, fuelCapacityLiters: 139090,
    purchasePrice: 220000000, usedPrice: 95000000, maintenanceCostPerHour: 2900,
    maintenanceCostPerMonth: 261000, fuelBurnPerHour: 6400,
    firstIntroduced: 1993, availableFrom: 1993, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 6, isActive: true,
    description: 'Twin widebody - shares commonality with A340'
  },

  {
    manufacturer: 'Airbus', model: 'A340', variant: '300', icaoCode: 'A343', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 7400, cruiseSpeed: 470,
    passengerCapacity: 440, cargoCapacityKg: 38000, fuelCapacityLiters: 147850,
    purchasePrice: 240000000, usedPrice: 100000000, maintenanceCostPerHour: 3100,
    maintenanceCostPerMonth: 279000, fuelBurnPerHour: 8800,
    firstIntroduced: 1993, availableFrom: 1993, availableUntil: 2011,
    requiredPilots: 2, requiredCabinCrew: 6, isActive: true,
    description: 'Four-engine long hauler - ultra long range'
  },

  {
    manufacturer: 'McDonnell Douglas', model: 'MD-11', variant: null, icaoCode: 'MD11', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 7240, cruiseSpeed: 490,
    passengerCapacity: 410, cargoCapacityKg: 42000, fuelCapacityLiters: 146210,
    purchasePrice: 200000000, usedPrice: 85000000, maintenanceCostPerHour: 3000,
    maintenanceCostPerMonth: 270000, fuelBurnPerHour: 8600,
    firstIntroduced: 1990, availableFrom: 1990, availableUntil: 2000,
    requiredPilots: 2, requiredCabinCrew: 6, isActive: true,
    description: 'Stretched DC-10 - last McDonnell Douglas jet'
  },

  {
    manufacturer: 'Boeing', model: '737', variant: '800', icaoCode: 'B738', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3115, cruiseSpeed: 475,
    passengerCapacity: 189, cargoCapacityKg: 12000, fuelCapacityLiters: 26020,
    purchasePrice: 90000000, usedPrice: 40000000, maintenanceCostPerHour: 1700,
    maintenanceCostPerMonth: 136000, fuelBurnPerHour: 2600,
    firstIntroduced: 1998, availableFrom: 1998, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: '737 Next Generation - modern avionics'
  },

  {
    manufacturer: 'Boeing', model: '737', variant: '900ER', icaoCode: 'B739', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3200, cruiseSpeed: 475,
    passengerCapacity: 220, cargoCapacityKg: 13000, fuelCapacityLiters: 29660,
    purchasePrice: 100000000, usedPrice: 48000000, maintenanceCostPerHour: 1800,
    maintenanceCostPerMonth: 144000, fuelBurnPerHour: 2750,
    firstIntroduced: 2006, availableFrom: 2006, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Longest 737 - extended range'
  },

  {
    manufacturer: 'Airbus', model: 'A319', variant: null, icaoCode: 'A319', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3750, cruiseSpeed: 470,
    passengerCapacity: 156, cargoCapacityKg: 15000, fuelCapacityLiters: 24210,
    purchasePrice: 85000000, usedPrice: 38000000, maintenanceCostPerHour: 1500,
    maintenanceCostPerMonth: 120000, fuelBurnPerHour: 2400,
    firstIntroduced: 1996, availableFrom: 1996, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Shortened A320 - long range for size'
  },

  {
    manufacturer: 'Airbus', model: 'A321', variant: null, icaoCode: 'A321', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3200, cruiseSpeed: 470,
    passengerCapacity: 236, cargoCapacityKg: 19000, fuelCapacityLiters: 30190,
    purchasePrice: 110000000, usedPrice: 52000000, maintenanceCostPerHour: 1750,
    maintenanceCostPerMonth: 140000, fuelBurnPerHour: 2650,
    firstIntroduced: 1994, availableFrom: 1994, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Stretched A320 - most successful A320 variant'
  },

  // Small Props & Turboprops - 1990s
  {
    manufacturer: 'British Aerospace', model: 'Jetstream', variant: '41', icaoCode: 'JS41', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 835, cruiseSpeed: 300,
    passengerCapacity: 29, cargoCapacityKg: 2800, fuelCapacityLiters: 2660,
    purchasePrice: 8200000, usedPrice: 3500000, maintenanceCostPerHour: 610,
    maintenanceCostPerMonth: 48800, fuelBurnPerHour: 420,
    firstIntroduced: 1991, availableFrom: 1991, availableUntil: 1997,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Final Jetstream - stretched and improved'
  },

  {
    manufacturer: 'Dornier', model: '328', variant: 'Turboprop', icaoCode: 'D328', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 755, cruiseSpeed: 335,
    passengerCapacity: 33, cargoCapacityKg: 3400, fuelCapacityLiters: 2900,
    purchasePrice: 9800000, usedPrice: 4200000, maintenanceCostPerHour: 640,
    maintenanceCostPerMonth: 51200, fuelBurnPerHour: 490,
    firstIntroduced: 1993, availableFrom: 1993, availableUntil: 2000,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Dornier commuter - advanced for era'
  },

  {
    manufacturer: 'Raytheon', model: 'Beech 1900D', variant: null, icaoCode: 'B190', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1200, cruiseSpeed: 285,
    passengerCapacity: 19, cargoCapacityKg: 2300, fuelCapacityLiters: 2200,
    purchasePrice: 6500000, usedPrice: 2800000, maintenanceCostPerHour: 610,
    maintenanceCostPerMonth: 48800, fuelBurnPerHour: 350,
    firstIntroduced: 1990, availableFrom: 1990, availableUntil: 2002,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Improved 1900 - stand-up cabin'
  },

  {
    manufacturer: 'Cessna', model: '208B', variant: 'Grand Caravan', icaoCode: 'C208', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1070, cruiseSpeed: 185,
    passengerCapacity: 14, cargoCapacityKg: 1800, fuelCapacityLiters: 1513,
    purchasePrice: 3800000, usedPrice: 1700000, maintenanceCostPerHour: 460,
    maintenanceCostPerMonth: 36800, fuelBurnPerHour: 195,
    firstIntroduced: 1990, availableFrom: 1990, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Stretched Caravan - utility workhorse'
  },

  {
    manufacturer: 'Viking Air', model: 'DHC-6', variant: 'Twin Otter Series 400', icaoCode: 'DHC6', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 750, cruiseSpeed: 180,
    passengerCapacity: 19, cargoCapacityKg: 2100, fuelCapacityLiters: 1420,
    purchasePrice: 5500000, usedPrice: 2400000, maintenanceCostPerHour: 570,
    maintenanceCostPerMonth: 45600, fuelBurnPerHour: 250,
    firstIntroduced: 2010, availableFrom: 2010, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Reborn Twin Otter - modern production'
  },

  {
    manufacturer: 'Pilatus', model: 'PC-12', variant: null, icaoCode: 'PC12', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1560, cruiseSpeed: 285,
    passengerCapacity: 11, cargoCapacityKg: 1200, fuelCapacityLiters: 1800,
    purchasePrice: 4800000, usedPrice: 2100000, maintenanceCostPerHour: 550,
    maintenanceCostPerMonth: 44000, fuelBurnPerHour: 290,
    firstIntroduced: 1991, availableFrom: 1991, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Swiss single turboprop - very versatile'
  },

  {
    manufacturer: 'Quest', model: 'Kodiak', variant: '100', icaoCode: 'K100', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1015, cruiseSpeed: 183,
    passengerCapacity: 10, cargoCapacityKg: 1400, fuelCapacityLiters: 1430,
    purchasePrice: 3500000, usedPrice: 1600000, maintenanceCostPerHour: 450,
    maintenanceCostPerMonth: 36000, fuelBurnPerHour: 200,
    firstIntroduced: 2007, availableFrom: 2007, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'STOL utility - mission work'
  },

  {
    manufacturer: 'Pacific Aerospace', model: 'PAC 750XL', variant: null, icaoCode: 'P750', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 680, cruiseSpeed: 150,
    passengerCapacity: 9, cargoCapacityKg: 1700, fuelCapacityLiters: 900,
    purchasePrice: 2500000, usedPrice: 1100000, maintenanceCostPerHour: 380,
    maintenanceCostPerMonth: 30400, fuelBurnPerHour: 160,
    firstIntroduced: 2001, availableFrom: 2001, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'New Zealand utility - extreme STOL'
  },

  {
    manufacturer: 'GippsAero', model: 'GA8', variant: 'Airvan', icaoCode: 'GA8', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 800, cruiseSpeed: 125,
    passengerCapacity: 8, cargoCapacityKg: 900, fuelCapacityLiters: 460,
    purchasePrice: 1800000, usedPrice: 800000, maintenanceCostPerHour: 320,
    maintenanceCostPerMonth: 25600, fuelBurnPerHour: 95,
    firstIntroduced: 2000, availableFrom: 2000, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Australian light utility - bush operations'
  },

  // Regional Jets - 1990s
  {
    manufacturer: 'Bombardier', model: 'CRJ-200', variant: null, icaoCode: 'CRJ2', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1700, cruiseSpeed: 450,
    passengerCapacity: 50, cargoCapacityKg: 3000, fuelCapacityLiters: 5270,
    purchasePrice: 23000000, usedPrice: 10000000, maintenanceCostPerHour: 900,
    maintenanceCostPerMonth: 72000, fuelBurnPerHour: 1000,
    firstIntroduced: 1992, availableFrom: 1992, availableUntil: 2006,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Popular regional jet - launched RJ revolution'
  },

  {
    manufacturer: 'Bombardier', model: 'CRJ-700', variant: null, icaoCode: 'CRJ7', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1600, cruiseSpeed: 450,
    passengerCapacity: 78, cargoCapacityKg: 4500, fuelCapacityLiters: 10600,
    purchasePrice: 35000000, usedPrice: 15000000, maintenanceCostPerHour: 1000,
    maintenanceCostPerMonth: 80000, fuelBurnPerHour: 1400,
    firstIntroduced: 2001, availableFrom: 2001, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Stretched CRJ - popular regional jet'
  },

  {
    manufacturer: 'Bombardier', model: 'CRJ-900', variant: null, icaoCode: 'CRJ9', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1550, cruiseSpeed: 450,
    passengerCapacity: 90, cargoCapacityKg: 5000, fuelCapacityLiters: 12500,
    purchasePrice: 42000000, usedPrice: 19000000, maintenanceCostPerHour: 1100,
    maintenanceCostPerMonth: 88000, fuelBurnPerHour: 1550,
    firstIntroduced: 2003, availableFrom: 2003, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Largest CRJ - efficient regional operations'
  },

  {
    manufacturer: 'Embraer', model: 'ERJ 145', variant: null, icaoCode: 'E145', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1550, cruiseSpeed: 450,
    passengerCapacity: 50, cargoCapacityKg: 3000, fuelCapacityLiters: 5260,
    purchasePrice: 20000000, usedPrice: 8000000, maintenanceCostPerHour: 800,
    maintenanceCostPerMonth: 64000, fuelBurnPerHour: 900,
    firstIntroduced: 1996, availableFrom: 1996, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Brazilian regional jet - very successful'
  },

  {
    manufacturer: 'Embraer', model: 'E-170', variant: null, icaoCode: 'E170', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 2200, cruiseSpeed: 460,
    passengerCapacity: 80, cargoCapacityKg: 6000, fuelCapacityLiters: 9400,
    purchasePrice: 38000000, usedPrice: 17000000, maintenanceCostPerHour: 1050,
    maintenanceCostPerMonth: 84000, fuelBurnPerHour: 1500,
    firstIntroduced: 2004, availableFrom: 2004, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'E-Jet family - comfortable regional jet'
  },

  {
    manufacturer: 'Embraer', model: 'E-175', variant: null, icaoCode: 'E75S', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 2200, cruiseSpeed: 460,
    passengerCapacity: 88, cargoCapacityKg: 6500, fuelCapacityLiters: 10100,
    purchasePrice: 43000000, usedPrice: 20000000, maintenanceCostPerHour: 1100,
    maintenanceCostPerMonth: 88000, fuelBurnPerHour: 1600,
    firstIntroduced: 2005, availableFrom: 2005, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Stretched E-170 - best-selling E-Jet'
  },

  {
    manufacturer: 'Embraer', model: 'E-190', variant: null, icaoCode: 'E190', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 2400, cruiseSpeed: 460,
    passengerCapacity: 114, cargoCapacityKg: 10000, fuelCapacityLiters: 12970,
    purchasePrice: 50000000, usedPrice: 24000000, maintenanceCostPerHour: 1150,
    maintenanceCostPerMonth: 92000, fuelBurnPerHour: 1750,
    firstIntroduced: 2005, availableFrom: 2005, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Larger E-Jet - bridges regional and narrowbody'
  },

  {
    manufacturer: 'Embraer', model: 'E-195', variant: null, icaoCode: 'E195', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 2300, cruiseSpeed: 460,
    passengerCapacity: 124, cargoCapacityKg: 11000, fuelCapacityLiters: 12970,
    purchasePrice: 52000000, usedPrice: 25000000, maintenanceCostPerHour: 1200,
    maintenanceCostPerMonth: 96000, fuelBurnPerHour: 1850,
    firstIntroduced: 2006, availableFrom: 2006, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Largest original E-Jet - 124 seats'
  },

  // Turboprops - 1990s
  {
    manufacturer: 'de Havilland Canada', model: 'DHC-8', variant: 'Dash 8-400', icaoCode: 'DH8D', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1200, cruiseSpeed: 360,
    passengerCapacity: 78, cargoCapacityKg: 7500, fuelCapacityLiters: 6526,
    purchasePrice: 31000000, usedPrice: 14000000, maintenanceCostPerHour: 950,
    maintenanceCostPerMonth: 76000, fuelBurnPerHour: 750,
    firstIntroduced: 1999, availableFrom: 1999, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Q400 - fastest turboprop, jet-like speeds'
  },

  // Russian/Soviet - 1990s
  {
    manufacturer: 'Antonov', model: 'An-148', variant: null, icaoCode: 'A148', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 2100, cruiseSpeed: 460,
    passengerCapacity: 85, cargoCapacityKg: 7500, fuelCapacityLiters: 11800,
    purchasePrice: 32000000, usedPrice: 14000000, maintenanceCostPerHour: 1050,
    maintenanceCostPerMonth: 84000, fuelBurnPerHour: 1600,
    firstIntroduced: 2009, availableFrom: 2009, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Ukrainian regional jet - modern Russian design'
  },

  {
    manufacturer: 'Tupolev', model: 'Tu-204', variant: null, icaoCode: 'T204', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 3900, cruiseSpeed: 480,
    passengerCapacity: 210, cargoCapacityKg: 17000, fuelCapacityLiters: 36000,
    purchasePrice: 70000000, usedPrice: 30000000, maintenanceCostPerHour: 1900,
    maintenanceCostPerMonth: 152000, fuelBurnPerHour: 3800,
    firstIntroduced: 1989, availableFrom: 1989, availableUntil: 2011,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Russian narrowbody - fly-by-wire, glass cockpit'
  },

  // ========================================
  // 2000s ERA - NEXT GENERATION
  // ========================================

  {
    manufacturer: 'Airbus', model: 'A380', variant: '800', icaoCode: 'A388', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 8000, cruiseSpeed: 488,
    passengerCapacity: 525, cargoCapacityKg: 66000, fuelCapacityLiters: 323546,
    purchasePrice: 450000000, usedPrice: 250000000, maintenanceCostPerHour: 5000,
    maintenanceCostPerMonth: 450000, fuelBurnPerHour: 14500,
    firstIntroduced: 2007, availableFrom: 2007, availableUntil: 2021,
    requiredPilots: 2, requiredCabinCrew: 12, isActive: true,
    description: 'Largest passenger aircraft - superjumbo'
  },

  {
    manufacturer: 'Boeing', model: '787', variant: '8', icaoCode: 'B788', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 7355, cruiseSpeed: 488,
    passengerCapacity: 359, cargoCapacityKg: 38000, fuelCapacityLiters: 126206,
    purchasePrice: 248000000, usedPrice: 140000000, maintenanceCostPerHour: 2700,
    maintenanceCostPerMonth: 243000, fuelBurnPerHour: 5200,
    firstIntroduced: 2011, availableFrom: 2011, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 5, isActive: true,
    description: 'Dreamliner - composite construction'
  },

  {
    manufacturer: 'Boeing', model: '787', variant: '9', icaoCode: 'B789', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 7635, cruiseSpeed: 488,
    passengerCapacity: 406, cargoCapacityKg: 45000, fuelCapacityLiters: 126372,
    purchasePrice: 280000000, usedPrice: 180000000, maintenanceCostPerHour: 2800,
    maintenanceCostPerMonth: 252000, fuelBurnPerHour: 5400,
    firstIntroduced: 2014, availableFrom: 2014, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 6, isActive: true,
    description: 'Stretched Dreamliner - most popular variant'
  },

  {
    manufacturer: 'Boeing', model: '787', variant: '10', icaoCode: 'B78X', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 6430, cruiseSpeed: 488,
    passengerCapacity: 440, cargoCapacityKg: 48000, fuelCapacityLiters: 126372,
    purchasePrice: 325000000, usedPrice: 220000000, maintenanceCostPerHour: 2950,
    maintenanceCostPerMonth: 265500, fuelBurnPerHour: 5600,
    firstIntroduced: 2018, availableFrom: 2018, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 7, isActive: true,
    description: 'Longest Dreamliner - maximum capacity'
  },

  {
    manufacturer: 'Airbus', model: 'A350', variant: '900', icaoCode: 'A359', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 8100, cruiseSpeed: 487,
    passengerCapacity: 440, cargoCapacityKg: 50000, fuelCapacityLiters: 141480,
    purchasePrice: 317400000, usedPrice: 200000000, maintenanceCostPerHour: 3200,
    maintenanceCostPerMonth: 288000, fuelBurnPerHour: 5800,
    firstIntroduced: 2013, availableFrom: 2013, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 7, isActive: true,
    description: 'Carbon fiber widebody - 787 competitor'
  },

  {
    manufacturer: 'Boeing', model: '747', variant: '8', icaoCode: 'B748', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 8000, cruiseSpeed: 493,
    passengerCapacity: 524, cargoCapacityKg: 55000, fuelCapacityLiters: 238610,
    purchasePrice: 420000000, usedPrice: 280000000, maintenanceCostPerHour: 4500,
    maintenanceCostPerMonth: 405000, fuelBurnPerHour: 11000,
    firstIntroduced: 2012, availableFrom: 2012, availableUntil: 2023,
    requiredPilots: 2, requiredCabinCrew: 10, isActive: true,
    description: 'Final 747 - stretched and modernized'
  },

  {
    manufacturer: 'Embraer', model: 'E195-E2', variant: null, icaoCode: 'E295', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 2600, cruiseSpeed: 460,
    passengerCapacity: 146, cargoCapacityKg: 12000, fuelCapacityLiters: 13500,
    purchasePrice: 65000000, usedPrice: 45000000, maintenanceCostPerHour: 1200,
    maintenanceCostPerMonth: 96000, fuelBurnPerHour: 1800,
    firstIntroduced: 2019, availableFrom: 2019, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Next-gen E-Jet - efficient regional'
  },

  // Russian - 2000s
  {
    manufacturer: 'Sukhoi', model: 'Superjet 100', variant: null, icaoCode: 'SU95', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1900, cruiseSpeed: 460,
    passengerCapacity: 98, cargoCapacityKg: 7500, fuelCapacityLiters: 15700,
    purchasePrice: 35000000, usedPrice: 16000000, maintenanceCostPerHour: 1100,
    maintenanceCostPerMonth: 88000, fuelBurnPerHour: 1650,
    firstIntroduced: 2011, availableFrom: 2011, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Russian regional jet - modern Russian design'
  },

  // Small Props & Turboprops - 2000s/2010s
  {
    manufacturer: 'ATR', model: '42', variant: '600', icaoCode: 'AT46', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 800, cruiseSpeed: 300,
    passengerCapacity: 48, cargoCapacityKg: 5000, fuelCapacityLiters: 4500,
    purchasePrice: 18500000, usedPrice: 8000000, maintenanceCostPerHour: 780,
    maintenanceCostPerMonth: 62400, fuelBurnPerHour: 550,
    firstIntroduced: 2010, availableFrom: 2010, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Modern ATR-42 - glass cockpit upgrade'
  },

  {
    manufacturer: 'ATR', model: '72', variant: '600', icaoCode: 'AT76', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 900, cruiseSpeed: 300,
    passengerCapacity: 78, cargoCapacityKg: 7500, fuelCapacityLiters: 5000,
    purchasePrice: 27500000, usedPrice: 12500000, maintenanceCostPerHour: 880,
    maintenanceCostPerMonth: 70400, fuelBurnPerHour: 670,
    firstIntroduced: 2011, availableFrom: 2011, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Best-selling turboprop - very efficient'
  },

  {
    manufacturer: 'Bombardier', model: 'Q400', variant: 'NextGen', icaoCode: 'DH8D', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1200, cruiseSpeed: 360,
    passengerCapacity: 86, cargoCapacityKg: 8200, fuelCapacityLiters: 6800,
    purchasePrice: 33000000, usedPrice: 15000000, maintenanceCostPerHour: 970,
    maintenanceCostPerMonth: 77600, fuelBurnPerHour: 780,
    firstIntroduced: 2009, availableFrom: 2009, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Modern Q400 - fastest turboprop'
  },

  {
    manufacturer: 'Viking Air', model: 'DHC-6', variant: 'Twin Otter Guardian', icaoCode: 'DHC6', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 870, cruiseSpeed: 180,
    passengerCapacity: 19, cargoCapacityKg: 2300, fuelCapacityLiters: 1520,
    purchasePrice: 6200000, usedPrice: 2700000, maintenanceCostPerHour: 590,
    maintenanceCostPerMonth: 47200, fuelBurnPerHour: 270,
    firstIntroduced: 2015, availableFrom: 2015, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Modern Twin Otter - maritime patrol variant'
  },

  {
    manufacturer: 'Daher', model: 'TBM 940', variant: null, icaoCode: 'TBM9', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1730, cruiseSpeed: 330,
    passengerCapacity: 6, cargoCapacityKg: 600, fuelCapacityLiters: 1125,
    purchasePrice: 4200000, usedPrice: 2500000, maintenanceCostPerHour: 500,
    maintenanceCostPerMonth: 40000, fuelBurnPerHour: 280,
    firstIntroduced: 2019, availableFrom: 2019, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Fast single turboprop - VIP commuter'
  },

  {
    manufacturer: 'Pilatus', model: 'PC-24', variant: null, icaoCode: 'PC24', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 2000, cruiseSpeed: 440,
    passengerCapacity: 11, cargoCapacityKg: 1400, fuelCapacityLiters: 3030,
    purchasePrice: 10900000, usedPrice: 7500000, maintenanceCostPerHour: 700,
    maintenanceCostPerMonth: 56000, fuelBurnPerHour: 600,
    firstIntroduced: 2018, availableFrom: 2018, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Super Versatile Jet - STOL jet'
  },

  {
    manufacturer: 'Tecnam', model: 'P2012', variant: 'Traveller', icaoCode: 'P212', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 593, cruiseSpeed: 190,
    passengerCapacity: 11, cargoCapacityKg: 1200, fuelCapacityLiters: 800,
    purchasePrice: 3200000, usedPrice: 1500000, maintenanceCostPerHour: 430,
    maintenanceCostPerMonth: 34400, fuelBurnPerHour: 140,
    firstIntroduced: 2016, availableFrom: 2016, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Italian commuter - modern light twin'
  },

  {
    manufacturer: 'Cessna', model: '408', variant: 'SkyCourier', icaoCode: 'C408', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 900, cruiseSpeed: 200,
    passengerCapacity: 19, cargoCapacityKg: 2700, fuelCapacityLiters: 2650,
    purchasePrice: 6100000, usedPrice: 4000000, maintenanceCostPerHour: 580,
    maintenanceCostPerMonth: 46400, fuelBurnPerHour: 350,
    firstIntroduced: 2020, availableFrom: 2020, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'FedEx feeder - cargo/passenger twin'
  },

  {
    manufacturer: 'de Havilland Canada', model: 'DHC-515', variant: 'Firefighter', icaoCode: 'CL15', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1350, cruiseSpeed: 180,
    passengerCapacity: 20, cargoCapacityKg: 3600, fuelCapacityLiters: 5600,
    purchasePrice: 37000000, usedPrice: 20000000, maintenanceCostPerHour: 1050,
    maintenanceCostPerMonth: 84000, fuelBurnPerHour: 900,
    firstIntroduced: 2016, availableFrom: 2016, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Amphibious firefighter - can carry passengers'
  },

  {
    manufacturer: 'Diamond', model: 'DA62', variant: null, icaoCode: 'DA62', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1285, cruiseSpeed: 192,
    passengerCapacity: 7, cargoCapacityKg: 650, fuelCapacityLiters: 336,
    purchasePrice: 1500000, usedPrice: 900000, maintenanceCostPerHour: 280,
    maintenanceCostPerMonth: 22400, fuelBurnPerHour: 65,
    firstIntroduced: 2015, availableFrom: 2015, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Diesel twin - ultra-efficient'
  },

  {
    manufacturer: 'Textron', model: 'Cessna 182', variant: 'Skylane', icaoCode: 'C182', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 920, cruiseSpeed: 145,
    passengerCapacity: 4, cargoCapacityKg: 450, fuelCapacityLiters: 334,
    purchasePrice: 550000, usedPrice: 250000, maintenanceCostPerHour: 180,
    maintenanceCostPerMonth: 14400, fuelBurnPerHour: 50,
    firstIntroduced: 1956, availableFrom: 1980, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Classic high-wing single - still in production'
  },

  {
    manufacturer: 'Piper', model: 'PA-46', variant: 'M600', icaoCode: 'PA46', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1484, cruiseSpeed: 274,
    passengerCapacity: 6, cargoCapacityKg: 550, fuelCapacityLiters: 540,
    purchasePrice: 3200000, usedPrice: 2000000, maintenanceCostPerHour: 410,
    maintenanceCostPerMonth: 32800, fuelBurnPerHour: 180,
    firstIntroduced: 2016, availableFrom: 2016, availableUntil: null,
    requiredPilots: 1, requiredCabinCrew: 0, isActive: true,
    description: 'Single turboprop - pressurized cabin'
  },

  // ========================================
  // 2010s-PRESENT - LATEST GENERATION
  // ========================================

  {
    manufacturer: 'Boeing', model: '737', variant: 'MAX 7', icaoCode: 'B37M', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3850, cruiseSpeed: 475,
    passengerCapacity: 172, cargoCapacityKg: 18000, fuelCapacityLiters: 30000,
    purchasePrice: 105000000, usedPrice: 72000000, maintenanceCostPerHour: 1750,
    maintenanceCostPerMonth: 140000, fuelBurnPerHour: 2450,
    firstIntroduced: 2024, availableFrom: 2024, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Shortest MAX - long range'
  },

  {
    manufacturer: 'Boeing', model: '737', variant: 'MAX 8', icaoCode: 'B38M', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3550, cruiseSpeed: 475,
    passengerCapacity: 189, cargoCapacityKg: 20000, fuelCapacityLiters: 36000,
    purchasePrice: 125000000, usedPrice: 85000000, maintenanceCostPerHour: 1800,
    maintenanceCostPerMonth: 144000, fuelBurnPerHour: 2500,
    firstIntroduced: 2017, availableFrom: 2017, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Latest 737 - LEAP engines'
  },

  {
    manufacturer: 'Boeing', model: '737', variant: 'MAX 9', icaoCode: 'B39M', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3550, cruiseSpeed: 475,
    passengerCapacity: 220, cargoCapacityKg: 22000, fuelCapacityLiters: 36000,
    purchasePrice: 135000000, usedPrice: 95000000, maintenanceCostPerHour: 1850,
    maintenanceCostPerMonth: 148000, fuelBurnPerHour: 2600,
    firstIntroduced: 2018, availableFrom: 2018, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Stretched MAX - high capacity'
  },

  {
    manufacturer: 'Boeing', model: '737', variant: 'MAX 10', icaoCode: 'B3XM', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3300, cruiseSpeed: 475,
    passengerCapacity: 230, cargoCapacityKg: 23000, fuelCapacityLiters: 36000,
    purchasePrice: 145000000, usedPrice: 105000000, maintenanceCostPerHour: 1900,
    maintenanceCostPerMonth: 152000, fuelBurnPerHour: 2700,
    firstIntroduced: 2024, availableFrom: 2024, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 5, isActive: true,
    description: 'Largest MAX - maximum capacity'
  },

  {
    manufacturer: 'Airbus', model: 'A320', variant: 'neo', icaoCode: 'A20N', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3300, cruiseSpeed: 470,
    passengerCapacity: 194, cargoCapacityKg: 18000, fuelCapacityLiters: 34000,
    purchasePrice: 110000000, usedPrice: 75000000, maintenanceCostPerHour: 1600,
    maintenanceCostPerMonth: 128000, fuelBurnPerHour: 2400,
    firstIntroduced: 2015, availableFrom: 2015, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'New Engine Option - 15% fuel savings'
  },

  {
    manufacturer: 'Airbus', model: 'A321', variant: 'neo', icaoCode: 'A21N', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 4000, cruiseSpeed: 470,
    passengerCapacity: 244, cargoCapacityKg: 19000, fuelCapacityLiters: 32840,
    purchasePrice: 129000000, usedPrice: 92000000, maintenanceCostPerHour: 1750,
    maintenanceCostPerMonth: 140000, fuelBurnPerHour: 2550,
    firstIntroduced: 2016, availableFrom: 2016, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Best-selling single-aisle - efficient'
  },

  {
    manufacturer: 'Airbus', model: 'A321', variant: 'LR', icaoCode: 'A21N', type: 'Narrowbody',
    rangeCategory: 'Long Haul', rangeNm: 4000, cruiseSpeed: 470,
    passengerCapacity: 244, cargoCapacityKg: 17000, fuelCapacityLiters: 32840,
    purchasePrice: 142000000, usedPrice: 105000000, maintenanceCostPerHour: 1800,
    maintenanceCostPerMonth: 144000, fuelBurnPerHour: 2650,
    firstIntroduced: 2018, availableFrom: 2018, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Long Range - transatlantic capability'
  },

  {
    manufacturer: 'Airbus', model: 'A321', variant: 'XLR', icaoCode: 'A21N', type: 'Narrowbody',
    rangeCategory: 'Long Haul', rangeNm: 4700, cruiseSpeed: 470,
    passengerCapacity: 244, cargoCapacityKg: 18000, fuelCapacityLiters: 39465,
    purchasePrice: 150000000, usedPrice: 115000000, maintenanceCostPerHour: 1850,
    maintenanceCostPerMonth: 148000, fuelBurnPerHour: 2750,
    firstIntroduced: 2024, availableFrom: 2024, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Extra Long Range - longest narrowbody range'
  },

  {
    manufacturer: 'Airbus', model: 'A220', variant: '100', icaoCode: 'BCS1', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3400, cruiseSpeed: 463,
    passengerCapacity: 135, cargoCapacityKg: 8000, fuelCapacityLiters: 21805,
    purchasePrice: 81000000, usedPrice: 52000000, maintenanceCostPerHour: 1300,
    maintenanceCostPerMonth: 104000, fuelBurnPerHour: 1950,
    firstIntroduced: 2016, availableFrom: 2016, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Ex-Bombardier C Series - very efficient'
  },

  {
    manufacturer: 'Airbus', model: 'A220', variant: '300', icaoCode: 'BCS3', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3350, cruiseSpeed: 463,
    passengerCapacity: 160, cargoCapacityKg: 10000, fuelCapacityLiters: 21805,
    purchasePrice: 91500000, usedPrice: 60000000, maintenanceCostPerHour: 1400,
    maintenanceCostPerMonth: 112000, fuelBurnPerHour: 2100,
    firstIntroduced: 2016, availableFrom: 2016, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Stretched A220 - clean-sheet design'
  },

  {
    manufacturer: 'Boeing', model: '777', variant: '8X', icaoCode: 'B778', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 8730, cruiseSpeed: 490,
    passengerCapacity: 420, cargoCapacityKg: 47000, fuelCapacityLiters: 197977,
    purchasePrice: 410000000, usedPrice: 330000000, maintenanceCostPerHour: 3600,
    maintenanceCostPerMonth: 324000, fuelBurnPerHour: 7900,
    firstIntroduced: 2025, availableFrom: 2025, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 8, isActive: true,
    description: 'Ultra-long range 777X - folding wingtips'
  },

  {
    manufacturer: 'Boeing', model: '777', variant: '9X', icaoCode: 'B779', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 7285, cruiseSpeed: 490,
    passengerCapacity: 470, cargoCapacityKg: 50000, fuelCapacityLiters: 197977,
    purchasePrice: 442000000, usedPrice: 350000000, maintenanceCostPerHour: 3800,
    maintenanceCostPerMonth: 342000, fuelBurnPerHour: 8200,
    firstIntroduced: 2025, availableFrom: 2025, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 9, isActive: true,
    description: 'Latest 777 - ultra-efficient'
  },

  {
    manufacturer: 'Airbus', model: 'A350', variant: '1000', icaoCode: 'A35K', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 8700, cruiseSpeed: 487,
    passengerCapacity: 480, cargoCapacityKg: 55000, fuelCapacityLiters: 156000,
    purchasePrice: 366500000, usedPrice: 280000000, maintenanceCostPerHour: 3500,
    maintenanceCostPerMonth: 315000, fuelBurnPerHour: 6200,
    firstIntroduced: 2018, availableFrom: 2018, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 8, isActive: true,
    description: 'Stretched A350 - longest range commercial jet'
  },

  // Russian - Modern
  {
    manufacturer: 'Irkut', model: 'MC-21', variant: '300', icaoCode: 'MC23', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3700, cruiseSpeed: 470,
    passengerCapacity: 211, cargoCapacityKg: 18000, fuelCapacityLiters: 29500,
    purchasePrice: 85000000, usedPrice: 55000000, maintenanceCostPerHour: 1650,
    maintenanceCostPerMonth: 132000, fuelBurnPerHour: 2550,
    firstIntroduced: 2021, availableFrom: 2021, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Modern Russian narrowbody - composite wings'
  },

  // ========================================
  // CARGO AIRCRAFT
  // ========================================

  {
    manufacturer: 'Boeing', model: '777', variant: 'F', icaoCode: 'B77L', type: 'Cargo',
    rangeCategory: 'Long Haul', rangeNm: 5625, cruiseSpeed: 489,
    passengerCapacity: 0, cargoCapacityKg: 102000, mainDeckCapacityKg: 65000, cargoHoldCapacityKg: 37000,
    fuelCapacityLiters: 117340,
    purchasePrice: 350000000, usedPrice: 280000000, maintenanceCostPerHour: 3500,
    maintenanceCostPerMonth: 315000, fuelBurnPerHour: 6200,
    firstIntroduced: 2009, availableFrom: 2009, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Heavy cargo aircraft'
  },

  {
    manufacturer: 'Boeing', model: '747', variant: '8F', icaoCode: 'B748', type: 'Cargo',
    rangeCategory: 'Long Haul', rangeNm: 4390, cruiseSpeed: 493,
    passengerCapacity: 0, cargoCapacityKg: 134000, mainDeckCapacityKg: 86000, cargoHoldCapacityKg: 48000,
    fuelCapacityLiters: 238610,
    purchasePrice: 420000000, usedPrice: 320000000, maintenanceCostPerHour: 4800,
    maintenanceCostPerMonth: 432000, fuelBurnPerHour: 11500,
    firstIntroduced: 2011, availableFrom: 2011, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Largest 747 freighter'
  },

  {
    manufacturer: 'Airbus', model: 'A330', variant: '200F', icaoCode: 'A332', type: 'Cargo',
    rangeCategory: 'Long Haul', rangeNm: 4000, cruiseSpeed: 470,
    passengerCapacity: 0, cargoCapacityKg: 70000, mainDeckCapacityKg: 46000, cargoHoldCapacityKg: 24000,
    fuelCapacityLiters: 139090,
    purchasePrice: 240000000, usedPrice: 180000000, maintenanceCostPerHour: 3000,
    maintenanceCostPerMonth: 270000, fuelBurnPerHour: 6800,
    firstIntroduced: 2010, availableFrom: 2010, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Medium-capacity freighter'
  },

  {
    manufacturer: 'Boeing', model: '767', variant: '300F', icaoCode: 'B763', type: 'Cargo',
    rangeCategory: 'Long Haul', rangeNm: 3255, cruiseSpeed: 470,
    passengerCapacity: 0, cargoCapacityKg: 54400, mainDeckCapacityKg: 36000, cargoHoldCapacityKg: 18400,
    fuelCapacityLiters: 91380,
    purchasePrice: 200000000, usedPrice: 140000000, maintenanceCostPerHour: 2700,
    maintenanceCostPerMonth: 243000, fuelBurnPerHour: 5800,
    firstIntroduced: 1995, availableFrom: 1995, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Workhorse cargo aircraft'
  },

  {
    manufacturer: 'McDonnell Douglas', model: 'MD-11', variant: 'F', icaoCode: 'MD11', type: 'Cargo',
    rangeCategory: 'Long Haul', rangeNm: 4030, cruiseSpeed: 490,
    passengerCapacity: 0, cargoCapacityKg: 88680, mainDeckCapacityKg: 58000, cargoHoldCapacityKg: 30680,
    fuelCapacityLiters: 146210,
    purchasePrice: 210000000, usedPrice: 150000000, maintenanceCostPerHour: 3100,
    maintenanceCostPerMonth: 279000, fuelBurnPerHour: 8800,
    firstIntroduced: 1991, availableFrom: 1991, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Popular cargo tri-jet - still flying'
  }
,

  // ========================================
  // ADDITIONAL AIRCRAFT
  // ========================================

  {
    manufacturer: 'Douglas', model: 'DC-4', variant: null, icaoCode: 'DC4', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2500, cruiseSpeed: 220,
    passengerCapacity: 44, cargoCapacityKg: 3200, fuelCapacityLiters: 5460,
    purchasePrice: 9000000, usedPrice: 4200000, maintenanceCostPerHour: 850,
    maintenanceCostPerMonth: 68000, fuelBurnPerHour: 760,
    firstIntroduced: 1942, availableFrom: 1942, availableUntil: 1975,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Postwar workhorse - unpressurised four-engine transport'
  },

  {
    manufacturer: 'Douglas', model: 'DC-6', variant: null, icaoCode: 'DC6', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 3000, cruiseSpeed: 280,
    passengerCapacity: 68, cargoCapacityKg: 5700, fuelCapacityLiters: 18400,
    purchasePrice: 11000000, usedPrice: 5000000, maintenanceCostPerHour: 950,
    maintenanceCostPerMonth: 76000, fuelBurnPerHour: 900,
    firstIntroduced: 1947, availableFrom: 1947, availableUntil: 1980,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Pressurised DC-4 successor - reliable long-range prop'
  },

  {
    manufacturer: 'Douglas', model: 'DC-7', variant: null, icaoCode: 'DC7', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 3700, cruiseSpeed: 310,
    passengerCapacity: 99, cargoCapacityKg: 7500, fuelCapacityLiters: 24190,
    purchasePrice: 13000000, usedPrice: 5500000, maintenanceCostPerHour: 1050,
    maintenanceCostPerMonth: 84000, fuelBurnPerHour: 1100,
    firstIntroduced: 1953, availableFrom: 1953, availableUntil: 1975,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Last great Douglas prop - first nonstop US transcontinental'
  },

  {
    manufacturer: 'Lockheed', model: 'L-188', variant: 'Electra', icaoCode: 'L188', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 2500, cruiseSpeed: 350,
    passengerCapacity: 99, cargoCapacityKg: 6600, fuelCapacityLiters: 20200,
    purchasePrice: 14000000, usedPrice: 6000000, maintenanceCostPerHour: 1000,
    maintenanceCostPerMonth: 80000, fuelBurnPerHour: 1400,
    firstIntroduced: 1959, availableFrom: 1959, availableUntil: 1985,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'American turboprop - fast but plagued by early wing issues'
  },

  {
    manufacturer: 'Convair', model: '240', variant: null, icaoCode: 'CVLP', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1200, cruiseSpeed: 250,
    passengerCapacity: 40, cargoCapacityKg: 2800, fuelCapacityLiters: 5700,
    purchasePrice: 7000000, usedPrice: 3000000, maintenanceCostPerHour: 700,
    maintenanceCostPerMonth: 56000, fuelBurnPerHour: 650,
    firstIntroduced: 1948, availableFrom: 1948, availableUntil: 1975,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Pressurised short-haul twin - DC-3 replacement'
  },

  {
    manufacturer: 'Convair', model: '340', variant: null, icaoCode: 'CVLP', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1500, cruiseSpeed: 260,
    passengerCapacity: 44, cargoCapacityKg: 3200, fuelCapacityLiters: 6200,
    purchasePrice: 7500000, usedPrice: 3200000, maintenanceCostPerHour: 720,
    maintenanceCostPerMonth: 57600, fuelBurnPerHour: 670,
    firstIntroduced: 1952, availableFrom: 1952, availableUntil: 1978,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Stretched Convair 240 - improved range and payload'
  },

  {
    manufacturer: 'Convair', model: '440', variant: null, icaoCode: 'CVLP', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1600, cruiseSpeed: 270,
    passengerCapacity: 52, cargoCapacityKg: 3600, fuelCapacityLiters: 6500,
    purchasePrice: 8000000, usedPrice: 3500000, maintenanceCostPerHour: 740,
    maintenanceCostPerMonth: 59200, fuelBurnPerHour: 690,
    firstIntroduced: 1956, availableFrom: 1956, availableUntil: 1980,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Metropolitan - final piston Convairliner with weather radar'
  },

  {
    manufacturer: 'Convair', model: '580', variant: null, icaoCode: 'CVLT', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1600, cruiseSpeed: 290,
    passengerCapacity: 52, cargoCapacityKg: 3800, fuelCapacityLiters: 6500,
    purchasePrice: 8500000, usedPrice: 3800000, maintenanceCostPerHour: 760,
    maintenanceCostPerMonth: 60800, fuelBurnPerHour: 700,
    firstIntroduced: 1960, availableFrom: 1960, availableUntil: 1990,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Turboprop Convairliner conversion - Allison 501 engines'
  },

  {
    manufacturer: 'Martin', model: '4-0-4', variant: null, icaoCode: 'M404', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1000, cruiseSpeed: 250,
    passengerCapacity: 40, cargoCapacityKg: 2500, fuelCapacityLiters: 5100,
    purchasePrice: 7000000, usedPrice: 3000000, maintenanceCostPerHour: 700,
    maintenanceCostPerMonth: 56000, fuelBurnPerHour: 640,
    firstIntroduced: 1951, availableFrom: 1951, availableUntil: 1975,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Pressurised twin - competitor to Convair 240/340'
  },

  {
    manufacturer: 'Vickers', model: 'Viscount', variant: '700', icaoCode: 'VISC', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1400, cruiseSpeed: 290,
    passengerCapacity: 53, cargoCapacityKg: 3600, fuelCapacityLiters: 6100,
    purchasePrice: 10000000, usedPrice: 4500000, maintenanceCostPerHour: 800,
    maintenanceCostPerMonth: 64000, fuelBurnPerHour: 700,
    firstIntroduced: 1953, availableFrom: 1953, availableUntil: 1985,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'World\'s first turboprop airliner - revolutionary smooth ride'
  },

  {
    manufacturer: 'Fokker', model: '60', variant: null, icaoCode: 'F60', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 900, cruiseSpeed: 280,
    passengerCapacity: 58, cargoCapacityKg: 5500, fuelCapacityLiters: 5300,
    purchasePrice: 20000000, usedPrice: 8000000, maintenanceCostPerHour: 850,
    maintenanceCostPerMonth: 68000, fuelBurnPerHour: 620,
    firstIntroduced: 1996, availableFrom: 1996, availableUntil: 2010,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Stretched Fokker 50 - military-derived utility transport'
  },

  {
    manufacturer: 'Shorts', model: '330', variant: null, icaoCode: 'SH33', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 500, cruiseSpeed: 190,
    passengerCapacity: 30, cargoCapacityKg: 3400, fuelCapacityLiters: 2600,
    purchasePrice: 8000000, usedPrice: 3500000, maintenanceCostPerHour: 600,
    maintenanceCostPerMonth: 48000, fuelBurnPerHour: 450,
    firstIntroduced: 1976, availableFrom: 1976, availableUntil: 2000,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Square-fuselage commuter - derived from Skyvan'
  },

  {
    manufacturer: 'Saab', model: '340', variant: 'A', icaoCode: 'SF34', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 800, cruiseSpeed: 280,
    passengerCapacity: 33, cargoCapacityKg: 2900, fuelCapacityLiters: 3100,
    purchasePrice: 12000000, usedPrice: 5000000, maintenanceCostPerHour: 650,
    maintenanceCostPerMonth: 52000, fuelBurnPerHour: 480,
    firstIntroduced: 1984, availableFrom: 1984, availableUntil: 1994,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Original Saab 340 - Swedish-American commuter'
  },

  {
    manufacturer: 'ATR', model: '42', variant: '300', icaoCode: 'AT43', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 750, cruiseSpeed: 290,
    passengerCapacity: 48, cargoCapacityKg: 4800, fuelCapacityLiters: 4500,
    purchasePrice: 14000000, usedPrice: 5000000, maintenanceCostPerHour: 700,
    maintenanceCostPerMonth: 56000, fuelBurnPerHour: 520,
    firstIntroduced: 1985, availableFrom: 1985, availableUntil: 1996,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Original ATR 42 - French-Italian regional turboprop'
  },

  {
    manufacturer: 'ATR', model: '42', variant: '400', icaoCode: 'AT44', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 780, cruiseSpeed: 295,
    passengerCapacity: 50, cargoCapacityKg: 5000, fuelCapacityLiters: 4500,
    purchasePrice: 16000000, usedPrice: 6500000, maintenanceCostPerHour: 730,
    maintenanceCostPerMonth: 58400, fuelBurnPerHour: 540,
    firstIntroduced: 1996, availableFrom: 1996, availableUntil: 2005,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Improved ATR 42 - PW121 engines and better avionics'
  },

  {
    manufacturer: 'ATR', model: '72', variant: '200', icaoCode: 'AT72', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 800, cruiseSpeed: 305,
    passengerCapacity: 72, cargoCapacityKg: 6800, fuelCapacityLiters: 5000,
    purchasePrice: 19000000, usedPrice: 5500000, maintenanceCostPerHour: 790,
    maintenanceCostPerMonth: 63200, fuelBurnPerHour: 620,
    firstIntroduced: 1989, availableFrom: 1989, availableUntil: 1997,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Original ATR 72 - initial production version'
  },

  {
    manufacturer: 'de Havilland Canada', model: 'DHC-8', variant: 'Dash 8-200', icaoCode: 'DH8B', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 950, cruiseSpeed: 310,
    passengerCapacity: 39, cargoCapacityKg: 3400, fuelCapacityLiters: 3400,
    purchasePrice: 16000000, usedPrice: 7000000, maintenanceCostPerHour: 720,
    maintenanceCostPerMonth: 57600, fuelBurnPerHour: 520,
    firstIntroduced: 1995, availableFrom: 1995, availableUntil: 2005,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Faster Dash 8-100 - more powerful PW123C engines'
  },

  {
    manufacturer: 'Fairchild', model: 'Metro', variant: 'II', icaoCode: 'SW4', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 500, cruiseSpeed: 270,
    passengerCapacity: 19, cargoCapacityKg: 1600, fuelCapacityLiters: 1800,
    purchasePrice: 4500000, usedPrice: 1800000, maintenanceCostPerHour: 400,
    maintenanceCostPerMonth: 32000, fuelBurnPerHour: 320,
    firstIntroduced: 1974, availableFrom: 1974, availableUntil: 1990,
    requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
    description: 'Original Metro commuter - narrow tube fuselage'
  },

  {
    manufacturer: 'Dornier', model: '328', variant: 'JET', icaoCode: 'J328', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1100, cruiseSpeed: 400,
    passengerCapacity: 33, cargoCapacityKg: 2900, fuelCapacityLiters: 4500,
    purchasePrice: 18000000, usedPrice: 7500000, maintenanceCostPerHour: 900,
    maintenanceCostPerMonth: 72000, fuelBurnPerHour: 850,
    firstIntroduced: 1999, availableFrom: 1999, availableUntil: 2005,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Jet-powered 328 - faster regional with same fuselage'
  },

  {
    manufacturer: 'Antonov', model: 'An-140', variant: null, icaoCode: 'A140', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1700, cruiseSpeed: 280,
    passengerCapacity: 52, cargoCapacityKg: 6000, fuelCapacityLiters: 4330,
    purchasePrice: 14000000, usedPrice: 6000000, maintenanceCostPerHour: 700,
    maintenanceCostPerMonth: 56000, fuelBurnPerHour: 550,
    firstIntroduced: 1997, availableFrom: 1997, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Ukrainian turboprop - An-24 replacement for CIS airlines'
  },

  {
    manufacturer: 'Antonov', model: 'An-158', variant: null, icaoCode: 'A158', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1500, cruiseSpeed: 440,
    passengerCapacity: 99, cargoCapacityKg: 8000, fuelCapacityLiters: 11500,
    purchasePrice: 30000000, usedPrice: 13000000, maintenanceCostPerHour: 1000,
    maintenanceCostPerMonth: 80000, fuelBurnPerHour: 1500,
    firstIntroduced: 2010, availableFrom: 2010, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Stretched An-148 - 99-seat Ukrainian regional jet'
  },

  {
    manufacturer: 'Yakovlev', model: 'Yak-42', variant: 'D', icaoCode: 'YK42', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2200, cruiseSpeed: 430,
    passengerCapacity: 120, cargoCapacityKg: 9200, fuelCapacityLiters: 18200,
    purchasePrice: 24000000, usedPrice: 10000000, maintenanceCostPerHour: 1100,
    maintenanceCostPerMonth: 88000, fuelBurnPerHour: 2800,
    firstIntroduced: 1988, availableFrom: 1988, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Improved Yak-42 - extended range and upgraded avionics'
  },

  {
    manufacturer: 'Tupolev', model: 'Tu-154', variant: null, icaoCode: 'T154', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 2600, cruiseSpeed: 470,
    passengerCapacity: 164, cargoCapacityKg: 12000, fuelCapacityLiters: 39750,
    purchasePrice: 28000000, usedPrice: 12000000, maintenanceCostPerHour: 1400,
    maintenanceCostPerMonth: 112000, fuelBurnPerHour: 5600,
    firstIntroduced: 1972, availableFrom: 1972, availableUntil: 1998,
    requiredPilots: 3, requiredCabinCrew: 4, isActive: true,
    description: 'Soviet 727 equivalent - workhorse of Aeroflot'
  },

  {
    manufacturer: 'Ilyushin', model: 'Il-18', variant: null, icaoCode: 'IL18', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 3300, cruiseSpeed: 350,
    passengerCapacity: 120, cargoCapacityKg: 9500, fuelCapacityLiters: 23600,
    purchasePrice: 12000000, usedPrice: 5000000, maintenanceCostPerHour: 950,
    maintenanceCostPerMonth: 76000, fuelBurnPerHour: 1800,
    firstIntroduced: 1959, availableFrom: 1959, availableUntil: 1985,
    requiredPilots: 3, requiredCabinCrew: 4, isActive: true,
    description: 'Soviet turboprop - Aeroflot\'s first pressurised airliner'
  },

  {
    manufacturer: 'Ilyushin', model: 'Il-76', variant: 'TD', icaoCode: 'IL76', type: 'Cargo',
    rangeCategory: 'Long Haul', rangeNm: 2700, cruiseSpeed: 430,
    passengerCapacity: 0, cargoCapacityKg: 48000, mainDeckCapacityKg: 40000, cargoHoldCapacityKg: 8000,
    fuelCapacityLiters: 84830,
    purchasePrice: 60000000, usedPrice: 28000000, maintenanceCostPerHour: 2200,
    maintenanceCostPerMonth: 176000, fuelBurnPerHour: 7500,
    firstIntroduced: 1974, availableFrom: 1974, availableUntil: null,
    requiredPilots: 3, requiredCabinCrew: 0, isActive: true,
    description: 'Soviet heavy freighter - rough field capable military transport'
  },

  {
    manufacturer: 'Ilyushin', model: 'Il-96', variant: '400', icaoCode: 'IL96', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 5400, cruiseSpeed: 470,
    passengerCapacity: 315, cargoCapacityKg: 27000, fuelCapacityLiters: 117000,
    purchasePrice: 120000000, usedPrice: 50000000, maintenanceCostPerHour: 2400,
    maintenanceCostPerMonth: 192000, fuelBurnPerHour: 7200,
    firstIntroduced: 2007, availableFrom: 2007, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 8, isActive: true,
    description: 'Stretched Il-96 - two-crew cockpit, PS-90A1 engines'
  },

  {
    manufacturer: 'BAC', model: 'One-Eleven', variant: '200', icaoCode: 'BA11', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 1400, cruiseSpeed: 430,
    passengerCapacity: 79, cargoCapacityKg: 4200, fuelCapacityLiters: 10700,
    purchasePrice: 16000000, usedPrice: 7000000, maintenanceCostPerHour: 1100,
    maintenanceCostPerMonth: 88000, fuelBurnPerHour: 2200,
    firstIntroduced: 1965, availableFrom: 1965, availableUntil: 1989,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Original One-Eleven - pioneering short-haul British jet'
  },

  {
    manufacturer: 'BAe', model: '146', variant: '100', icaoCode: 'B461', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1600, cruiseSpeed: 400,
    passengerCapacity: 82, cargoCapacityKg: 5100, fuelCapacityLiters: 10120,
    purchasePrice: 28000000, usedPrice: 12000000, maintenanceCostPerHour: 1400,
    maintenanceCostPerMonth: 112000, fuelBurnPerHour: 2200,
    firstIntroduced: 1983, availableFrom: 1983, availableUntil: 2002,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Quiet four-jet - ideal for noise-sensitive airports'
  },

  {
    manufacturer: 'BAe', model: '146', variant: '200', icaoCode: 'B462', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1600, cruiseSpeed: 400,
    passengerCapacity: 100, cargoCapacityKg: 6000, fuelCapacityLiters: 10120,
    purchasePrice: 30000000, usedPrice: 13000000, maintenanceCostPerHour: 1450,
    maintenanceCostPerMonth: 116000, fuelBurnPerHour: 2300,
    firstIntroduced: 1983, availableFrom: 1983, availableUntil: 2002,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Stretched BAe 146 - most popular 146 variant'
  },

  {
    manufacturer: 'Avro', model: 'RJ70', variant: null, icaoCode: 'RJ70', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1600, cruiseSpeed: 410,
    passengerCapacity: 82, cargoCapacityKg: 5200, fuelCapacityLiters: 10120,
    purchasePrice: 32000000, usedPrice: 14000000, maintenanceCostPerHour: 1350,
    maintenanceCostPerMonth: 108000, fuelBurnPerHour: 2100,
    firstIntroduced: 1993, availableFrom: 1993, availableUntil: 2003,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Updated BAe 146-100 - LF507 engines and EFIS cockpit'
  },

  {
    manufacturer: 'Avro', model: 'RJ85', variant: null, icaoCode: 'RJ85', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1600, cruiseSpeed: 410,
    passengerCapacity: 93, cargoCapacityKg: 5800, fuelCapacityLiters: 10120,
    purchasePrice: 33000000, usedPrice: 14500000, maintenanceCostPerHour: 1400,
    maintenanceCostPerMonth: 112000, fuelBurnPerHour: 2200,
    firstIntroduced: 1993, availableFrom: 1993, availableUntil: 2003,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Updated BAe 146-200 - improved engines and avionics'
  },

  {
    manufacturer: 'Avro', model: 'RJ100', variant: null, icaoCode: 'RJ1H', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1600, cruiseSpeed: 410,
    passengerCapacity: 112, cargoCapacityKg: 6800, fuelCapacityLiters: 10120,
    purchasePrice: 35000000, usedPrice: 15000000, maintenanceCostPerHour: 1500,
    maintenanceCostPerMonth: 120000, fuelBurnPerHour: 2350,
    firstIntroduced: 1993, availableFrom: 1993, availableUntil: 2003,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Updated BAe 146-300 - largest Avro RJ variant'
  },

  {
    manufacturer: 'Douglas', model: 'DC-8', variant: '50', icaoCode: 'DC85', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 4900, cruiseSpeed: 470,
    passengerCapacity: 147, cargoCapacityKg: 12500, fuelCapacityLiters: 68000,
    purchasePrice: 28000000, usedPrice: 12000000, maintenanceCostPerHour: 1800,
    maintenanceCostPerMonth: 144000, fuelBurnPerHour: 5800,
    firstIntroduced: 1961, availableFrom: 1961, availableUntil: 1985,
    requiredPilots: 3, requiredCabinCrew: 5, isActive: true,
    description: 'Turbofan DC-8 - JT3D engines for better economics'
  },

  {
    manufacturer: 'Boeing', model: '727', variant: '100', icaoCode: 'B721', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2250, cruiseSpeed: 470,
    passengerCapacity: 131, cargoCapacityKg: 9800, fuelCapacityLiters: 30620,
    purchasePrice: 24000000, usedPrice: 10000000, maintenanceCostPerHour: 1600,
    maintenanceCostPerMonth: 128000, fuelBurnPerHour: 4800,
    firstIntroduced: 1964, availableFrom: 1964, availableUntil: 1984,
    requiredPilots: 3, requiredCabinCrew: 4, isActive: true,
    description: 'Original 727 trijet - short-field capable'
  },

  {
    manufacturer: 'Boeing', model: '737', variant: '100', icaoCode: 'B731', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 1600, cruiseSpeed: 430,
    passengerCapacity: 103, cargoCapacityKg: 6800, fuelCapacityLiters: 13600,
    purchasePrice: 18000000, usedPrice: 8000000, maintenanceCostPerHour: 1100,
    maintenanceCostPerMonth: 88000, fuelBurnPerHour: 2700,
    firstIntroduced: 1968, availableFrom: 1968, availableUntil: 1986,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Original Baby Boeing - short-body launch variant'
  },

  {
    manufacturer: 'Boeing', model: '737', variant: '400', icaoCode: 'B734', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2100, cruiseSpeed: 445,
    passengerCapacity: 168, cargoCapacityKg: 12500, fuelCapacityLiters: 20100,
    purchasePrice: 48000000, usedPrice: 20000000, maintenanceCostPerHour: 1400,
    maintenanceCostPerMonth: 112000, fuelBurnPerHour: 2900,
    firstIntroduced: 1988, availableFrom: 1988, availableUntil: 2000,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Stretched 737 Classic - longer fuselage for higher capacity'
  },

  {
    manufacturer: 'Boeing', model: '737', variant: '500', icaoCode: 'B735', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2400, cruiseSpeed: 445,
    passengerCapacity: 132, cargoCapacityKg: 9500, fuelCapacityLiters: 16200,
    purchasePrice: 42000000, usedPrice: 17000000, maintenanceCostPerHour: 1300,
    maintenanceCostPerMonth: 104000, fuelBurnPerHour: 2600,
    firstIntroduced: 1990, availableFrom: 1990, availableUntil: 1999,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Short-body 737 Classic - 737-200 replacement'
  },

  {
    manufacturer: 'Boeing', model: '737', variant: '600', icaoCode: 'B736', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3050, cruiseSpeed: 453,
    passengerCapacity: 130, cargoCapacityKg: 9200, fuelCapacityLiters: 21700,
    purchasePrice: 55000000, usedPrice: 23000000, maintenanceCostPerHour: 1350,
    maintenanceCostPerMonth: 108000, fuelBurnPerHour: 2500,
    firstIntroduced: 1998, availableFrom: 1998, availableUntil: 2012,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Smallest Next Gen 737 - replaced 737-500'
  },

  {
    manufacturer: 'Boeing', model: '737', variant: '700', icaoCode: 'B737', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3300, cruiseSpeed: 453,
    passengerCapacity: 149, cargoCapacityKg: 11400, fuelCapacityLiters: 21700,
    purchasePrice: 76000000, usedPrice: 32000000, maintenanceCostPerHour: 1450,
    maintenanceCostPerMonth: 116000, fuelBurnPerHour: 2650,
    firstIntroduced: 1998, availableFrom: 1998, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Popular NG variant - Southwest Airlines favourite'
  },

  {
    manufacturer: 'Boeing', model: '737', variant: '900', icaoCode: 'B739', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2950, cruiseSpeed: 453,
    passengerCapacity: 189, cargoCapacityKg: 14500, fuelCapacityLiters: 21700,
    purchasePrice: 85000000, usedPrice: 36000000, maintenanceCostPerHour: 1600,
    maintenanceCostPerMonth: 128000, fuelBurnPerHour: 2900,
    firstIntroduced: 2001, availableFrom: 2001, availableUntil: 2013,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Longest 737NG - replaced by 737-900ER'
  },

  {
    manufacturer: 'McDonnell Douglas', model: 'DC-9', variant: '10', icaoCode: 'DC91', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 1300, cruiseSpeed: 440,
    passengerCapacity: 90, cargoCapacityKg: 5700, fuelCapacityLiters: 11200,
    purchasePrice: 16000000, usedPrice: 7000000, maintenanceCostPerHour: 1100,
    maintenanceCostPerMonth: 88000, fuelBurnPerHour: 2700,
    firstIntroduced: 1965, availableFrom: 1965, availableUntil: 1982,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Original DC-9 - short-haul city-pair jet'
  },

  {
    manufacturer: 'McDonnell Douglas', model: 'MD-80', variant: null, icaoCode: 'MD80', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2500, cruiseSpeed: 455,
    passengerCapacity: 155, cargoCapacityKg: 10000, fuelCapacityLiters: 22100,
    purchasePrice: 38000000, usedPrice: 16000000, maintenanceCostPerHour: 1450,
    maintenanceCostPerMonth: 116000, fuelBurnPerHour: 2900,
    firstIntroduced: 1980, availableFrom: 1980, availableUntil: 1999,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'DC-9 Super 80 - lengthened DC-9 series base model'
  },

  {
    manufacturer: 'McDonnell Douglas', model: 'MD-81', variant: null, icaoCode: 'MD81', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2600, cruiseSpeed: 455,
    passengerCapacity: 155, cargoCapacityKg: 10000, fuelCapacityLiters: 22100,
    purchasePrice: 39000000, usedPrice: 16500000, maintenanceCostPerHour: 1460,
    maintenanceCostPerMonth: 116800, fuelBurnPerHour: 2950,
    firstIntroduced: 1980, availableFrom: 1980, availableUntil: 1999,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Initial MD-80 series production variant - JT8D-209 engines'
  },

  {
    manufacturer: 'McDonnell Douglas', model: 'MD-82', variant: null, icaoCode: 'MD82', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2700, cruiseSpeed: 455,
    passengerCapacity: 155, cargoCapacityKg: 10200, fuelCapacityLiters: 22100,
    purchasePrice: 40000000, usedPrice: 17000000, maintenanceCostPerHour: 1470,
    maintenanceCostPerMonth: 117600, fuelBurnPerHour: 2980,
    firstIntroduced: 1981, availableFrom: 1981, availableUntil: 1999,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Higher-thrust MD-81 - more powerful JT8D-217A engines'
  },

  {
    manufacturer: 'McDonnell Douglas', model: 'MD-83', variant: null, icaoCode: 'MD83', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 2900, cruiseSpeed: 460,
    passengerCapacity: 155, cargoCapacityKg: 10500, fuelCapacityLiters: 24760,
    purchasePrice: 42000000, usedPrice: 18000000, maintenanceCostPerHour: 1500,
    maintenanceCostPerMonth: 120000, fuelBurnPerHour: 3000,
    firstIntroduced: 1985, availableFrom: 1985, availableUntil: 1999,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Extended-range MD-80 - extra fuel for longer routes'
  },

  {
    manufacturer: 'McDonnell Douglas', model: 'MD-87', variant: null, icaoCode: 'MD87', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 2900, cruiseSpeed: 460,
    passengerCapacity: 130, cargoCapacityKg: 8800, fuelCapacityLiters: 22100,
    purchasePrice: 38000000, usedPrice: 16000000, maintenanceCostPerHour: 1400,
    maintenanceCostPerMonth: 112000, fuelBurnPerHour: 2850,
    firstIntroduced: 1987, availableFrom: 1987, availableUntil: 1999,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Short-body MD-80 - compact fuselage for thinner routes'
  },

  {
    manufacturer: 'McDonnell Douglas', model: 'MD-88', variant: null, icaoCode: 'MD88', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2700, cruiseSpeed: 455,
    passengerCapacity: 155, cargoCapacityKg: 10200, fuelCapacityLiters: 22100,
    purchasePrice: 43000000, usedPrice: 18500000, maintenanceCostPerHour: 1480,
    maintenanceCostPerMonth: 118400, fuelBurnPerHour: 2960,
    firstIntroduced: 1988, availableFrom: 1988, availableUntil: 2020,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Glass cockpit MD-80 - EFIS displays and FMS'
  },

  {
    manufacturer: 'McDonnell Douglas', model: 'MD-90', variant: null, icaoCode: 'MD90', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2500, cruiseSpeed: 455,
    passengerCapacity: 160, cargoCapacityKg: 11000, fuelCapacityLiters: 22100,
    purchasePrice: 48000000, usedPrice: 20000000, maintenanceCostPerHour: 1400,
    maintenanceCostPerMonth: 112000, fuelBurnPerHour: 2700,
    firstIntroduced: 1995, availableFrom: 1995, availableUntil: 2005,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Final DC-9 family - V2500 turbofans for lower noise'
  },

  {
    manufacturer: 'Embraer', model: 'ERJ 135', variant: null, icaoCode: 'E135', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1750, cruiseSpeed: 440,
    passengerCapacity: 37, cargoCapacityKg: 3200, fuelCapacityLiters: 5220,
    purchasePrice: 16000000, usedPrice: 7000000, maintenanceCostPerHour: 850,
    maintenanceCostPerMonth: 68000, fuelBurnPerHour: 1100,
    firstIntroduced: 1999, availableFrom: 1999, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Shortened ERJ 145 - 37-seat regional jet'
  },

  {
    manufacturer: 'Embraer', model: 'ERJ 140', variant: null, icaoCode: 'E140', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1650, cruiseSpeed: 440,
    passengerCapacity: 44, cargoCapacityKg: 3700, fuelCapacityLiters: 5220,
    purchasePrice: 17000000, usedPrice: 7500000, maintenanceCostPerHour: 870,
    maintenanceCostPerMonth: 69600, fuelBurnPerHour: 1150,
    firstIntroduced: 2001, availableFrom: 2001, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Mid-size ERJ - between 135 and 145'
  },

  {
    manufacturer: 'Bombardier', model: 'CRJ-100', variant: null, icaoCode: 'CRJ1', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1700, cruiseSpeed: 440,
    passengerCapacity: 50, cargoCapacityKg: 4500, fuelCapacityLiters: 7760,
    purchasePrice: 22000000, usedPrice: 9000000, maintenanceCostPerHour: 950,
    maintenanceCostPerMonth: 76000, fuelBurnPerHour: 1350,
    firstIntroduced: 1992, availableFrom: 1992, availableUntil: 2003,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Original Canadair Regional Jet - launched the CRJ family'
  },

  {
    manufacturer: 'Bombardier', model: 'CRJ-1000', variant: null, icaoCode: 'CRJX', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 1500, cruiseSpeed: 440,
    passengerCapacity: 104, cargoCapacityKg: 7500, fuelCapacityLiters: 11000,
    purchasePrice: 42000000, usedPrice: 18000000, maintenanceCostPerHour: 1200,
    maintenanceCostPerMonth: 96000, fuelBurnPerHour: 1800,
    firstIntroduced: 2010, availableFrom: 2010, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Largest CRJ - 104-seat stretched CRJ-900'
  },

  {
    manufacturer: 'Embraer', model: 'E-175', variant: 'E2', icaoCode: 'E75L', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 2100, cruiseSpeed: 470,
    passengerCapacity: 90, cargoCapacityKg: 6400, fuelCapacityLiters: 10200,
    purchasePrice: 52000000, usedPrice: 25000000, maintenanceCostPerHour: 1100,
    maintenanceCostPerMonth: 88000, fuelBurnPerHour: 1500,
    firstIntroduced: 2027, availableFrom: 2027, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Next-gen E-175 - GTF engines and new wing'
  },

  {
    manufacturer: 'Embraer', model: 'E-190', variant: 'E2', icaoCode: 'E290', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 2850, cruiseSpeed: 470,
    passengerCapacity: 114, cargoCapacityKg: 8600, fuelCapacityLiters: 13800,
    purchasePrice: 55000000, usedPrice: 27000000, maintenanceCostPerHour: 1150,
    maintenanceCostPerMonth: 92000, fuelBurnPerHour: 1600,
    firstIntroduced: 2018, availableFrom: 2018, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Second-gen E-190 - 17% better fuel burn'
  },

  {
    manufacturer: 'Airbus', model: 'A300', variant: 'B2', icaoCode: 'A30B', type: 'Widebody',
    rangeCategory: 'Short Haul', rangeNm: 2100, cruiseSpeed: 470,
    passengerCapacity: 345, cargoCapacityKg: 16500, fuelCapacityLiters: 47500,
    purchasePrice: 45000000, usedPrice: 18000000, maintenanceCostPerHour: 2300,
    maintenanceCostPerMonth: 184000, fuelBurnPerHour: 5500,
    firstIntroduced: 1974, availableFrom: 1974, availableUntil: 1984,
    requiredPilots: 3, requiredCabinCrew: 7, isActive: true,
    description: 'First Airbus - launched European consortium'
  },

  {
    manufacturer: 'Airbus', model: 'A300', variant: '600', icaoCode: 'A306', type: 'Widebody',
    rangeCategory: 'Medium Haul', rangeNm: 4050, cruiseSpeed: 470,
    passengerCapacity: 345, cargoCapacityKg: 18500, fuelCapacityLiters: 62000,
    purchasePrice: 80000000, usedPrice: 35000000, maintenanceCostPerHour: 2400,
    maintenanceCostPerMonth: 192000, fuelBurnPerHour: 5200,
    firstIntroduced: 1984, availableFrom: 1984, availableUntil: 2007,
    requiredPilots: 2, requiredCabinCrew: 7, isActive: true,
    description: 'Two-crew A300 - glass cockpit and MTOW increase'
  },

  {
    manufacturer: 'Airbus', model: 'A310', variant: '200', icaoCode: 'A310', type: 'Widebody',
    rangeCategory: 'Medium Haul', rangeNm: 3700, cruiseSpeed: 470,
    passengerCapacity: 280, cargoCapacityKg: 14500, fuelCapacityLiters: 47190,
    purchasePrice: 60000000, usedPrice: 25000000, maintenanceCostPerHour: 2100,
    maintenanceCostPerMonth: 168000, fuelBurnPerHour: 4600,
    firstIntroduced: 1983, availableFrom: 1983, availableUntil: 1998,
    requiredPilots: 2, requiredCabinCrew: 6, isActive: true,
    description: 'Short-range A310 - shortened A300 fuselage'
  },

  {
    manufacturer: 'Airbus', model: 'A318', variant: null, icaoCode: 'A318', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 3100, cruiseSpeed: 450,
    passengerCapacity: 132, cargoCapacityKg: 8200, fuelCapacityLiters: 24210,
    purchasePrice: 62000000, usedPrice: 26000000, maintenanceCostPerHour: 1300,
    maintenanceCostPerMonth: 104000, fuelBurnPerHour: 2500,
    firstIntroduced: 2003, availableFrom: 2003, availableUntil: 2013,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true,
    description: 'Baby Airbus - smallest A320 family member'
  },

  {
    manufacturer: 'Airbus', model: 'A320', variant: '100', icaoCode: 'A320', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2850, cruiseSpeed: 447,
    passengerCapacity: 180, cargoCapacityKg: 10000, fuelCapacityLiters: 15700,
    purchasePrice: 50000000, usedPrice: 20000000, maintenanceCostPerHour: 1350,
    maintenanceCostPerMonth: 108000, fuelBurnPerHour: 2650,
    firstIntroduced: 1988, availableFrom: 1988, availableUntil: 1989,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Original A320 - first fly-by-wire narrowbody, only 21 built'
  },

  {
    manufacturer: 'Boeing', model: '757', variant: '300', icaoCode: 'B753', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 3400, cruiseSpeed: 461,
    passengerCapacity: 280, cargoCapacityKg: 15900, fuelCapacityLiters: 43400,
    purchasePrice: 100000000, usedPrice: 45000000, maintenanceCostPerHour: 2000,
    maintenanceCostPerMonth: 160000, fuelBurnPerHour: 3300,
    firstIntroduced: 1999, availableFrom: 1999, availableUntil: 2004,
    requiredPilots: 2, requiredCabinCrew: 6, isActive: true,
    description: 'Stretched 757 - highest capacity single-aisle Boeing'
  },

  {
    manufacturer: 'Boeing', model: '767', variant: '200', icaoCode: 'B762', type: 'Widebody',
    rangeCategory: 'Medium Haul', rangeNm: 5800, cruiseSpeed: 460,
    passengerCapacity: 287, cargoCapacityKg: 16000, fuelCapacityLiters: 63200,
    purchasePrice: 95000000, usedPrice: 40000000, maintenanceCostPerHour: 2200,
    maintenanceCostPerMonth: 176000, fuelBurnPerHour: 4600,
    firstIntroduced: 1982, availableFrom: 1982, availableUntil: 2001,
    requiredPilots: 2, requiredCabinCrew: 6, isActive: true,
    description: 'Original 767 - first two-crew widebody'
  },

  {
    manufacturer: 'Boeing', model: '767', variant: '300', icaoCode: 'B763', type: 'Widebody',
    rangeCategory: 'Medium Haul', rangeNm: 5800, cruiseSpeed: 460,
    passengerCapacity: 350, cargoCapacityKg: 20000, fuelCapacityLiters: 63200,
    purchasePrice: 120000000, usedPrice: 50000000, maintenanceCostPerHour: 2400,
    maintenanceCostPerMonth: 192000, fuelBurnPerHour: 5000,
    firstIntroduced: 1986, availableFrom: 1986, availableUntil: 2002,
    requiredPilots: 2, requiredCabinCrew: 7, isActive: true,
    description: 'Stretched 767 - popular before ER version'
  },

  {
    manufacturer: 'Boeing', model: '767', variant: '400ER', icaoCode: 'B764', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 5650, cruiseSpeed: 460,
    passengerCapacity: 371, cargoCapacityKg: 22000, fuelCapacityLiters: 91380,
    purchasePrice: 180000000, usedPrice: 75000000, maintenanceCostPerHour: 2600,
    maintenanceCostPerMonth: 208000, fuelBurnPerHour: 5400,
    firstIntroduced: 2000, availableFrom: 2000, availableUntil: 2003,
    requiredPilots: 2, requiredCabinCrew: 8, isActive: true,
    description: 'Longest 767 - raked wingtips from 777 programme'
  },

  {
    manufacturer: 'Airbus', model: 'A330', variant: '200', icaoCode: 'A332', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 7250, cruiseSpeed: 470,
    passengerCapacity: 406, cargoCapacityKg: 19200, fuelCapacityLiters: 139100,
    purchasePrice: 210000000, usedPrice: 90000000, maintenanceCostPerHour: 2600,
    maintenanceCostPerMonth: 208000, fuelBurnPerHour: 5400,
    firstIntroduced: 1998, availableFrom: 1998, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 7, isActive: true,
    description: 'Short-fuselage A330 - long-range twin-jet'
  },

  {
    manufacturer: 'Airbus', model: 'A330', variant: '800', icaoCode: 'A338', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 8150, cruiseSpeed: 470,
    passengerCapacity: 406, cargoCapacityKg: 19500, fuelCapacityLiters: 139100,
    purchasePrice: 250000000, usedPrice: 120000000, maintenanceCostPerHour: 2500,
    maintenanceCostPerMonth: 200000, fuelBurnPerHour: 5000,
    firstIntroduced: 2020, availableFrom: 2020, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 7, isActive: true,
    description: 'A330neo short body - Trent 7000 engines and new wing'
  },

  {
    manufacturer: 'Airbus', model: 'A330', variant: '900', icaoCode: 'A339', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 7200, cruiseSpeed: 470,
    passengerCapacity: 440, cargoCapacityKg: 22000, fuelCapacityLiters: 139100,
    purchasePrice: 280000000, usedPrice: 135000000, maintenanceCostPerHour: 2600,
    maintenanceCostPerMonth: 208000, fuelBurnPerHour: 5200,
    firstIntroduced: 2018, availableFrom: 2018, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 8, isActive: true,
    description: 'A330neo - 25% more efficient than A330-300'
  },

  {
    manufacturer: 'Airbus', model: 'A340', variant: '200', icaoCode: 'A342', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 7450, cruiseSpeed: 470,
    passengerCapacity: 375, cargoCapacityKg: 17500, fuelCapacityLiters: 147000,
    purchasePrice: 140000000, usedPrice: 55000000, maintenanceCostPerHour: 3000,
    maintenanceCostPerMonth: 240000, fuelBurnPerHour: 6500,
    firstIntroduced: 1993, availableFrom: 1993, availableUntil: 2005,
    requiredPilots: 2, requiredCabinCrew: 7, isActive: true,
    description: 'Short-fuselage A340 - ultra-long range four-engine twin-aisle'
  },

  {
    manufacturer: 'Airbus', model: 'A340', variant: '500', icaoCode: 'A345', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 9000, cruiseSpeed: 470,
    passengerCapacity: 375, cargoCapacityKg: 20000, fuelCapacityLiters: 214810,
    purchasePrice: 230000000, usedPrice: 85000000, maintenanceCostPerHour: 3400,
    maintenanceCostPerMonth: 272000, fuelBurnPerHour: 7500,
    firstIntroduced: 2002, availableFrom: 2002, availableUntil: 2011,
    requiredPilots: 2, requiredCabinCrew: 9, isActive: true,
    description: 'Ultra-long-range A340 - Trent 500 engines for 16hr flights'
  },

  {
    manufacturer: 'Airbus', model: 'A340', variant: '600', icaoCode: 'A346', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 7900, cruiseSpeed: 470,
    passengerCapacity: 475, cargoCapacityKg: 25000, fuelCapacityLiters: 195880,
    purchasePrice: 240000000, usedPrice: 90000000, maintenanceCostPerHour: 3500,
    maintenanceCostPerMonth: 280000, fuelBurnPerHour: 7800,
    firstIntroduced: 2002, availableFrom: 2002, availableUntil: 2011,
    requiredPilots: 2, requiredCabinCrew: 10, isActive: true,
    description: 'Largest A340 - longest fuselage of any Airbus until A321XLR'
  },

  {
    manufacturer: 'Boeing', model: '777', variant: '200', icaoCode: 'B772', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 5240, cruiseSpeed: 480,
    passengerCapacity: 440, cargoCapacityKg: 20000, fuelCapacityLiters: 117340,
    purchasePrice: 180000000, usedPrice: 75000000, maintenanceCostPerHour: 2800,
    maintenanceCostPerMonth: 224000, fuelBurnPerHour: 6700,
    firstIntroduced: 1995, availableFrom: 1995, availableUntil: 2008,
    requiredPilots: 2, requiredCabinCrew: 9, isActive: true,
    description: 'Original 777 - first fly-by-wire Boeing'
  },

  {
    manufacturer: 'Boeing', model: '777', variant: '300', icaoCode: 'B773', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 5960, cruiseSpeed: 480,
    passengerCapacity: 550, cargoCapacityKg: 25000, fuelCapacityLiters: 117340,
    purchasePrice: 260000000, usedPrice: 100000000, maintenanceCostPerHour: 3100,
    maintenanceCostPerMonth: 248000, fuelBurnPerHour: 7400,
    firstIntroduced: 1998, availableFrom: 1998, availableUntil: 2006,
    requiredPilots: 2, requiredCabinCrew: 10, isActive: true,
    description: 'Stretched 777 - 747 replacement for dense routes'
  },

  {
    manufacturer: 'Airbus', model: 'A350', variant: '800', icaoCode: 'A358', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 8250, cruiseSpeed: 480,
    passengerCapacity: 360, cargoCapacityKg: 18500, fuelCapacityLiters: 129000,
    purchasePrice: 260000000, usedPrice: 120000000, maintenanceCostPerHour: 2600,
    maintenanceCostPerMonth: 208000, fuelBurnPerHour: 5200,
    firstIntroduced: 2016, availableFrom: 2016, availableUntil: 2018,
    requiredPilots: 2, requiredCabinCrew: 8, isActive: true,
    description: 'Short-body A350 - cancelled after 3 orders, very rare'
  },

  {
    manufacturer: 'Boeing', model: '747', variant: '200', icaoCode: 'B742', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 6560, cruiseSpeed: 480,
    passengerCapacity: 452, cargoCapacityKg: 30000, fuelCapacityLiters: 198390,
    purchasePrice: 120000000, usedPrice: 50000000, maintenanceCostPerHour: 3400,
    maintenanceCostPerMonth: 272000, fuelBurnPerHour: 10800,
    firstIntroduced: 1971, availableFrom: 1971, availableUntil: 1991,
    requiredPilots: 3, requiredCabinCrew: 12, isActive: true,
    description: 'Improved Jumbo - more powerful engines and range'
  },

  {
    manufacturer: 'Boeing', model: '747', variant: '300', icaoCode: 'B743', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 6800, cruiseSpeed: 480,
    passengerCapacity: 496, cargoCapacityKg: 32000, fuelCapacityLiters: 198390,
    purchasePrice: 140000000, usedPrice: 55000000, maintenanceCostPerHour: 3500,
    maintenanceCostPerMonth: 280000, fuelBurnPerHour: 10600,
    firstIntroduced: 1983, availableFrom: 1983, availableUntil: 1990,
    requiredPilots: 3, requiredCabinCrew: 14, isActive: true,
    description: 'Extended upper deck Jumbo - stretched hump'
  },

  {
    manufacturer: 'McDonnell Douglas', model: 'DC-10', variant: '10', icaoCode: 'DC10', type: 'Widebody',
    rangeCategory: 'Medium Haul', rangeNm: 3800, cruiseSpeed: 480,
    passengerCapacity: 380, cargoCapacityKg: 24000, fuelCapacityLiters: 82300,
    purchasePrice: 80000000, usedPrice: 32000000, maintenanceCostPerHour: 2800,
    maintenanceCostPerMonth: 224000, fuelBurnPerHour: 8200,
    firstIntroduced: 1971, availableFrom: 1971, availableUntil: 1989,
    requiredPilots: 3, requiredCabinCrew: 8, isActive: true,
    description: 'Domestic DC-10 - US transcontinental trijet'
  }
];

async function seedHistoricalAircraft() {
  try {
    console.log('=== COMPREHENSIVE AIRCRAFT DATABASE IMPORT ===\n');
    console.log(`Total Aircraft: ${COMPREHENSIVE_AIRCRAFT.length}\n`);

    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Wipe all existing aircraft records for a clean import
    await sequelize.query('TRUNCATE TABLE "aircraft" CASCADE');
    console.log(`🗑 Cleared all existing aircraft records\n`);

    let added = 0;
    let updated = 0;

    for (const aircraftData of COMPREHENSIVE_AIRCRAFT) {
      const fullName = aircraftData.variant
        ? `${aircraftData.manufacturer} ${aircraftData.model}-${aircraftData.variant}`
        : `${aircraftData.manufacturer} ${aircraftData.model}`;

      const existing = await Aircraft.findOne({
        where: {
          manufacturer: aircraftData.manufacturer,
          model: aircraftData.model,
          variant: aircraftData.variant
        }
      });

      if (existing) {
        await existing.update(aircraftData);
        console.log(`↻ Updated: ${fullName} (${aircraftData.firstIntroduced})`);
        updated++;
      } else {
        await Aircraft.create(aircraftData);
        console.log(`✓ Added: ${fullName} (${aircraftData.firstIntroduced})`);
        added++;
      }
    }

    // Cleanup: remove old records with hyphenated variants (e.g. '-100') where the clean version ('100') now exists
    const { Op } = require('sequelize');
    const hyphenDupes = await Aircraft.findAll({
      where: {
        variant: { [Op.like]: '-%' }
      }
    });
    let cleaned = 0;
    for (const old of hyphenDupes) {
      const cleanVariant = old.variant.replace(/^-/, '');
      const cleanExists = await Aircraft.findOne({
        where: {
          manufacturer: old.manufacturer,
          model: old.model,
          variant: cleanVariant
        }
      });
      if (cleanExists) {
        console.log(`🗑 Removing old duplicate: ${old.manufacturer} ${old.model} ${old.variant} (clean version "${cleanVariant}" exists)`);
        await old.destroy();
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`\n🗑 Cleaned ${cleaned} old hyphenated duplicates`);
    }

    // Statistics
    const stats = {
      byType: {
        Narrowbody: COMPREHENSIVE_AIRCRAFT.filter(a => a.type === 'Narrowbody').length,
        Widebody: COMPREHENSIVE_AIRCRAFT.filter(a => a.type === 'Widebody').length,
        Regional: COMPREHENSIVE_AIRCRAFT.filter(a => a.type === 'Regional').length,
        Cargo: COMPREHENSIVE_AIRCRAFT.filter(a => a.type === 'Cargo').length
      },
      byManufacturer: {},
      retired: COMPREHENSIVE_AIRCRAFT.filter(a => a.availableUntil !== null).length,
      turboprops: COMPREHENSIVE_AIRCRAFT.filter(a =>
        a.description.toLowerCase().includes('turboprop') ||
        a.manufacturer.includes('ATR') ||
        a.model.includes('DHC')
      ).length,
      russian: COMPREHENSIVE_AIRCRAFT.filter(a =>
        ['Tupolev', 'Ilyushin', 'Antonov', 'Yakovlev', 'Sukhoi', 'Irkut'].includes(a.manufacturer)
      ).length
    };

    console.log('\n' + '='.repeat(70));
    console.log('IMPORT SUMMARY');
    console.log('='.repeat(70));
    console.log(`\nAdded: ${added}`);
    console.log(`Updated: ${updated}`);
    console.log(`Total: ${COMPREHENSIVE_AIRCRAFT.length}`);

    console.log('\n** By Type **');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log(`\n** Special Categories **`);
    console.log(`  Turboprops: ${stats.turboprops}`);
    console.log(`  Russian/Soviet: ${stats.russian}`);
    console.log(`  Retired Aircraft: ${stats.retired}`);
    console.log(`  Currently Available: ${COMPREHENSIVE_AIRCRAFT.length - stats.retired}`);

    console.log('\n✓ Comprehensive aircraft database seeded successfully!');
    console.log('\nAll aircraft enabled (isActive: true)');
    console.log('availableFrom/availableUntil control world availability\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Seeding failed:', error);
    process.exit(1);
  }
}

seedHistoricalAircraft();
