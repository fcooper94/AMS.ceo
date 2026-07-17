/**
 * Airline name filter — shared by the browser (as globals) and Node (module.exports).
 *
 *   checkAirlineName(name) -> { ok: true } | { ok: false, reason: string }
 *
 * Blocks:
 *   - profanity / slurs (whole-word match, plus a hard set matched anywhere)
 *   - real-world airline names (normalised exact match)
 *
 * Both lists are easy to extend — add entries and they take effect everywhere.
 */
(function (root) {
  // ── Profanity ──
  // Matched as whole words (tokenised on non-alphanumerics), so place names like
  // "Class" or "Bassair" are unaffected.
  const SWEAR_WORDS = [
    'fuck', 'fucker', 'fucking', 'fuckoff', 'motherfucker', 'clusterfuck', 'fuckwit',
    'shit', 'shite', 'shithead', 'bullshit', 'dipshit', 'shitty',
    'ass', 'asses', 'asshole', 'arse', 'arsehole', 'jackass', 'dumbass',
    'bitch', 'bitches', 'bastard', 'dick', 'dickhead', 'prick', 'cock', 'cocksucker',
    'pussy', 'cunt', 'twat', 'wanker', 'wank', 'bollocks', 'bollock', 'bugger',
    'damn', 'goddamn', 'crap', 'piss', 'pissed', 'slut', 'whore', 'hoe', 'skank',
    'dildo', 'boner', 'jizz', 'cum', 'tits', 'titties', 'boobs', 'knob', 'minge',
    'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'spastic', 'spaz',
    'coon', 'chink', 'spic', 'kike', 'wetback', 'gook', 'paki', 'tranny', 'dyke',
    'nazi', 'hitler', 'rape', 'rapist', 'pedo', 'paedo', 'pedophile', 'paedophile', 'molester'
  ];

  // Matched anywhere in the name (spaces removed). Only unambiguous strings that
  // effectively never occur inside legitimate words go here.
  const SWEAR_HARD = [
    'fuck', 'motherfuck', 'shit', 'shite', 'bullshit', 'asshole', 'dickhead', 'cocksuck',
    'bitch', 'cunt', 'twat', 'slut', 'whore', 'wank', 'wanker',
    'nigger', 'nigga', 'faggot'
  ];

  // ── Real-world airlines (block impersonation) ──
  const REAL_AIRLINES = [
    // North America
    'American Airlines', 'Delta Air Lines', 'Delta Airlines', 'United Airlines', 'Southwest Airlines',
    'Alaska Airlines', 'JetBlue', 'JetBlue Airways', 'Spirit Airlines', 'Frontier Airlines',
    'Hawaiian Airlines', 'Allegiant Air', 'Sun Country Airlines', 'Breeze Airways', 'Avelo Airlines',
    'Air Canada', 'WestJet', 'Porter Airlines', 'Flair Airlines', 'Mesa Airlines', 'SkyWest Airlines',
    'Republic Airways', 'Envoy Air', 'Endeavor Air', 'PSA Airlines',
    'Aeromexico', 'Volaris', 'Viva Aerobus', 'Cubana', 'Bahamasair',
    // Historic North America
    'Pan Am', 'Pan American', 'Trans World Airlines', 'TWA', 'Continental Airlines', 'Northwest Airlines',
    'US Airways', 'America West Airlines', 'Braniff', 'Braniff International', 'Eastern Air Lines',
    'Aloha Airlines', 'ATA Airlines', 'Virgin America', 'Midwest Airlines',
    // Europe
    'British Airways', 'Lufthansa', 'Air France', 'KLM', 'Iberia', 'Ryanair', 'easyJet',
    'Wizz Air', 'Vueling', 'Aer Lingus', 'TAP Air Portugal', 'TAP Portugal', 'Alitalia', 'ITA Airways',
    'Swiss International Air Lines', 'Swiss', 'Austrian Airlines', 'Brussels Airlines',
    'Scandinavian Airlines', 'SAS', 'Finnair', 'Norwegian', 'Norwegian Air Shuttle', 'Icelandair',
    'Aegean Airlines', 'Olympic Air', 'LOT Polish Airlines', 'Turkish Airlines', 'Pegasus Airlines',
    'Aeroflot', 'S7 Airlines', 'Ural Airlines', 'Rossiya Airlines', 'Pobeda',
    'Virgin Atlantic', 'Jet2', 'TUI Airways', 'Condor', 'Eurowings', 'Transavia', 'Air Europa',
    'Croatia Airlines', 'Air Serbia', 'Air Malta', 'Luxair', 'Wideroe', 'Loganair', 'Flybe',
    'Air Baltic', 'Czech Airlines', 'Bulgaria Air', 'TAROM', 'Ukraine International Airlines',
    // Historic Europe
    'Swissair', 'Sabena', 'Malev', 'Monarch Airlines', 'Thomas Cook Airlines', 'WOW air',
    'Air Berlin', 'Laudamotion', 'BMI', 'British Midland', 'Dan-Air', 'Varig',
    // Middle East
    'Emirates', 'Etihad Airways', 'Qatar Airways', 'Saudia', 'flydubai', 'Air Arabia', 'Gulf Air',
    'Kuwait Airways', 'Oman Air', 'Royal Jordanian', 'Middle East Airlines', 'EgyptAir', 'El Al',
    'Israir', 'Iran Air', 'Mahan Air', 'Jazeera Airways', 'SalamAir', 'Flynas',
    // Asia
    'Singapore Airlines', 'Cathay Pacific', 'Japan Airlines', 'All Nippon Airways', 'ANA',
    'Korean Air', 'Asiana Airlines', 'China Airlines', 'EVA Air', 'Thai Airways', 'Thai Airways International',
    'Malaysia Airlines', 'Garuda Indonesia', 'Philippine Airlines', 'Vietnam Airlines',
    'AirAsia', 'Cebu Pacific', 'IndiGo', 'Air India', 'SpiceJet', 'Vistara', 'Jet Airways', 'Akasa Air', 'GoAir',
    'China Southern Airlines', 'China Eastern Airlines', 'Air China', 'Hainan Airlines', 'Xiamen Airlines',
    'Shenzhen Airlines', 'Juneyao Airlines', 'Spring Airlines', 'Shandong Airlines', 'Sichuan Airlines',
    'Cathay Dragon', 'Dragonair', 'Hong Kong Airlines', 'Greater Bay Airlines',
    'Bangkok Airways', 'Nok Air', 'Thai AirAsia', 'Thai Lion Air', 'Thai VietJet',
    'Lion Air', 'Batik Air', 'Citilink', 'Sriwijaya Air', 'Scoot', 'Jetstar', 'Jetstar Asia',
    'Peach Aviation', 'Jeju Air', 'Tway Air', 'Eastar Jet', 'Air Busan', 'Air Seoul', 'Jin Air',
    'Star Flyer', 'Skymark Airlines', 'Solaseed Air', 'VietJet Air', 'Bamboo Airways',
    'SriLankan Airlines', 'Biman Bangladesh Airlines', 'US-Bangla Airlines', 'Pakistan International Airlines',
    'Nepal Airlines', 'Bhutan Airlines', 'Druk Air', 'Myanmar Airways International', 'Royal Brunei Airlines',
    'Air Astana', 'Uzbekistan Airways', 'Azerbaijan Airlines', 'Air Macau', 'Starlux Airlines',
    // Oceania
    'Qantas', 'Virgin Australia', 'Jetstar Airways', 'Rex', 'Regional Express', 'Bonza',
    'Air New Zealand', 'Fiji Airways', 'Air Vanuatu', 'Air Tahiti Nui',
    // Africa
    'Ethiopian Airlines', 'Kenya Airways', 'South African Airways', 'Royal Air Maroc', 'Air Algerie',
    'Tunisair', 'RwandAir', 'Air Mauritius', 'TAAG Angola Airlines', 'Air Senegal', 'Air Peace',
    'Arik Air', 'Fastjet', 'Mango', 'FlySafair', 'Kulula', 'Comair', 'Air Botswana', 'Precision Air',
    // South & Central America
    'LATAM', 'LATAM Airlines', 'Avianca', 'GOL', 'GOL Linhas Aereas', 'Azul', 'Azul Brazilian Airlines',
    'Aerolineas Argentinas', 'Copa Airlines', 'Sky Airline', 'JetSMART', 'Wingo', 'Boliviana de Aviacion',
    'Aeromar', 'TAME', 'Conviasa', 'Amaszonas', 'Paranair',
    // Cargo
    'FedEx', 'FedEx Express', 'UPS Airlines', 'Cargolux', 'Atlas Air', 'Kalitta Air', 'Polar Air Cargo',
    'Nippon Cargo Airlines', 'ABX Air', 'Western Global Airlines', 'DHL Aviation', 'Silk Way Airlines',
    'AeroLogic', 'ASL Airlines'
  ];

  // ── Matching helpers ──
  const _norm = s => (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const SWEAR_SET = new Set(SWEAR_WORDS.map(_norm));
  const AIRLINE_SET = new Set(REAL_AIRLINES.map(_norm));

  function checkAirlineName(name) {
    const raw = (name || '').trim();
    if (!raw) return { ok: false, reason: 'Please enter an airline name.' };

    const norm = _norm(raw);
    const collapsed = norm.replace(/\s+/g, '');
    const words = norm.split(/\s+/).filter(Boolean);

    for (const w of words) {
      if (SWEAR_SET.has(w)) return { ok: false, reason: 'That name contains inappropriate language — please choose another.' };
    }
    for (const bad of SWEAR_HARD) {
      if (collapsed.includes(bad)) return { ok: false, reason: 'That name contains inappropriate language — please choose another.' };
    }
    if (AIRLINE_SET.has(norm)) return { ok: false, reason: 'That is a real-world airline — please pick an original name.' };

    return { ok: true };
  }

  const api = { checkAirlineName, SWEAR_WORDS, SWEAR_HARD, REAL_AIRLINES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.checkAirlineName = checkAirlineName; root.AIRLINE_NAME_FILTER = api; }
})(typeof self !== 'undefined' ? self : this);
