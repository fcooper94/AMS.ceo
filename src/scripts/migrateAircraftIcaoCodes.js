/**
 * Migration: Populate ICAO type designator codes for all aircraft
 * Used for aircraft images from doc8643.com
 * Safe to run multiple times (updates existing records)
 */
require('dotenv').config();
const sequelize = require('../config/database');
const { Aircraft } = require('../models');

// Mapping: [manufacturer, model, variant] => ICAO type designator
const ICAO_CODES = [
  // Classic Props
  ['Douglas', 'DC-3', null, 'DC3'],
  ['Douglas', 'DC-4', null, 'DC4'],
  ['Douglas', 'DC-6', null, 'DC6'],
  ['Douglas', 'DC-7', null, 'DC7'],
  ['Lockheed', 'L-1049', 'Super Constellation', 'CONI'],
  ['Lockheed', 'L-188', 'Electra', 'L188'],
  ['Convair', '240', null, 'CVLP'],
  ['Convair', '340', null, 'CVLP'],
  ['Convair', '440', null, 'CVLP'],
  ['Convair', '580', null, 'CVLT'],
  ['Martin', '4-0-4', null, 'M404'],
  ['Vickers', 'Viscount', '700', 'VISC'],
  ['Vickers', 'Viscount', '800', 'VISC'],
  ['de Havilland', 'Comet 4', null, 'COMT'],
  ['Sud Aviation', 'Caravelle', null, 'S210'],
  ['Tupolev', 'Tu-104', null, 'T104'],
  ['Ilyushin', 'Il-14', null, 'IL14'],
  ['Ilyushin', 'Il-18', null, 'IL18'],
  ['Antonov', 'An-24', null, 'AN24'],
  ['Antonov', 'An-2', null, 'AN2'],
  ['Beechcraft', '18', 'Twin Beech', 'BE18'],
  ['de Havilland', 'Dove', null, 'DOVE'],
  ['de Havilland', 'Heron', null, 'HERN'],
  ['Grumman', 'G-21', 'Goose', 'G21'],

  // Early Jets & Narrowbodies
  ['Boeing', '707', '320B', 'B703'],
  ['Douglas', 'DC-8', '50', 'DC85'],
  ['Douglas', 'DC-8', '63', 'DC86'],
  ['Boeing', '727', '100', 'B721'],
  ['Boeing', '727', '200', 'B722'],
  ['Boeing', '737', '100', 'B731'],
  ['Boeing', '737', '200', 'B732'],
  ['Boeing', '737', '300', 'B733'],
  ['Boeing', '737', '400', 'B734'],
  ['Boeing', '737', '500', 'B735'],
  ['Boeing', '737', '600', 'B736'],
  ['Boeing', '737', '700', 'B737'],
  ['Boeing', '737', '800', 'B738'],
  ['Boeing', '737', '900', 'B739'],
  ['Boeing', '737', '900ER', 'B739'],
  ['McDonnell Douglas', 'DC-9', '10', 'DC91'],
  ['McDonnell Douglas', 'DC-9', '30', 'DC93'],
  ['BAC', 'One-Eleven', '200', 'BA11'],
  ['BAC', 'One-Eleven', '500', 'BA11'],
  ['Fokker', 'F28', 'Fellowship', 'F28'],
  ['Fokker', '70', null, 'F70'],
  ['Fokker', '100', null, 'F100'],
  ['BAe', '146', '100', 'B461'],
  ['BAe', '146', '200', 'B462'],
  ['BAe', '146', '300', 'B463'],
  ['Avro', 'RJ70', null, 'RJ70'],
  ['Avro', 'RJ85', null, 'RJ85'],
  ['Avro', 'RJ100', null, 'RJ1H'],
  ['McDonnell Douglas', 'MD-80', null, 'MD80'],
  ['McDonnell Douglas', 'MD-81', null, 'MD81'],
  ['McDonnell Douglas', 'MD-82', null, 'MD82'],
  ['McDonnell Douglas', 'MD-83', null, 'MD83'],
  ['McDonnell Douglas', 'MD-87', null, 'MD87'],
  ['McDonnell Douglas', 'MD-88', null, 'MD88'],
  ['McDonnell Douglas', 'MD-90', null, 'MD90'],
  ['Airbus', 'A318', null, 'A318'],
  ['Airbus', 'A319', null, 'A319'],
  ['Airbus', 'A320', '100', 'A320'],
  ['Airbus', 'A320', '200', 'A320'],
  ['Airbus', 'A321', null, 'A321'],
  ['Boeing', '757', '200', 'B752'],
  ['Boeing', '757', '300', 'B753'],

  // Soviet/Russian Jets
  ['Tupolev', 'Tu-134', null, 'T134'],
  ['Tupolev', 'Tu-154', null, 'T154'],
  ['Tupolev', 'Tu-154', 'M', 'T154'],
  ['Tupolev', 'Tu-204', null, 'T204'],
  ['Ilyushin', 'Il-62', null, 'IL62'],
  ['Ilyushin', 'Il-86', null, 'IL86'],
  ['Ilyushin', 'Il-96', '300', 'IL96'],
  ['Ilyushin', 'Il-96', '400', 'IL96'],
  ['Yakovlev', 'Yak-40', null, 'YK40'],
  ['Yakovlev', 'Yak-42', null, 'YK42'],
  ['Yakovlev', 'Yak-42', 'D', 'YK42'],
  ['Antonov', 'An-140', null, 'A140'],
  ['Antonov', 'An-148', null, 'A148'],
  ['Antonov', 'An-158', null, 'A158'],
  ['Sukhoi', 'Superjet 100', null, 'SU95'],
  ['Irkut', 'MC-21', '300', 'MC23'],

  // Regional Jets
  ['Embraer', 'ERJ 135', null, 'E135'],
  ['Embraer', 'ERJ 140', null, 'E140'],
  ['Embraer', 'ERJ 145', null, 'E145'],
  ['Bombardier', 'CRJ-100', null, 'CRJ1'],
  ['Bombardier', 'CRJ-200', null, 'CRJ2'],
  ['Bombardier', 'CRJ-700', null, 'CRJ7'],
  ['Bombardier', 'CRJ-900', null, 'CRJ9'],
  ['Bombardier', 'CRJ-1000', null, 'CRJX'],
  ['Embraer', 'E-170', null, 'E170'],
  ['Embraer', 'E-175', null, 'E75S'],
  ['Embraer', 'E-175', 'E2', 'E75L'],
  ['Embraer', 'E-190', null, 'E190'],
  ['Embraer', 'E-190', 'E2', 'E290'],
  ['Embraer', 'E-195', null, 'E195'],
  ['Embraer', 'E195-E2', null, 'E295'],
  ['Airbus', 'A220', '100', 'BCS1'],
  ['Airbus', 'A220', '300', 'BCS3'],
  ['Dornier', '328', 'JET', 'J328'],

  // Turboprops
  ['Handley Page', 'HPR.7', 'Herald', 'HPR7'],
  ['NAMC', 'YS-11', null, 'YS11'],
  ['Fairchild', 'F-27', null, 'F27'],
  ['Fokker', 'F27', 'Friendship', 'F27'],
  ['Fokker', '50', null, 'F50'],
  ['Fokker', '60', null, 'F60'],
  ['Nord', '262', null, 'N262'],
  ['GAF', 'N22', 'Nomad', 'NOMA'],
  ['CASA', 'C-212', 'Aviocar', 'C212'],
  ['Shorts', 'SC.7', 'Skyvan', 'SC7'],
  ['Shorts', '330', null, 'SH33'],
  ['Shorts', '360', null, 'SH36'],
  ['Beechcraft', '99', 'Airliner', 'BE99'],
  ['Beechcraft', '1900', 'Airliner', 'B190'],
  ['Raytheon', 'Beech 1900D', null, 'B190'],
  ['British Aerospace', 'Jetstream', '31', 'JS31'],
  ['British Aerospace', 'Jetstream', '32', 'JS32'],
  ['British Aerospace', 'Jetstream', '41', 'JS41'],
  ['British Aerospace', 'ATP', 'Advanced Turboprop', 'ATP'],
  ['Saab', '340', 'A', 'SF34'],
  ['Saab', '340', 'B', 'SF34'],
  ['Saab', '2000', null, 'SB20'],
  ['ATR', '42', '300', 'AT43'],
  ['ATR', '42', '320', 'AT43'],
  ['ATR', '42', '400', 'AT44'],
  ['ATR', '42', '500', 'AT45'],
  ['ATR', '42', '600', 'AT46'],
  ['ATR', '72', '200', 'AT72'],
  ['ATR', '72', '500', 'AT75'],
  ['ATR', '72', '600', 'AT76'],
  ['de Havilland Canada', 'DHC-6', 'Twin Otter', 'DHC6'],
  ['Viking Air', 'DHC-6', 'Twin Otter Series 400', 'DHC6'],
  ['Viking Air', 'DHC-6', 'Twin Otter Guardian', 'DHC6'],
  ['de Havilland Canada', 'DHC-7', 'Dash 7', 'DHC7'],
  ['de Havilland Canada', 'DHC-8', 'Dash 8-100', 'DH8A'],
  ['de Havilland Canada', 'DHC-8', 'Dash 8-200', 'DH8B'],
  ['de Havilland Canada', 'DHC-8', 'Dash 8-300', 'DH8C'],
  ['de Havilland Canada', 'DHC-8', 'Dash 8-400', 'DH8D'],
  ['Bombardier', 'Q400', 'NextGen', 'DH8D'],
  ['Embraer', 'EMB 110', 'Bandeirante', 'E110'],
  ['Embraer', 'EMB 120', 'Brasilia', 'E120'],
  ['Fairchild', 'Metro', 'II', 'SW4'],
  ['Fairchild', 'Metro', 'III', 'SW4'],
  ['Swearingen', 'SA-227', 'Metro', 'SW4'],
  ['Let', 'L-410', 'Turbolet', 'L410'],
  ['Harbin', 'Y-12', null, 'Y12'],
  ['Dornier', '228', null, 'D228'],
  ['Dornier', '328', 'Turboprop', 'D328'],

  // Small Props & Utility
  ['Pilatus', 'PC-6', 'Porter', 'PC6T'],
  ['Pilatus', 'PC-12', null, 'PC12'],
  ['Pilatus', 'PC-24', null, 'PC24'],
  ['Daher', 'TBM 940', null, 'TBM9'],
  ['Quest', 'Kodiak', '100', 'K100'],
  ['GippsAero', 'GA8', 'Airvan', 'GA8'],
  ['Pacific Aerospace', 'PAC 750XL', null, 'P750'],
  ['Tecnam', 'P2012', 'Traveller', 'P212'],
  ['Reims-Cessna', 'F406', 'Caravan II', 'F406'],
  ['Cessna', '208', 'Caravan', 'C208'],
  ['Cessna', '208B', 'Grand Caravan', 'C208'],
  ['Cessna', '408', 'SkyCourier', 'C408'],
  ['Cessna', '441', 'Conquest II', 'C441'],
  ['Textron', 'Cessna 182', 'Skylane', 'C182'],
  ['Piper', 'PA-31', 'Navajo Chieftain', 'PA31'],
  ['Piper', 'PA-42', 'Cheyenne III', 'PAY3'],
  ['Piper', 'PA-46', 'M600', 'PA46'],
  ['Partenavia', 'P.68', 'Observer', 'P68'],
  ['Diamond', 'DA62', null, 'DA62'],
  ['Britten-Norman', 'BN-2', 'Islander', 'BN2P'],
  ['Britten-Norman', 'BN-2A', 'Trislander', 'TRIS'],
  ['de Havilland Canada', 'DHC-2', 'Turbo Beaver', 'DH2T'],
  ['de Havilland Canada', 'DHC-3', 'Otter', 'DHC3'],
  ['de Havilland Canada', 'DHC-515', 'Firefighter', 'CL15'],
  ['de Havilland', 'Dove', null, 'DOVE'],
  ['de Havilland', 'Heron', null, 'HERN'],
  ['Grumman', 'G-21', 'Goose', 'G21'],
  ['Beechcraft', '18', 'Twin Beech', 'BE18'],

  // Widebodies
  ['Airbus', 'A300', 'B2', 'A30B'],
  ['Airbus', 'A300', 'B4', 'A30B'],
  ['Airbus', 'A300', '600', 'A306'],
  ['Airbus', 'A310', '200', 'A310'],
  ['Airbus', 'A310', '300', 'A310'],
  ['Airbus', 'A330', '200', 'A332'],
  ['Airbus', 'A330', '300', 'A333'],
  ['Airbus', 'A330', '800', 'A338'],
  ['Airbus', 'A330', '900', 'A339'],
  ['Airbus', 'A340', '200', 'A342'],
  ['Airbus', 'A340', '300', 'A343'],
  ['Airbus', 'A340', '500', 'A345'],
  ['Airbus', 'A340', '600', 'A346'],
  ['Boeing', '767', '200', 'B762'],
  ['Boeing', '767', '300', 'B763'],
  ['Boeing', '767', '300ER', 'B763'],
  ['Boeing', '767', '400ER', 'B764'],
  ['Boeing', '777', '200', 'B772'],
  ['Boeing', '777', '200ER', 'B772'],
  ['Boeing', '777', '300', 'B773'],
  ['Boeing', '777', '300ER', 'B77W'],
  ['Airbus', 'A350', '800', 'A358'],
  ['Airbus', 'A350', '900', 'A359'],
  ['Airbus', 'A350', '1000', 'A35K'],
  ['Boeing', '787', '8', 'B788'],
  ['Boeing', '787', '9', 'B789'],
  ['Boeing', '787', '10', 'B78X'],
  ['Boeing', '747', '100', 'B741'],
  ['Boeing', '747', '200', 'B742'],
  ['Boeing', '747', '300', 'B743'],
  ['Boeing', '747', '400', 'B744'],
  ['Boeing', '747', '8', 'B748'],
  ['McDonnell Douglas', 'DC-10', '10', 'DC10'],
  ['McDonnell Douglas', 'DC-10', '30', 'DC10'],
  ['McDonnell Douglas', 'MD-11', null, 'MD11'],
  ['Lockheed', 'L-1011', 'TriStar', 'L101'],
  ['Airbus', 'A380', '800', 'A388'],
  ['Aerospatiale-BAC', 'Concorde', null, 'CONC'],

  // Latest Generation
  ['Boeing', '737', 'MAX 7', 'B37M'],
  ['Boeing', '737', 'MAX 8', 'B38M'],
  ['Boeing', '737', 'MAX 9', 'B39M'],
  ['Boeing', '737', 'MAX 10', 'B3XM'],
  ['Airbus', 'A320', 'neo', 'A20N'],
  ['Airbus', 'A321', 'neo', 'A21N'],
  ['Airbus', 'A321', 'LR', 'A21N'],
  ['Airbus', 'A321', 'XLR', 'A21N'],
  ['Boeing', '777', '8X', 'B778'],
  ['Boeing', '777', '9X', 'B779'],

  // Cargo
  ['Ilyushin', 'Il-76', 'TD', 'IL76'],
  ['Boeing', '777', 'F', 'B77L'],
  ['Boeing', '747', '8F', 'B748'],
  ['Airbus', 'A330', '200F', 'A332'],
  ['Boeing', '767', '300F', 'B763'],
  ['McDonnell Douglas', 'MD-11', 'F', 'MD11'],
];

async function migrate() {
  try {
    console.log('=== Migrating Aircraft ICAO Codes ===\n');
    await sequelize.authenticate();
    console.log('Database connected\n');

    let updated = 0;
    let notFound = 0;

    for (const [manufacturer, model, variant, icaoCode] of ICAO_CODES) {
      const where = { manufacturer, model };
      if (variant === null) {
        where.variant = null;
      } else {
        where.variant = variant;
      }

      const [count] = await Aircraft.update(
        { icaoCode },
        { where }
      );

      if (count > 0) {
        console.log(`  Updated: ${manufacturer} ${model}${variant ? ' ' + variant : ''} => ${icaoCode}`);
        updated += count;
      } else {
        console.log(`  Not found: ${manufacturer} ${model}${variant ? ' ' + variant : ''}`);
        notFound++;
      }
    }

    console.log(`\n=== Done ===`);
    console.log(`Updated: ${updated}`);
    console.log(`Not found: ${notFound}`);

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
