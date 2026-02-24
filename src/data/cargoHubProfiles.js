/**
 * Cargo hub profiles — per-ICAO multipliers applied on top of the base
 * algorithmic cargo demand for airports with historically notable cargo roles.
 *
 * Keys: ICAO code
 * Values: object of cargo type key → multiplier (applied after base calculation)
 *
 * Cargo type keys: general, express, heavy, oversized, perishable, dangerous, liveAnimal, highValue
 *
 * activeFrom (optional): the first game year the hub profile applies.
 *   Before this year the airport gets purely algorithmic demand (hub multipliers ignored).
 *   Omit for airports that were cargo hubs from the dawn of commercial aviation.
 *
 * ~120 airports covering all regions for a global cargo airline experience.
 */
const CARGO_HUB_PROFILES = {

  // ── Integrator / Express hubs ──────────────────────────────────────────────
  // These are company-created hubs — they should not boost early eras

  KMEM: { activeFrom: 1973, express: 12, general: 3.5, perishable: 2.0 },   // Memphis — FedEx world hub (est. 1973)
  KSDF: { activeFrom: 1982, express: 10, general: 3.0 },                    // Louisville — UPS Worldport (UPS Airlines 1982)
  KCMH: { activeFrom: 2017, express: 8,  general: 3.0 },                    // Columbus OH — Amazon Air main US hub
  KCVG: { activeFrom: 2009, express: 6,  general: 2.5 },                    // Cincinnati — DHL Americas / Amazon Air
  EDDK: { activeFrom: 1986, express: 8,  general: 3.0 },                    // Cologne/Bonn — UPS European hub (est. 1986)
  EDDP: { activeFrom: 1998, express: 7,  general: 3.0, perishable: 1.5 },   // Leipzig/Halle — DHL European hub (est. 1998)
  EBLG: { activeFrom: 1982, express: 5,  general: 3.5, perishable: 2.0 },   // Liège — TNT Airways hub (est. 1982)
  EGNX: { activeFrom: 2001, express: 5,  general: 2.5, perishable: 1.5 },   // East Midlands — DHL/Royal Mail UK hub
  ZHHH: { activeFrom: 2009, express: 6,  general: 2.5 },                    // Wuhan — SF Express China hub
  ROAH: { activeFrom: 1994, express: 4,  general: 2.5 },                    // Okinawa Naha — ANA Cargo Asia transit hub
  KRFD: { activeFrom: 1984, express: 5,  general: 2.5 },                    // Rockford IL — UPS hub
  KONT: { activeFrom: 2015, express: 4,  general: 2.5 },                    // Ontario CA — UPS / Amazon West Coast hub
  KHSV: { activeFrom: 1991, general: 3.5, heavy: 4.0, express: 2.0 },       // Huntsville — dedicated cargo/industrial
  KCLT: { activeFrom: 2014, express: 2.0 },                                 // Charlotte — Amazon Air focus

  // ── Major international cargo gateways ────────────────────────────────────
  // These airports have been significant cargo gateways since the jet age — no activeFrom needed

  VHHH: { general: 3.5, express: 3.0, highValue: 2.5, perishable: 2.0 },    // Hong Kong — #1 cargo airport globally
  RCTP: { activeFrom: 1979, highValue: 3.5, general: 2.5, express: 3.0 },   // Taipei Taoyuan — #3 world cargo; semiconductors (opened 1979)
  EHAM: { general: 3.0, perishable: 4.5, liveAnimal: 4.0, highValue: 2.0, express: 2.0 }, // Amsterdam Schiphol
  OTHH: { activeFrom: 2014, general: 3.0, highValue: 2.5, express: 2.5, perishable: 2.0 }, // Doha Hamad — Qatar Airways Cargo (opened 2014; old airport was OTBD)
  OMDB: { activeFrom: 1960, general: 3.0, highValue: 3.0, express: 2.5, perishable: 2.0 }, // Dubai (significant from 1960s)
  WSSS: { activeFrom: 1981, general: 3.0, highValue: 3.0, perishable: 2.5, express: 2.0 }, // Singapore Changi (opened 1981; old airport WSSL)
  EDDF: { general: 2.5, express: 2.5, highValue: 2.0, perishable: 2.0 },    // Frankfurt
  LFPG: { activeFrom: 1974, general: 2.5, highValue: 1.8, perishable: 2.0, express: 2.0 }, // Paris CDG (opened 1974)
  EGLL: { general: 2.5, highValue: 2.0, express: 1.8 },                     // London Heathrow
  LIMC: { activeFrom: 1949, highValue: 2.5, general: 2.5, perishable: 1.5 }, // Milan Malpensa — fashion & luxury freight hub
  LTFM: { activeFrom: 2018, general: 2.5, express: 2.0, highValue: 1.8, perishable: 1.5 }, // Istanbul New Airport (opened 2018; old LTBA still used until then)
  LTBA: { general: 2.0, express: 1.5, highValue: 1.5 },                     // Istanbul Atatürk (old airport; closed to pax 2019 but used for decades)
  RJAA: { activeFrom: 1978, general: 2.5, express: 2.5, highValue: 2.0 },   // Tokyo Narita (opened 1978)
  KLAX: { general: 2.5, express: 2.0, perishable: 2.0 },                    // Los Angeles
  KORD: { general: 2.5, express: 2.5 },                                     // Chicago O'Hare
  KJFK: { general: 2.5, highValue: 2.5, perishable: 1.8 },                  // New York JFK
  KEWR: { general: 2.5, highValue: 2.0, express: 2.0 },                     // Newark — NY metro, pharma corridor
  PANC: { general: 4.0, heavy: 3.0, express: 2.0 },                         // Anchorage — polar transit hub (significant from 1960s)
  HAAB: { activeFrom: 1963, general: 3.0, perishable: 3.0, express: 2.5, liveAnimal: 1.5 }, // Addis Ababa — Ethiopian Airlines major cargo hub (est. 1963)
  ZGGG: { activeFrom: 1985, general: 3.0, express: 2.5 },                   // Guangzhou (modern cargo from mid-1980s)
  ZGSZ: { activeFrom: 1991, general: 3.0, express: 3.0 },                   // Shenzhen (opened 1991)
  ZSPD: { activeFrom: 1999, general: 3.0, express: 2.5, highValue: 2.0 },   // Shanghai Pudong (opened 1999)
  ZBAA: { activeFrom: 1958, general: 2.5, express: 2.0 },                   // Beijing Capital
  RKSI: { activeFrom: 2001, general: 2.5, highValue: 2.0, express: 2.0 },   // Seoul Incheon (opened 2001; old RKSS)
  VTBS: { activeFrom: 2006, perishable: 2.5, liveAnimal: 2.0, general: 1.8 }, // Bangkok Suvarnabhumi (opened 2006; old VTBD)
  WSAP: { general: 3.0, highValue: 2.5 },                                   // Singapore Paya Lebar (used 1955–1981 before Changi)

  // ── North American regional hubs ──────────────────────────────────────────
  KDFW: { activeFrom: 1974, general: 2.5, express: 2.0 },                   // Dallas Fort Worth (opened 1974)
  KDEN: { activeFrom: 1995, general: 2.0, express: 1.8 },                   // Denver International (opened 1995; old KAPA/KSTAPLETON)
  KIAH: { activeFrom: 1969, general: 2.0, heavy: 2.5, dangerous: 2.5 },     // Houston — oil & gas equipment (opened 1969)
  KPHL: { general: 2.0, highValue: 2.5, dangerous: 1.8 },                   // Philadelphia — pharma valley (GSK, Merck)
  KBOS: { highValue: 2.5, dangerous: 1.5 },                                 // Boston — biotech/pharma cluster
  KFLL: { activeFrom: 1975, perishable: 2.5, general: 2.0, liveAnimal: 1.5 }, // Fort Lauderdale — Latin America perishables gateway
  KMIA: { activeFrom: 1959, perishable: 4.0, liveAnimal: 3.0, express: 2.0, general: 2.0 }, // Miami — Latin America gateway
  KSEA: { heavy: 2.0, oversized: 2.0 },                                     // Seattle — Boeing, aerospace
  KPIT: { heavy: 2.5 },                                                     // Pittsburgh — steel/industrial
  CYYZ: { general: 2.5, express: 2.0 },                                     // Toronto Pearson
  CYVR: { general: 2.5, perishable: 1.8, express: 2.0 },                    // Vancouver — trans-Pacific gateway
  MMMX: { general: 2.0, express: 1.8 },                                     // Mexico City
  MMGL: { activeFrom: 1994, express: 2.0, general: 1.8 },                   // Guadalajara — Mexico mfg centre (NAFTA boom)

  // ── South & Central American hubs ─────────────────────────────────────────
  SKBO: { activeFrom: 1968, perishable: 4.0, liveAnimal: 1.5, highValue: 1.8, general: 2.0 }, // Bogotá — Colombia hub; flowers, emeralds
  SPIM: { activeFrom: 1965, perishable: 4.5, highValue: 1.8, liveAnimal: 1.5 }, // Lima — asparagus, fish meal, gold
  MROC: { activeFrom: 1985, perishable: 3.0, highValue: 2.5 },              // San José Costa Rica — medical devices, pineapples
  SAEZ: { activeFrom: 1949, perishable: 3.5, general: 2.0, liveAnimal: 1.5 }, // Buenos Aires Ezeiza — beef, wine, fruit
  SCEL: { perishable: 3.5, highValue: 1.5 },                                // Santiago — fruit, wine, copper products
  SBGR: { activeFrom: 1985, general: 2.5, express: 2.0, perishable: 1.8 },  // São Paulo Guarulhos (significant from 1985)
  SBKP: { activeFrom: 1995, express: 4.0, general: 3.5, perishable: 1.8 },  // Campinas Viracopos — Brazil's dedicated freighter hub
  SEQM: { activeFrom: 1985, perishable: 6.0, liveAnimal: 2.0 },             // Quito — world's #1 flower exporter (major from 1980s)
  SKRG: { activeFrom: 1985, perishable: 5.5, liveAnimal: 1.8 },             // Medellín Rionegro — Colombia flowers
  SKCL: { activeFrom: 1985, perishable: 4.0 },                              // Cali — Colombia

  // ── European regional cargo hubs ──────────────────────────────────────────
  ELLX: { activeFrom: 1970, general: 3.5, heavy: 3.0, oversized: 2.5, highValue: 2.0 }, // Luxembourg — Cargolux founded 1970
  EKCH: { general: 2.0, perishable: 2.0, liveAnimal: 1.5, express: 1.5 },   // Copenhagen
  ENGM: { activeFrom: 1998, perishable: 2.5, liveAnimal: 1.5 },             // Oslo Gardermoen (opened 1998; old ENGB/Fornebu)
  EFHK: { general: 2.0, perishable: 1.8 },                                  // Helsinki — Nordic hub
  EIDW: { activeFrom: 1993, highValue: 3.0, dangerous: 2.0 },               // Dublin — pharma cluster (industry boomed post-1990)
  EDDH: { heavy: 2.5, oversized: 2.5 },                                     // Hamburg — industrial/Airbus
  EDDS: { heavy: 2.0, highValue: 2.0 },                                     // Stuttgart — Mercedes, Porsche automotive
  LFBO: { activeFrom: 1969, heavy: 2.5, oversized: 4.0 },                   // Toulouse — Airbus parts (A300 first flew 1969)
  LOWW: { highValue: 2.5, dangerous: 1.5 },                                 // Vienna — pharma, luxury transit
  LHBP: { activeFrom: 1990, highValue: 2.5, dangerous: 1.5 },               // Budapest — pharma (post-Soviet transition)
  EPWA: { activeFrom: 1990, general: 1.8, express: 2.0 },                   // Warsaw — fast-growing post-1990 e-commerce
  EGPD: { activeFrom: 1975, heavy: 2.5, dangerous: 2.5 },                   // Aberdeen — North Sea oil (boom from mid-1970s)
  ENZV: { activeFrom: 1975, heavy: 2.0, dangerous: 2.0 },                   // Stavanger — North Sea oil
  ESGG: { activeFrom: 1960, heavy: 2.0, general: 1.8 },                     // Gothenburg — Volvo, automotive exports
  LSZH: { highValue: 3.5, dangerous: 2.0 },                                 // Zurich — watches, pharma, gold
  LSGG: { highValue: 3.5 },                                                 // Geneva — luxury goods, gold
  EBBR: { highValue: 2.5, perishable: 2.0, liveAnimal: 2.5 },               // Brussels — diamonds, AVI hub
  LEMD: { perishable: 2.0 },                                                // Madrid — Iberian agricultural
  LEBL: { perishable: 2.0 },                                                // Barcelona
  LIRF: { perishable: 1.8 },                                                // Rome
  UKBB: { activeFrom: 1960, general: 1.8, express: 1.5 },                   // Kyiv Boryspil (opened 1959)
  UUEE: { general: 2.0, heavy: 1.8 },                                       // Moscow Sheremetyevo

  // ── Middle East & Gulf ─────────────────────────────────────────────────────
  OERK: { activeFrom: 1983, general: 2.0, heavy: 2.0, dangerous: 1.8 },     // Riyadh — King Khalid (opened 1983)
  OEDF: { activeFrom: 1975, heavy: 3.5, dangerous: 3.0, oversized: 2.0 },   // Dammam — oil & gas (North Sea boom era for Middle East too)
  OKBK: { activeFrom: 1970, general: 1.8, heavy: 1.8, dangerous: 1.5 },     // Kuwait — oil sector
  LLBG: { activeFrom: 1975, highValue: 3.5, dangerous: 2.0, express: 2.0, general: 2.0 }, // Tel Aviv Ben Gurion (opened 1975)
  OOMS: { activeFrom: 1973, general: 2.0, heavy: 1.5 },                     // Muscat — Gulf hub (modern airport from 1973)

  // ── African cargo hubs ─────────────────────────────────────────────────────
  HKJK: { activeFrom: 1958, perishable: 4.5, liveAnimal: 2.5 },             // Nairobi Jomo Kenyatta — East Africa flowers/veg
  FAOR: { activeFrom: 1952, general: 2.5, liveAnimal: 2.5, perishable: 2.0, highValue: 1.8 }, // Johannesburg OR Tambo
  DNMM: { activeFrom: 1979, general: 2.0, perishable: 1.5, dangerous: 1.5 }, // Lagos Murtala Mohammed (opened 1979)
  GMMN: { activeFrom: 1980, general: 2.0, perishable: 2.0 },                // Casablanca Mohammed V (opened 1980)
  DGAA: { activeFrom: 1960, perishable: 2.5, highValue: 2.0 },              // Accra — cocoa, gold
  DIAP: { activeFrom: 1960, perishable: 2.5, general: 1.5 },                // Abidjan — cocoa, coffee
  FKKD: { activeFrom: 1960, perishable: 2.0, general: 1.5 },                // Douala — palm oil, cocoa
  HTDA: { activeFrom: 1965, perishable: 2.0, liveAnimal: 1.5 },             // Dar es Salaam — fresh fish, wildlife
  FVHA: { activeFrom: 1960, perishable: 2.5, liveAnimal: 2.0, highValue: 1.5 }, // Harare — flowers, tobacco, gemstones
  FACT: { perishable: 3.0 },                                                // Cape Town — wine, citrus
  FALE: { activeFrom: 1975, perishable: 2.5 },                              // Durban/King Shaka — citrus, sugar
  FOOL: { activeFrom: 1977, heavy: 2.0, dangerous: 2.0, general: 1.5 },    // Libreville — oil & gas (Gabon oil boom)
  FNLU: { activeFrom: 1975, heavy: 1.8, dangerous: 1.8, general: 1.5 },    // Luanda — Angolan oil industry

  // ── South Asia ────────────────────────────────────────────────────────────
  VIDP: { activeFrom: 1962, general: 2.5, express: 2.0, highValue: 1.5 },   // Delhi Indira Gandhi (modern terminal from 1962)
  VABB: { activeFrom: 1948, general: 2.5, highValue: 3.0, express: 2.0 },   // Mumbai — diamonds, textiles, pharma
  VOBL: { activeFrom: 2008, highValue: 3.0, general: 2.0, express: 2.0 },   // Bangalore KIA (opened 2008; old VOBG)
  VOMM: { activeFrom: 1980, heavy: 2.5, general: 2.0, highValue: 1.5 },     // Chennai — automotive parts (Hyundai, BMW from 1990s+)
  VOCI: { activeFrom: 1999, perishable: 3.0, liveAnimal: 1.5 },             // Cochin int'l (opened 1999)
  VCBI: { activeFrom: 1967, perishable: 2.5, liveAnimal: 1.5, highValue: 2.0 }, // Colombo — tea, gems, garments

  // ── Southeast Asia ────────────────────────────────────────────────────────
  WMKK: { activeFrom: 1998, general: 2.5, highValue: 2.0, express: 2.0, perishable: 1.5 }, // KL International (opened 1998; old WMKL Subang)
  WMKP: { activeFrom: 1985, highValue: 3.5, general: 2.0 },                 // Penang — semiconductor hub (Intel, AMD from 1970s but cargo boomed 1980s+)
  WIII: { activeFrom: 1985, general: 2.0, perishable: 1.5, express: 1.8 },  // Jakarta Soekarno-Hatta (opened 1985)
  VTSP: { activeFrom: 1990, perishable: 2.5 },                              // Phuket — seafood
  VVTS: { activeFrom: 1990, general: 2.5, express: 2.0, perishable: 1.5 },  // Ho Chi Minh City — electronics, garments (Đổi Mới reform 1986)
  VVNB: { activeFrom: 1994, general: 2.0, express: 2.0, highValue: 1.8 },   // Hanoi Noi Bai — Samsung/LG exports (new terminal 1994)
  RPLL: { activeFrom: 1948, perishable: 2.5, liveAnimal: 2.0 },             // Manila — tropical produce

  // ── East Asia ─────────────────────────────────────────────────────────────
  RJBB: { activeFrom: 1994, general: 2.0, express: 2.0, highValue: 1.5 },   // Osaka Kansai (opened 1994)
  ZUCK: { activeFrom: 2004, general: 2.0, express: 2.0 },                   // Chongqing Jiangbei (current terminal 2004)
  ZUUU: { activeFrom: 1995, general: 2.0, express: 1.8 },                   // Chengdu (major expansion 1995)
  UEEE: { activeFrom: 1950, highValue: 4.0, general: 1.5 },                 // Yakutsk — Siberian diamonds (ALROSA) & gold

  // ── Oceania & Pacific ─────────────────────────────────────────────────────
  YPPH: { heavy: 3.0, oversized: 3.0 },                                     // Perth — mining equipment
  YSSY: { perishable: 1.8, liveAnimal: 1.8 },                               // Sydney — agricultural exports
  YBBN: { activeFrom: 1988, perishable: 2.0, liveAnimal: 1.5, general: 1.5 }, // Brisbane (international terminal 1988)
  YMML: { perishable: 2.0, liveAnimal: 2.0, general: 1.5 },                 // Melbourne — agricultural, live animals
  YPAD: { perishable: 2.5, liveAnimal: 1.5 },                               // Adelaide — wine, seafood
  NZAA: { perishable: 2.5, liveAnimal: 2.0 },                               // Auckland — NZ kiwifruit, dairy, meat
  NZCH: { perishable: 2.5, liveAnimal: 2.0 },                               // Christchurch — NZ lamb, dairy, kiwifruit
};

module.exports = CARGO_HUB_PROFILES;
