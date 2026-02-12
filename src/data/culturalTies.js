/**
 * Cultural Ties Data
 *
 * Defines cultural, colonial, linguistic, and migration links between countries.
 * These modifiers boost demand between connected country pairs in the gravity model.
 * Multipliers are cumulative (a pair can match multiple categories).
 */

module.exports = {
  // Language/cultural groups - countries sharing language get travel boost
  languageGroups: [
    {
      name: 'Anglosphere',
      members: ['US', 'GB', 'CA', 'AU', 'NZ', 'IE'],
      multiplier: 1.20
    },
    {
      name: 'Francophone',
      members: ['FR', 'BE', 'CH', 'CA', 'SN', 'CI', 'MA', 'TN', 'DZ', 'CM', 'CG', 'ML', 'MG', 'HT'],
      multiplier: 1.15
    },
    {
      name: 'Hispanophone',
      members: ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'EC', 'VE', 'CU', 'DO', 'PA', 'CR', 'UY', 'BO', 'PY', 'GT', 'HN', 'SV', 'NI'],
      multiplier: 1.15
    },
    {
      name: 'Lusophone',
      members: ['PT', 'BR', 'MZ', 'AO', 'CV'],
      multiplier: 1.15
    },
    {
      name: 'Arabic',
      members: ['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'EG', 'JO', 'LB', 'IQ', 'MA', 'TN', 'DZ', 'LY', 'SD'],
      multiplier: 1.10
    },
    {
      name: 'Germanic',
      members: ['DE', 'AT', 'CH'],
      multiplier: 1.15
    },
    {
      name: 'Scandinavian',
      members: ['SE', 'NO', 'DK', 'FI', 'IS'],
      multiplier: 1.20
    }
  ],

  // Commonwealth nations - historic British empire connections
  commonwealth: {
    members: ['GB', 'AU', 'NZ', 'CA', 'IN', 'PK', 'BD', 'LK', 'SG', 'MY', 'KE', 'ZA', 'NG', 'GH', 'TZ', 'UG', 'JM', 'TT', 'MT', 'CY', 'BW', 'MU', 'FJ', 'BB'],
    multiplier: 1.10
  },

  // Regional trade blocs - economic integration boosts travel
  regionalBlocs: [
    {
      name: 'EU Core',
      members: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'LU', 'GR'],
      multiplier: 1.15
    },
    {
      name: 'EU Extended',
      members: ['PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI', 'EE', 'LV', 'LT'],
      multiplier: 1.10
    },
    {
      name: 'NAFTA/USMCA',
      members: ['US', 'CA', 'MX'],
      multiplier: 1.20
    },
    {
      name: 'ASEAN',
      members: ['SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'MM', 'KH', 'LA', 'BN'],
      multiplier: 1.15
    },
    {
      name: 'GCC',
      members: ['AE', 'SA', 'QA', 'KW', 'OM', 'BH'],
      multiplier: 1.15
    },
    {
      name: 'Mercosur',
      members: ['BR', 'AR', 'UY', 'PY'],
      multiplier: 1.10
    },
    {
      name: 'CIS',
      members: ['RU', 'KZ', 'UZ', 'BY', 'AZ', 'GE', 'AM', 'KG', 'TJ', 'TM', 'MD'],
      multiplier: 1.10
    },
    {
      name: 'East Asian Economic',
      members: ['CN', 'JP', 'KR', 'TW', 'HK'],
      multiplier: 1.10
    }
  ],

  // Bilateral links - specific country pairs with strong migration/business ties
  // Higher multiplier = stronger connection
  bilateral: [
    // UK diaspora/colonial
    { from: 'GB', to: 'IN', multiplier: 1.40 },
    { from: 'GB', to: 'PK', multiplier: 1.35 },
    { from: 'GB', to: 'NG', multiplier: 1.25 },
    { from: 'GB', to: 'ZA', multiplier: 1.25 },
    { from: 'GB', to: 'KE', multiplier: 1.20 },
    { from: 'GB', to: 'JM', multiplier: 1.30 },
    { from: 'GB', to: 'AU', multiplier: 1.30 },
    { from: 'GB', to: 'NZ', multiplier: 1.25 },
    { from: 'GB', to: 'HK', multiplier: 1.30 },
    { from: 'GB', to: 'CY', multiplier: 1.30 },

    // US migration/business corridors
    { from: 'US', to: 'MX', multiplier: 1.50 },
    { from: 'US', to: 'PH', multiplier: 1.30 },
    { from: 'US', to: 'IN', multiplier: 1.30 },
    { from: 'US', to: 'CN', multiplier: 1.25 },
    { from: 'US', to: 'JP', multiplier: 1.35 },
    { from: 'US', to: 'KR', multiplier: 1.25 },
    { from: 'US', to: 'DO', multiplier: 1.30 },
    { from: 'US', to: 'CU', multiplier: 1.20 },
    { from: 'US', to: 'IL', multiplier: 1.30 },
    { from: 'US', to: 'BR', multiplier: 1.20 },
    { from: 'US', to: 'CO', multiplier: 1.25 },
    { from: 'US', to: 'GB', multiplier: 1.35 },
    { from: 'US', to: 'DE', multiplier: 1.20 },
    { from: 'US', to: 'IE', multiplier: 1.25 },
    { from: 'US', to: 'IT', multiplier: 1.20 },

    // European migration corridors
    { from: 'TR', to: 'DE', multiplier: 1.40 },
    { from: 'TR', to: 'NL', multiplier: 1.25 },
    { from: 'MA', to: 'FR', multiplier: 1.35 },
    { from: 'DZ', to: 'FR', multiplier: 1.35 },
    { from: 'TN', to: 'FR', multiplier: 1.30 },
    { from: 'PL', to: 'GB', multiplier: 1.30 },
    { from: 'PL', to: 'DE', multiplier: 1.25 },
    { from: 'RO', to: 'IT', multiplier: 1.25 },
    { from: 'RO', to: 'ES', multiplier: 1.20 },
    { from: 'PT', to: 'FR', multiplier: 1.25 },
    { from: 'IT', to: 'AR', multiplier: 1.25 },
    { from: 'IT', to: 'US', multiplier: 1.20 },

    // Asian corridors
    { from: 'IN', to: 'AE', multiplier: 1.45 },
    { from: 'IN', to: 'SA', multiplier: 1.35 },
    { from: 'IN', to: 'QA', multiplier: 1.25 },
    { from: 'IN', to: 'KW', multiplier: 1.25 },
    { from: 'PK', to: 'AE', multiplier: 1.40 },
    { from: 'PK', to: 'SA', multiplier: 1.35 },
    { from: 'PH', to: 'AE', multiplier: 1.30 },
    { from: 'PH', to: 'SA', multiplier: 1.25 },
    { from: 'BD', to: 'AE', multiplier: 1.30 },
    { from: 'BD', to: 'SA', multiplier: 1.25 },
    { from: 'CN', to: 'AU', multiplier: 1.25 },
    { from: 'CN', to: 'CA', multiplier: 1.20 },
    { from: 'JP', to: 'BR', multiplier: 1.15 },
    { from: 'KR', to: 'CN', multiplier: 1.25 },
    { from: 'TH', to: 'JP', multiplier: 1.20 },
    { from: 'SG', to: 'AU', multiplier: 1.20 },

    // Oceania
    { from: 'AU', to: 'NZ', multiplier: 1.40 },
    { from: 'AU', to: 'ID', multiplier: 1.20 },

    // Africa
    { from: 'ZA', to: 'MZ', multiplier: 1.20 },
    { from: 'ZA', to: 'ZW', multiplier: 1.25 },
    { from: 'ET', to: 'SA', multiplier: 1.20 },
    { from: 'NG', to: 'US', multiplier: 1.20 },

    // Latin America
    { from: 'BR', to: 'PT', multiplier: 1.30 },
    { from: 'AR', to: 'ES', multiplier: 1.25 },
    { from: 'CO', to: 'ES', multiplier: 1.20 }
  ],

  // Domestic multiplier - no bonus since short domestic routes face heavy rail competition
  domesticMultiplier: 1.0
};
