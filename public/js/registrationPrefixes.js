/**
 * ICAO Aircraft Registration Prefixes by Country
 * Maps country names to their corresponding aircraft registration prefixes
 */

const REGISTRATION_PREFIXES = {
  // Major countries
  'United States': 'N-',
  'United Kingdom': 'G-',
  'Germany': 'D-',
  'France': 'F-',
  'Italy': 'I-',
  'Spain': 'EC-',
  'Netherlands': 'PH-',
  'Belgium': 'OO-',
  'Switzerland': 'HB-',
  'Austria': 'OE-',
  'Sweden': 'SE-',
  'Norway': 'LN-',
  'Denmark': 'OY-',
  'Finland': 'OH-',
  'Poland': 'SP-',
  'Czech Republic': 'OK-',
  'Portugal': 'CS-',
  'Greece': 'SX-',
  'Turkey': 'TC-',
  'Russia': 'RA-',
  'Ukraine': 'UR-',
  'Romania': 'YR-',
  'Hungary': 'HA-',
  'Bulgaria': 'LZ-',
  'Serbia': 'YU-',
  'Croatia': '9A-',
  'Slovenia': 'S5-',
  'Slovakia': 'OM-',
  'Ireland': 'EI-',
  'Iceland': 'TF-',
  'Luxembourg': 'LX-',

  // Asia-Pacific
  'China': 'B-',
  'Japan': 'JA-',
  'South Korea': 'HL-',
  'India': 'VT-',
  'Australia': 'VH-',
  'New Zealand': 'ZK-',
  'Singapore': '9V-',
  'Malaysia': '9M-',
  'Indonesia': 'PK-',
  'Thailand': 'HS-',
  'Philippines': 'RP-',
  'Vietnam': 'VN-',
  'Hong Kong': 'B-H',
  'Taiwan': 'B-',
  'Pakistan': 'AP-',
  'Bangladesh': 'S2-',
  'Sri Lanka': '4R-',
  'Nepal': '9N-',

  // Middle East
  'Saudi Arabia': 'HZ-',
  'United Arab Emirates': 'A6-',
  'Qatar': 'A7-',
  'Kuwait': '9K-',
  'Oman': 'A4O-',
  'Bahrain': 'A9C-',
  'Israel': '4X-',
  'Jordan': 'JY-',
  'Lebanon': 'OD-',
  'Iran': 'EP-',
  'Iraq': 'YI-',
  'Egypt': 'SU-',

  // Americas
  'Canada': 'C-',
  'Mexico': 'XA-',
  'Brazil': 'PR-',
  'Argentina': 'LV-',
  'Chile': 'CC-',
  'Colombia': 'HK-',
  'Peru': 'OB-',
  'Venezuela': 'YV-',
  'Ecuador': 'HC-',
  'Bolivia': 'CP-',
  'Paraguay': 'ZP-',
  'Uruguay': 'CX-',
  'Costa Rica': 'TI-',
  'Panama': 'HP-',
  'Cuba': 'CU-',
  'Jamaica': '6Y-',

  // Africa
  'South Africa': 'ZS-',
  'Nigeria': '5N-',
  'Kenya': '5Y-',
  'Ethiopia': 'ET-',
  'Morocco': 'CN-',
  'Algeria': '7T-',
  'Tunisia': 'TS-',
  'Ghana': '9G-',
  'Tanzania': '5H-',
  'Uganda': '5X-',
  'Zimbabwe': 'Z-',
  'Angola': 'D2-',
  'Mozambique': 'C9-',
  'Senegal': '6V-',
  'Cameroon': 'TJ-',
  'Ivory Coast': 'TU-',
  "Cote d'Ivoire": 'TU-',
  'Madagascar': '5R-',
  'Libya': '5A-',
  'Sudan': 'ST-',
  'Namibia': 'V5-',
  'Botswana': 'A2-',
  'Mauritius': '3B-',

  // Southeast Asia & Pacific (additional)
  'Myanmar': 'XY-',
  'Cambodia': 'XU-',
  'Laos': 'RDPL-',
  'Mongolia': 'JU-',
  'Fiji': 'DQ-',
  'Papua New Guinea': 'P2-',
  'Brunei': 'V8-',
  'Maldives': '8Q-',
  'Macau': 'B-M',
  'Taiwan': 'B-',

  // Caribbean & Central America (additional)
  'Trinidad and Tobago': '9Y-',
  'Bahamas': 'C6-',
  'Barbados': '8P-',
  'Dominican Republic': 'HI-',
  'Guatemala': 'TG-',
  'Honduras': 'HR-',
  'El Salvador': 'YS-',
  'Nicaragua': 'YN-',
  'Haiti': 'HH-',
  'Bermuda': 'VP-B',
  'Cayman Islands': 'VP-C',

  // Europe (additional)
  'Estonia': 'ES-',
  'Latvia': 'YL-',
  'Lithuania': 'LY-',
  'Malta': '9H-',
  'Cyprus': '5B-',
  'Albania': 'ZA-',
  'North Macedonia': 'Z3-',
  'Bosnia and Herzegovina': 'T9-',
  'Montenegro': '4O-',
  'Moldova': 'ER-',
  'Belarus': 'EW-',
  'Georgia': '4L-',
  'Armenia': 'EK-',
  'Azerbaijan': '4K-',
  'Kazakhstan': 'UP-',
  'Uzbekistan': 'UK-',
  'Turkmenistan': 'EZ-',
  'Kyrgyzstan': 'EX-',
  'Tajikistan': 'EY-',

  // Additional Africa & Middle East
  'Benin': 'TY-',
  'Burkina Faso': 'XT-',
  'Burundi': '9U-',
  'Cape Verde': 'D4-',
  'Central African Republic': 'TL-',
  'Chad': 'TT-',
  'Comoros': 'D6-',
  'Democratic Republic of the Congo': '9Q-',
  'Republic of the Congo': 'TN-',
  'Djibouti': 'J2-',
  'Equatorial Guinea': '3C-',
  'Eritrea': 'E3-',
  'Eswatini': '3D-',
  'Gabon': 'TR-',
  'Gambia': 'C5-',
  'Guinea': '3X-',
  'Guinea-Bissau': 'J5-',
  'Lesotho': '7P-',
  'Liberia': 'A8-',
  'Malawi': '7Q-',
  'Mali': 'TZ-',
  'Mauritania': '5T-',
  'Niger': '5U-',
  'Rwanda': '9XR-',
  'São Tomé and Principe': 'S9-',
  'Seychelles': 'S7-',
  'Sierra Leone': '9L-',
  'Somalia': '6O-',
  'South Sudan': 'Z8-',
  'Togo': '5V-',
  'Zambia': '9J-',
  'Afghanistan': 'YA-',
  'Syria': 'YK-',
  'Yemen': 'YI-',

  // Additional Asia-Pacific
  'Bhutan': 'A5-',
  'North Korea': 'P-',
  'Timor-Leste': '4W-',
  'Kiribati': 'T3-',
  'Marshall Islands': 'V7-',
  'Micronesia': 'V6-',
  'Nauru': 'C2-',
  'Palau': 'T8-',
  'Samoa': '5W-',
  'Solomon Islands': 'H4-',
  'Tonga': 'A3-',
  'Vanuatu': 'YJ-',

  // Additional Americas
  'Argentina': 'LV-',
  'Belize': 'V3-',
  'Bolivia': 'CP-',
  'Dominica': 'J7-',
  'Ecuador': 'HC-',
  'Grenada': 'J3-',
  'Guyana': '8R-',
  'Jamaica': '6Y-',
  'Panama': 'HP-',
  'Paraguay': 'ZP-',
  'Peru': 'OB-',
  'Saint Kitts and Nevis': 'V4-',
  'Saint Lucia': 'J6-',
  'Saint Vincent and the Grenadines': 'J8-',
  'Suriname': 'PZ-',
  'Uruguay': 'CX-',
  'Venezuela': 'YV-',
  'Kosovo': 'Z6-',
  'Antigua and Barbuda': 'V2-',

  // Territories — use parent country prefix
  'Puerto Rico': 'N-',
  'Guam': 'N-',
  'American Samoa': 'N-',
  'Northern Mariana Islands': 'N-',
  'U.S. Virgin Islands': 'N-',
  'United States Minor Outlying Islands': 'N-',
  'British Virgin Islands': 'VP-L',
  'Bermuda': 'VP-B',
  'Cayman Islands': 'VP-C',
  'Turks and Caicos Islands': 'VQ-T',
  'Falkland Islands': 'VP-F',
  'Gibraltar': 'VP-G',
  'Montserrat': 'VP-M',
  'Anguilla': 'VP-A',
  'Isle of Man': 'M-',
  'Jersey': 'ZJ-',
  'Guernsey': '2-',
  'Greenland': 'OY-',
  'Faroe Islands': 'OY-',
  'French Guiana': 'F-',
  'French Polynesia': 'F-O',
  'Guadeloupe': 'F-',
  'Martinique': 'F-',
  'Réunion': 'F-',
  'Mayotte': 'F-',
  'New Caledonia': 'F-O',
  'Saint Martin': 'F-',
  'Saint Barthélemy': 'F-',
  'Aruba': 'P4-',
  'Curaçao': 'PJ-',
  'Caribbean Netherlands': 'PJ-',
  'Sint Maarten': 'PJ-',
  'Norfolk Island': 'VH-',
  'Christmas Island': 'VH-',
  'Cocos (Keeling) Islands': 'VH-',
  'Cook Islands': 'ZK-',
  'Côte d\'Ivoire': 'TU-',
  'Hong Kong': 'B-H',
  'Antarctica': 'N-',
  'British Indian Ocean Territory': 'VQ-',
  'Western Sahara (disputed territory)': 'CN-',
  'Saint Pierre and Miquelon': 'F-',
  'Saint Helena, Ascension and Tristan da Cunha': 'VQ-',
  'Wallis and Futuna': 'F-',
  'Niue': 'ZK-',

  // Default fallback
  'default': 'N-'
};

/**
 * Registration validation rules by prefix
 * Defines the allowed suffix format for each country's aircraft registration
 * - length: exact length or [min, max] range for the suffix (after the prefix)
 * - pattern: regex pattern the suffix must match
 * - description: human-readable description of the format
 */
const REGISTRATION_RULES = {
  // North America
  'N-': { length: [1, 5], pattern: /^[0-9]+[A-Z]{0,2}$|^[0-9]+$/, description: '1-5 characters: numbers, optionally ending with 1-2 letters (e.g., N12345, N123AB)' },
  'C-': { length: 4, pattern: /^[A-Z]{4}$|^[FGI][A-Z]{3}$/, description: '4 letters (e.g., C-GABC)' },

  // United Kingdom & Ireland
  'G-': { length: 4, pattern: /^[A-Z]{4}$/, description: 'Exactly 4 letters (e.g., G-ABCD)' },
  'EI-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., EI-ABC)' },

  // Western Europe
  'D-': { length: 4, pattern: /^[A-Z]{4}$/, description: '4 letters (e.g., D-ABCD)' },
  'F-': { length: 4, pattern: /^[A-Z]{4}$/, description: '4 letters (e.g., F-ABCD)' },
  'I-': { length: 4, pattern: /^[A-Z]{4}$/, description: '4 letters (e.g., I-ABCD)' },
  'EC-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., EC-ABC)' },
  'PH-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., PH-ABC)' },
  'OO-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., OO-ABC)' },
  'HB-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., HB-ABC)' },
  'OE-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., OE-ABC)' },
  'LX-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., LX-ABC)' },

  // Scandinavia
  'SE-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., SE-ABC)' },
  'LN-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., LN-ABC)' },
  'OY-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., OY-ABC)' },
  'OH-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., OH-ABC)' },
  'TF-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., TF-ABC)' },

  // Eastern Europe
  'SP-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., SP-ABC)' },
  'OK-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., OK-ABC)' },
  'CS-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., CS-ABC)' },
  'SX-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., SX-ABC)' },
  'TC-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., TC-ABC)' },
  'RA-': { length: 5, pattern: /^[0-9]{5}$/, description: '5 digits (e.g., RA-12345)' },
  'UR-': { length: 5, pattern: /^[0-9]{5}$|^[A-Z]{3}$/, description: '5 digits or 3 letters (e.g., UR-12345)' },
  'YR-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., YR-ABC)' },
  'HA-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., HA-ABC)' },
  'LZ-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., LZ-ABC)' },
  'YU-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., YU-ABC)' },
  '9A-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 9A-ABC)' },
  'S5-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., S5-ABC)' },
  'OM-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., OM-ABC)' },

  // Asia-Pacific
  'B-': { length: 4, pattern: /^[0-9]{4}$|^[A-Z]{3}[0-9]$/, description: '4 digits or 3 letters + 1 digit (e.g., B-1234, B-ABC1)' },
  'B-H': { length: 2, pattern: /^[A-Z]{2}$/, description: '2 letters (e.g., B-HAB)' },
  'JA-': { length: 4, pattern: /^[0-9]{4}$|^[0-9]{3}[A-Z]$/, description: '4 digits or 3 digits + 1 letter (e.g., JA-1234)' },
  'HL-': { length: 4, pattern: /^[0-9]{4}$/, description: '4 digits (e.g., HL-1234)' },
  'VT-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., VT-ABC)' },
  'VH-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., VH-ABC)' },
  'ZK-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., ZK-ABC)' },
  '9V-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 9V-ABC)' },
  '9M-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 9M-ABC)' },
  'PK-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., PK-ABC)' },
  'HS-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., HS-ABC)' },
  'RP-': { length: 4, pattern: /^C[0-9]{4}$|^[0-9]{4}$/, description: '4 digits (e.g., RP-C1234)' },
  'VN-': { length: 4, pattern: /^[A-Z][0-9]{3}$/, description: '1 letter + 3 digits (e.g., VN-A123)' },
  'AP-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., AP-ABC)' },
  'S2-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., S2-ABC)' },
  '4R-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 4R-ABC)' },
  '9N-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 9N-ABC)' },

  // Middle East
  'HZ-': { length: 4, pattern: /^[A-Z]{4}$/, description: '4 letters (e.g., HZ-ABCD)' },
  'A6-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., A6-ABC)' },
  'A7-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., A7-ABC)' },
  '9K-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 9K-ABC)' },
  'A4O-': { length: 2, pattern: /^[A-Z]{2}$/, description: '2 letters (e.g., A4O-AB)' },
  'A9C-': { length: 2, pattern: /^[A-Z]{2}$/, description: '2 letters (e.g., A9C-AB)' },
  '4X-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 4X-ABC)' },
  'JY-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., JY-ABC)' },
  'OD-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., OD-ABC)' },
  'EP-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., EP-ABC)' },
  'YI-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., YI-ABC)' },
  'SU-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., SU-ABC)' },

  // Americas (non-US/Canada)
  'XA-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., XA-ABC)' },
  'PR-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., PR-ABC)' },
  'LV-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., LV-ABC)' },
  'CC-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., CC-ABC)' },
  'HK-': { length: 4, pattern: /^[0-9]{4}$/, description: '4 digits (e.g., HK-1234)' },
  'OB-': { length: 4, pattern: /^[0-9]{4}$/, description: '4 digits (e.g., OB-1234)' },
  'YV-': { length: 4, pattern: /^[0-9]{4}$/, description: '4 digits (e.g., YV-1234)' },
  'HC-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., HC-ABC)' },
  'CP-': { length: 4, pattern: /^[0-9]{4}$/, description: '4 digits (e.g., CP-1234)' },
  'ZP-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., ZP-ABC)' },
  'CX-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., CX-ABC)' },
  'TI-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., TI-ABC)' },
  'HP-': { length: 4, pattern: /^[0-9]{4}$/, description: '4 digits (e.g., HP-1234)' },
  'CU-': { length: 4, pattern: /^[A-Z][0-9]{4}$/, description: '1 letter + 4 digits (e.g., CU-T1234)' },
  '6Y-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 6Y-ABC)' },

  // Africa
  'ZS-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., ZS-ABC)' },
  '5N-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 5N-ABC)' },
  '5Y-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 5Y-ABC)' },
  'ET-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., ET-ABC)' },
  'CN-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., CN-ABC)' },
  '7T-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 7T-ABC)' },
  'TS-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., TS-ABC)' },
  '9G-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 9G-ABC)' },
  '5H-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 5H-ABC)' },
  '5X-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 5X-ABC)' },
  'Z-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., Z-ABC)' },
  'D2-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., D2-ABC)' },
  'C9-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., C9-ABC)' },

  // Additional Africa
  '6V-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 6V-ABC)' },
  'TJ-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., TJ-ABC)' },
  'TU-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., TU-ABC)' },
  '5R-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 5R-ABC)' },
  '5A-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 5A-ABC)' },
  'ST-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., ST-ABC)' },
  'V5-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., V5-ABC)' },
  'A2-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., A2-ABC)' },
  '3B-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 3B-ABC)' },

  // Additional Southeast Asia & Pacific
  'XY-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., XY-ABC)' },
  'XU-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., XU-ABC)' },
  'RDPL-': { length: 5, pattern: /^[0-9]{5}$/, description: '5 digits (e.g., RDPL-34567)' },
  'JU-': { length: 4, pattern: /^[0-9]{4}$/, description: '4 digits (e.g., JU-1234)' },
  'DQ-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., DQ-ABC)' },
  'P2-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., P2-ABC)' },
  'V8-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., V8-ABC)' },
  '8Q-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 8Q-ABC)' },
  'B-M': { length: 2, pattern: /^[A-Z]{2}$/, description: '2 letters (e.g., B-MAB)' },

  // Additional Caribbean & Central America
  '9Y-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 9Y-ABC)' },
  'C6-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., C6-ABC)' },
  '8P-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 8P-ABC)' },
  'HI-': { length: 4, pattern: /^[0-9]{4}$/, description: '4 digits (e.g., HI-1234)' },
  'TG-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., TG-ABC)' },
  'HR-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., HR-ABC)' },
  'YS-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., YS-ABC)' },
  'YN-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., YN-ABC)' },
  'HH-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., HH-ABC)' },
  'VP-B': { length: 2, pattern: /^[A-Z]{2}$/, description: '2 letters (e.g., VP-BAB)' },
  'VP-C': { length: 2, pattern: /^[A-Z]{2}$/, description: '2 letters (e.g., VP-CAB)' },

  // Additional Europe & Central Asia
  'ES-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., ES-ABC)' },
  'YL-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., YL-ABC)' },
  'LY-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., LY-ABC)' },
  '9H-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 9H-ABC)' },
  '5B-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 5B-ABC)' },
  'ZA-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., ZA-ABC)' },
  'Z3-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., Z3-ABC)' },
  'T9-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., T9-ABC)' },
  '4O-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 4O-ABC)' },
  'ER-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., ER-ABC)' },
  'EW-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., EW-ABC)' },
  '4L-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., 4L-ABC)' },
  'EK-': { length: 5, pattern: /^[0-9]{5}$/, description: '5 digits (e.g., EK-12345)' },
  '4K-': { length: 5, pattern: /^[0-9]{5}$/, description: '5 digits (e.g., 4K-12345)' },
  'UP-': { length: 5, pattern: /^[A-Z][0-9]{4}$/, description: '1 letter then 4 digits (e.g., UP-A1234)' },
  'UK-': { length: 5, pattern: /^[0-9]{5}$/, description: '5 digits (e.g., UK-12345)' },
  'EZ-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters (e.g., EZ-ABC)' },
  'EX-': { length: 5, pattern: /^[0-9]{5}$/, description: '5 digits (e.g., EX-12345)' },
  'EY-': { length: 5, pattern: /^[0-9]{5}$/, description: '5 digits (e.g., EY-12345)' },

  // Additional countries (3-letter suffix unless otherwise noted)
  'TY-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'XT-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '9U-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'D4-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'TL-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'TT-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'D6-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '9Q-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'TN-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'J2-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '3C-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'E3-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '3D-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'TR-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'C5-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '3X-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'J5-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '7P-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'A8-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '7Q-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'TZ-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '5T-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '5U-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '9XR-': { length: 2, pattern: /^[A-Z]{2}$/, description: '2 letters' },
  'S9-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'S7-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '9L-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '6O-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'Z8-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '5V-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '9J-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'YA-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'YK-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'A5-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'P-': { length: 4, pattern: /^[0-9]{4}$/, description: '4 digits' },
  '4W-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'T3-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'V7-': { length: 4, pattern: /^[0-9]{4}$/, description: '4 digits' },
  'V6-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'C2-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'T8-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '5W-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'H4-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'A3-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'YJ-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'V3-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'J7-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'J3-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '8R-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'J6-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'J8-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'PZ-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'V4-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'Z6-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'P4-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'PJ-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'M-': { length: 4, pattern: /^[A-Z]{4}$/, description: '4 letters' },
  'ZJ-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  '2-': { length: 4, pattern: /^[A-Z]{4}$/, description: '4 letters' },
  'VP-L': { length: 2, pattern: /^[A-Z]{2}$/, description: '2 letters' },
  'VP-F': { length: 2, pattern: /^[A-Z]{2}$/, description: '2 letters' },
  'VP-G': { length: 2, pattern: /^[A-Z]{2}$/, description: '2 letters' },
  'VP-M': { length: 2, pattern: /^[A-Z]{2}$/, description: '2 letters' },
  'VP-A': { length: 2, pattern: /^[A-Z]{2}$/, description: '2 letters' },
  'VQ-T': { length: 2, pattern: /^[A-Z]{2}$/, description: '2 letters' },
  'VQ-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'F-O': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },
  'V2-': { length: 3, pattern: /^[A-Z]{3}$/, description: '3 letters' },

  // Default fallback - permissive
  'default': { length: [1, 5], pattern: /^[A-Z0-9]+$/, description: '1-5 alphanumeric characters' }
};

/**
 * Get the ICAO registration prefix for a given country
 * @param {string} country - Country name
 * @returns {string} - ICAO registration prefix (e.g., 'G-', 'N-')
 */
function getRegistrationPrefix(country) {
  if (!country) {
    return REGISTRATION_PREFIXES.default;
  }

  return REGISTRATION_PREFIXES[country] || REGISTRATION_PREFIXES.default;
}

/**
 * Validate a registration with its country prefix
 * @param {string} registration - Full registration string
 * @param {string} prefix - Expected prefix
 * @returns {boolean} - Whether the registration starts with the correct prefix
 */
function validateRegistrationPrefix(registration, prefix) {
  if (!registration || !prefix) {
    return false;
  }

  return registration.toUpperCase().startsWith(prefix.toUpperCase());
}

/**
 * Check if a specific rule exists for a prefix (not using default)
 * @param {string} prefix - Registration prefix (e.g., 'G-', 'N-')
 * @returns {boolean} - True if a specific rule exists
 */
function hasSpecificRule(prefix) {
  return prefix && REGISTRATION_RULES.hasOwnProperty(prefix) && prefix !== 'default';
}

/**
 * Get validation rules for a given prefix
 * @param {string} prefix - Registration prefix (e.g., 'G-', 'N-')
 * @returns {object} - Validation rules for the prefix
 */
function getRegistrationRules(prefix) {
  if (!prefix) {
    return REGISTRATION_RULES.default;
  }

  return REGISTRATION_RULES[prefix] || REGISTRATION_RULES.default;
}

/**
 * Validate a registration suffix against country-specific rules
 * @param {string} suffix - The suffix part of the registration (after the prefix)
 * @param {string} prefix - The registration prefix (e.g., 'G-', 'N-')
 * @param {boolean} strict - If false, skip validation for unknown prefixes (default: true)
 * @returns {object} - { valid: boolean, message: string, isCustom: boolean }
 */
function validateRegistrationSuffix(suffix, prefix, strict = true) {
  if (!suffix || suffix.trim().length === 0) {
    return { valid: false, message: 'Please enter a registration suffix' };
  }

  const trimmedSuffix = suffix.trim().toUpperCase();

  // If no specific rule exists for this prefix, allow any valid format
  if (!hasSpecificRule(prefix)) {
    // Basic validation only - alphanumeric, 1-6 characters
    if (trimmedSuffix.length < 1 || trimmedSuffix.length > 6) {
      return {
        valid: false,
        message: 'Suffix must be 1-6 characters'
      };
    }
    if (!/^[A-Z0-9]+$/.test(trimmedSuffix)) {
      return {
        valid: false,
        message: 'Suffix can only contain letters and numbers'
      };
    }
    return { valid: true, value: trimmedSuffix, isCustom: true };
  }

  const rules = getRegistrationRules(prefix);

  // Check length
  if (Array.isArray(rules.length)) {
    const [minLen, maxLen] = rules.length;
    if (trimmedSuffix.length < minLen || trimmedSuffix.length > maxLen) {
      return {
        valid: false,
        message: `Suffix must be ${minLen}-${maxLen} characters for ${prefix} registrations`
      };
    }
  } else {
    if (trimmedSuffix.length !== rules.length) {
      return {
        valid: false,
        message: `Suffix must be exactly ${rules.length} characters for ${prefix} registrations`
      };
    }
  }

  // Check pattern
  if (!rules.pattern.test(trimmedSuffix)) {
    return {
      valid: false,
      message: rules.description
    };
  }

  return { valid: true, value: trimmedSuffix, isCustom: false };
}

/**
 * Get expected suffix length for display purposes
 * @param {string} prefix - Registration prefix
 * @returns {number} - Expected length (or max length if range)
 */
function getExpectedSuffixLength(prefix) {
  // For unknown prefixes, allow up to 6 characters
  if (!hasSpecificRule(prefix)) {
    return 6;
  }
  const rules = getRegistrationRules(prefix);
  if (Array.isArray(rules.length)) {
    return rules.length[1]; // Return max length
  }
  return rules.length;
}

/**
 * Get placeholder text for suffix input based on prefix
 * @param {string} prefix - Registration prefix
 * @returns {string} - Placeholder text
 */
function getSuffixPlaceholder(prefix) {
  // For unknown prefixes, show generic placeholder
  if (!hasSpecificRule(prefix)) {
    return 'ABC123';
  }

  const rules = getRegistrationRules(prefix);

  // Generate example based on pattern
  if (prefix === 'N-') return '12345';
  if (prefix === 'G-') return 'ABCD';
  if (prefix === 'RA-') return '12345';
  if (prefix === 'B-') return '1234';
  if (prefix === 'JA-') return '1234';
  if (prefix === 'HL-') return '1234';

  // Default based on length
  const len = Array.isArray(rules.length) ? rules.length[1] : rules.length;

  // Check if pattern expects numbers or letters
  if (rules.pattern.toString().includes('[0-9]') && !rules.pattern.toString().includes('[A-Z]')) {
    return '1'.repeat(len);
  }

  return 'A'.repeat(len);
}

/**
 * Get hint/description text for the registration input
 * @param {string} prefix - Registration prefix
 * @param {string} country - Country name (optional, for display)
 * @returns {string} - Hint text
 */
function getRegistrationHint(prefix, country) {
  if (!hasSpecificRule(prefix)) {
    return `Custom format allowed for ${country || 'your country'} (1-6 alphanumeric characters)`;
  }
  return getRegistrationRules(prefix).description;
}

// Expose functions globally
if (typeof window !== 'undefined') {
  window.getRegistrationPrefix = getRegistrationPrefix;
  window.validateRegistrationPrefix = validateRegistrationPrefix;
  window.validateRegistrationSuffix = validateRegistrationSuffix;
  window.getRegistrationRules = getRegistrationRules;
  window.hasSpecificRule = hasSpecificRule;
  window.getExpectedSuffixLength = getExpectedSuffixLength;
  window.getSuffixPlaceholder = getSuffixPlaceholder;
  window.getRegistrationHint = getRegistrationHint;
  window.REGISTRATION_PREFIXES = REGISTRATION_PREFIXES;
  window.REGISTRATION_RULES = REGISTRATION_RULES;
}

// Export for Node.js/backend use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    REGISTRATION_PREFIXES,
    REGISTRATION_RULES,
    getRegistrationPrefix,
    validateRegistrationPrefix,
    validateRegistrationSuffix,
    getRegistrationRules,
    hasSpecificRule,
    getExpectedSuffixLength,
    getSuffixPlaceholder,
    getRegistrationHint
  };
}
