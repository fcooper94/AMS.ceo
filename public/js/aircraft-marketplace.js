let allAircraft = [];
let currentCategory = '';

// Sample aircraft data - in a real implementation, this would come from an API
const sampleAircraftData = [
  // Used aircraft
  {
    id: 'a1',
    model: 'Boeing 737-800',
    manufacturer: 'Boeing',
    type: 'Narrowbody',
    range: '3000nm',
    age: 8,
    condition: 'Good',
    price: 45000000,
    leasePrice: 350000,
    capacity: 162,
    fuelConsumption: 2.8,
    category: 'used',
    description: 'Well-maintained aircraft with recent maintenance checks.',
    image: 'https://images.unsplash.com/photo-1530521954602-af862a62eca0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Boeing 737
  },
  {
    id: 'a21',
    model: 'Boeing 737-800',
    manufacturer: 'Boeing',
    type: 'Narrowbody',
    range: '3000nm',
    age: 5,
    condition: 'Excellent',
    price: 52000000,
    leasePrice: 420000,
    capacity: 162,
    fuelConsumption: 2.8,
    category: 'used',
    description: 'Low-hour example with excellent maintenance history.',
    image: 'https://images.unsplash.com/photo-1530521954602-af862a62eca0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Boeing 737
  },
  {
    id: 'a22',
    model: 'Boeing 737-800',
    manufacturer: 'Boeing',
    type: 'Narrowbody',
    range: '3000nm',
    age: 12,
    condition: 'Fair',
    price: 38000000,
    leasePrice: 300000,
    capacity: 162,
    fuelConsumption: 2.8,
    category: 'used',
    description: 'High-utilization aircraft with good structural integrity.',
    image: 'https://images.unsplash.com/photo-1530521954602-af862a62eca0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Boeing 737
  },
  {
    id: 'a2',
    model: 'Airbus A320-200',
    manufacturer: 'Airbus',
    type: 'Narrowbody',
    range: '3300nm',
    age: 12,
    condition: 'Fair',
    price: 32000000,
    leasePrice: 280000,
    capacity: 150,
    fuelConsumption: 2.9,
    category: 'used',
    description: 'Solid aircraft with good remaining life expectancy.',
    image: 'https://images.unsplash.com/photo-1546662244-524b69c0c6e5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Airbus A320
  },
  {
    id: 'a23',
    model: 'Airbus A320-200',
    manufacturer: 'Airbus',
    type: 'Narrowbody',
    range: '3300nm',
    age: 7,
    condition: 'Good',
    price: 38000000,
    leasePrice: 320000,
    capacity: 150,
    fuelConsumption: 2.9,
    category: 'used',
    description: 'Mid-life aircraft with updated avionics.',
    image: 'https://images.unsplash.com/photo-1546662244-524b69c0c6e5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Airbus A320
  },
  {
    id: 'a3',
    model: 'Embraer E195',
    manufacturer: 'Embraer',
    type: 'Regional',
    range: '2380nm',
    age: 5,
    condition: 'Excellent',
    price: 28000000,
    leasePrice: 220000,
    capacity: 120,
    fuelConsumption: 2.5,
    category: 'used',
    description: 'Nearly new regional jet with minimal wear.',
    image: 'https://images.unsplash.com/photo-1594831217262-94e04f0f0f0f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Embraer aircraft
  },
  {
    id: 'a8',
    model: 'Boeing 767-300ER',
    manufacturer: 'Boeing',
    type: 'Widebody',
    range: '6560nm',
    age: 15,
    condition: 'Good',
    price: 35000000,
    leasePrice: 380000,
    capacity: 245,
    fuelConsumption: 3.2,
    category: 'used',
    description: 'Reliable widebody for long-haul operations.',
    image: 'https://images.unsplash.com/photo-1535768526360-86d5d206a04b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Boeing 767
  },
  {
    id: 'a24',
    model: 'Boeing 767-300ER',
    manufacturer: 'Boeing',
    type: 'Widebody',
    range: '6560nm',
    age: 10,
    condition: 'Very Good',
    price: 48000000,
    leasePrice: 450000,
    capacity: 245,
    fuelConsumption: 3.2,
    category: 'used',
    description: 'Well-maintained widebody with updated engines.',
    image: 'https://images.unsplash.com/photo-1535768526360-86d5d206a04b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Boeing 767
  },
  {
    id: 'a9',
    model: 'Airbus A330-200',
    manufacturer: 'Airbus',
    type: 'Widebody',
    range: '7250nm',
    age: 10,
    condition: 'Very Good',
    price: 75000000,
    leasePrice: 650000,
    capacity: 253,
    fuelConsumption: 2.7,
    category: 'used',
    description: 'Efficient twin-aisle aircraft for international routes.',
    image: 'https://images.unsplash.com/photo-1594831217262-94e04f0f0f0f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Airbus A330
  },
  {
    id: 'a10',
    model: 'Bombardier CRJ900',
    manufacturer: 'Bombardier',
    type: 'Regional',
    range: '1500nm',
    age: 7,
    condition: 'Good',
    price: 18000000,
    leasePrice: 150000,
    capacity: 90,
    fuelConsumption: 2.2,
    category: 'used',
    description: 'Popular regional jet for short-haul routes.',
    image: 'https://images.unsplash.com/photo-1594831217262-94e04f0f0f0f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Regional jet
  },
  {
    id: 'a11',
    model: 'Boeing 757-200',
    manufacturer: 'Boeing',
    type: 'Narrowbody',
    range: '3900nm',
    age: 20,
    condition: 'Fair',
    price: 25000000,
    leasePrice: 250000,
    capacity: 239,
    fuelConsumption: 3.0,
    category: 'used',
    description: 'Classic narrowbody for medium to long-haul routes.',
    image: 'https://images.unsplash.com/photo-1535768526360-86d5d206a04b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Boeing 757
  },
  {
    id: 'a12',
    model: 'Airbus A319',
    manufacturer: 'Airbus',
    type: 'Narrowbody',
    range: '3750nm',
    age: 14,
    condition: 'Good',
    price: 22000000,
    leasePrice: 190000,
    capacity: 124,
    fuelConsumption: 2.8,
    category: 'used',
    description: 'Compact member of the A320 family.',
    image: 'https://images.unsplash.com/photo-1546662244-524b69c0c6e5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Airbus A319
  },
  {
    id: 'a13',
    model: 'ATR 42-600',
    manufacturer: 'ATR',
    type: 'Regional',
    range: '1000nm',
    age: 3,
    condition: 'Excellent',
    price: 15000000,
    leasePrice: 120000,
    capacity: 50,
    fuelConsumption: 1.7,
    category: 'used',
    description: 'Modern turboprop for short regional routes.',
    image: 'https://images.unsplash.com/photo-1594831217262-94e04f0f0f0f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // ATR aircraft
  },
  {
    id: 'a14',
    model: 'McDonnell Douglas MD-80',
    manufacturer: 'McDonnell Douglas',
    type: 'Narrowbody',
    range: '2400nm',
    age: 25,
    condition: 'Fair',
    price: 8000000,
    leasePrice: 90000,
    capacity: 135,
    fuelConsumption: 3.5,
    category: 'used',
    description: 'Classic twin-engine aircraft, economical for short routes.',
    image: 'https://images.unsplash.com/photo-1535768526360-86d5d206a04b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // MD-80
  },
  // New aircraft
  {
    id: 'a4',
    model: 'Boeing 787-9 Dreamliner',
    manufacturer: 'Boeing',
    type: 'Widebody',
    range: '7635nm',
    age: 0,
    condition: 'New',
    price: 280000000,
    leasePrice: 1800000,
    capacity: 290,
    fuelConsumption: 2.1,
    category: 'new',
    description: 'Latest technology widebody aircraft with superior fuel efficiency.',
    image: 'https://images.unsplash.com/photo-1530521954602-af862a62eca0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Boeing 787
  },
  {
    id: 'a5',
    model: 'Airbus A350-900',
    manufacturer: 'Airbus',
    type: 'Widebody',
    range: '8100nm',
    age: 0,
    condition: 'New',
    price: 312000000,
    leasePrice: 2000000,
    capacity: 314,
    fuelConsumption: 2.0,
    category: 'new',
    description: 'State-of-the-art widebody with advanced materials and systems.',
    image: 'https://images.unsplash.com/photo-1546662244-524b69c0c6e5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Airbus A350
  },
  {
    id: 'a6',
    model: 'Boeing 737 MAX 8',
    manufacturer: 'Boeing',
    type: 'Narrowbody',
    range: '3550nm',
    age: 0,
    condition: 'New',
    price: 120000000,
    leasePrice: 750000,
    capacity: 178,
    fuelConsumption: 2.3,
    category: 'new',
    description: 'Next-generation narrowbody with improved fuel efficiency.',
    image: 'https://images.unsplash.com/photo-1530521954602-af862a62eca0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Boeing 737 MAX
  },
  {
    id: 'a25',
    model: 'Boeing 737 MAX 8',
    manufacturer: 'Boeing',
    type: 'Narrowbody',
    range: '3550nm',
    age: 0,
    condition: 'New',
    price: 125000000,
    leasePrice: 780000,
    capacity: 178,
    fuelConsumption: 2.3,
    category: 'new',
    description: 'Next-generation narrowbody with Sky Interior.',
    image: 'https://images.unsplash.com/photo-1530521954602-af862a62eca0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Boeing 737 MAX
  },
  {
    id: 'a7',
    model: 'ATR 72-600',
    manufacturer: 'ATR',
    type: 'Regional',
    range: '950nm',
    age: 0,
    condition: 'New',
    price: 22000000,
    leasePrice: 160000,
    capacity: 78,
    fuelConsumption: 1.8,
    category: 'new',
    description: 'Efficient turboprop for short-haul regional operations.',
    image: 'https://images.unsplash.com/photo-1594831217262-94e04f0f0f0f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // ATR 72
  },
  {
    id: 'a15',
    model: 'Airbus A220-300',
    manufacturer: 'Airbus',
    type: 'Narrowbody',
    range: '3200nm',
    age: 0,
    condition: 'New',
    price: 89000000,
    leasePrice: 580000,
    capacity: 160,
    fuelConsumption: 2.0,
    category: 'new',
    description: 'Advanced narrowbody with exceptional fuel efficiency.',
    image: 'https://images.unsplash.com/photo-1546662244-524b69c0c6e5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Airbus A220
  },
  {
    id: 'a16',
    model: 'Boeing 777X-9',
    manufacturer: 'Boeing',
    type: 'Widebody',
    range: '8200nm',
    age: 0,
    condition: 'New',
    price: 442000000,
    leasePrice: 2800000,
    capacity: 407,
    fuelConsumption: 1.9,
    category: 'new',
    description: 'The most advanced widebody aircraft with folding wingtips.',
    image: 'https://images.unsplash.com/photo-1535768526360-86d5d206a04b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Boeing 777X
  },
  {
    id: 'a17',
    model: 'Embraer E175-E2',
    manufacturer: 'Embraer',
    type: 'Regional',
    range: '2400nm',
    age: 0,
    condition: 'New',
    price: 45000000,
    leasePrice: 290000,
    capacity: 90,
    fuelConsumption: 1.9,
    category: 'new',
    description: 'Next-generation regional jet with improved efficiency.',
    image: 'https://images.unsplash.com/photo-1594831217262-94e04f0f0f0f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Embraer E2
  },
  {
    id: 'a18',
    model: 'Bombardier Global 7500',
    manufacturer: 'Bombardier',
    type: 'Business',
    range: '7400nm',
    age: 0,
    condition: 'New',
    price: 75000000,
    leasePrice: 500000,
    capacity: 19,
    fuelConsumption: 1.2,
    category: 'new',
    description: 'Ultra-long-range business jet for VIP operations.',
    image: 'https://images.unsplash.com/photo-1535768526360-86d5d206a04b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Business jet
  },
  {
    id: 'a19',
    model: 'Airbus A380-800',
    manufacturer: 'Airbus',
    type: 'Widebody',
    range: '8200nm',
    age: 0,
    condition: 'New',
    price: 445000000,
    leasePrice: 3200000,
    capacity: 525,
    fuelConsumption: 2.5,
    category: 'new',
    description: 'The largest passenger airliner ever built.',
    image: 'https://images.unsplash.com/photo-1546662244-524b69c0c6e5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Airbus A380
  },
  {
    id: 'a20',
    model: 'Boeing 747-8 Intercontinental',
    manufacturer: 'Boeing',
    type: 'Widebody',
    range: '8000nm',
    age: 0,
    condition: 'New',
    price: 375000000,
    leasePrice: 2500000,
    capacity: 467,
    fuelConsumption: 2.4,
    category: 'new',
    description: 'The newest member of the iconic 747 family.',
    image: 'https://images.unsplash.com/photo-1530521954602-af862a62eca0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Boeing 747-8
  },
  {
    id: 'a26',
    model: 'Airbus A321neo',
    manufacturer: 'Airbus',
    type: 'Narrowbody',
    range: '3700nm',
    age: 0,
    condition: 'New',
    price: 135000000,
    leasePrice: 850000,
    capacity: 244,
    fuelConsumption: 2.2,
    category: 'new',
    description: 'Extended range and higher capacity variant of the A320 family.',
    image: 'https://images.unsplash.com/photo-1546662244-524b69c0c6e5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Airbus A321
  },
  {
    id: 'a27',
    model: 'Boeing 737-900ER',
    manufacturer: 'Boeing',
    type: 'Narrowbody',
    range: '3200nm',
    age: 10,
    condition: 'Good',
    price: 65000000,
    leasePrice: 500000,
    capacity: 215,
    fuelConsumption: 2.7,
    category: 'used',
    description: 'Extended range variant with increased capacity.',
    image: 'https://images.unsplash.com/photo-1530521954602-af862a62eca0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' // Boeing 737-900
  }
];

// Load aircraft based on category
async function loadAircraft() {
  try {
    // Get category from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentCategory = urlParams.get('category') || 'used';
    
    // Update page title and subtitle based on category
    const titleElement = document.getElementById('marketplaceTitle');
    const subtitleElement = document.getElementById('marketplaceSubtitle');
    
    if (currentCategory === 'new') {
      titleElement.textContent = 'NEW AIRCRAFT FROM MANUFACTURER';
      subtitleElement.textContent = 'PURCHASE BRAND NEW AIRCRAFT';
    } else {
      titleElement.textContent = 'USED AIRCRAFT MARKET';
      subtitleElement.textContent = 'BROWSE PREVIOUSLY OWNED AIRCRAFT';
    }
    
    // Filter aircraft by category
    allAircraft = sampleAircraftData.filter(aircraft => 
      aircraft.category === currentCategory
    );
    
    displayAircraft(allAircraft);
  } catch (error) {
    console.error('Error loading aircraft:', error);
    document.getElementById('aircraftGrid').innerHTML = `
      <div class="empty-message">Error loading aircraft inventory</div>
    `;
  }
}

// Display aircraft in list format
function displayAircraft(aircraftArray) {
  const grid = document.getElementById('aircraftGrid');

  if (aircraftArray.length === 0) {
    grid.innerHTML = `
      <div class="empty-message">No aircraft found matching your criteria</div>
    `;
    return;
  }

  // Group aircraft by manufacturer first, then by model within each manufacturer
  const groupedAircraft = {};
  aircraftArray.forEach(aircraft => {
    if (!groupedAircraft[aircraft.manufacturer]) {
      groupedAircraft[aircraft.manufacturer] = {};
    }

    if (!groupedAircraft[aircraft.manufacturer][aircraft.model]) {
      groupedAircraft[aircraft.manufacturer][aircraft.model] = [];
    }

    groupedAircraft[aircraft.manufacturer][aircraft.model].push(aircraft);
  });

  // Convert condition to percentage
  function conditionToPercentage(condition) {
    switch(condition) {
      case 'New': return 100;
      case 'Excellent': return 90;
      case 'Very Good': return 80;
      case 'Good': return 70;
      case 'Fair': return 60;
      case 'Poor': return 40;
      default: return 50; // default value
    }
  }

  // Generate HTML for each manufacturer and model group
  let tableRows = '';
  for (const [manufacturer, models] of Object.entries(groupedAircraft)) {
    // Add manufacturer header
    tableRows += `
      <tr style="background: var(--surface-elevated);">
        <td colspan="9" style="padding: 1rem 1rem 0.5rem; font-weight: bold; color: var(--accent-color); border-top: 2px solid var(--border-color);">
          ${manufacturer} AIRCRAFT
        </td>
      </tr>
    `;

    // Add each model as a subcategory under the manufacturer
    for (const [model, aircraftList] of Object.entries(models)) {
      // Add model subheader
      tableRows += `
        <tr style="background: var(--surface);">
          <td colspan="9" style="padding: 0.75rem 2rem; font-weight: 600; color: var(--text-primary); border-left: 3px solid var(--accent-color);">
            ${model}
          </td>
        </tr>
        <tr style="background: var(--surface); border-bottom: 1px solid var(--border-color);">
          <th style="padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">MODEL</th>
          <th style="padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">TYPE</th>
          <th style="padding: 0.75rem 1rem; text-align: center; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">CAPACITY</th>
          <th style="padding: 0.75rem 1rem; text-align: center; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">RANGE</th>
          <th style="padding: 0.75rem 1rem; text-align: center; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">AGE</th>
          <th style="padding: 0.75rem 1rem; text-align: center; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">CONDITION</th>
          <th style="padding: 0.75rem 1rem; text-align: center; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">PURCHASE PRICE</th>
          <th style="padding: 0.75rem 1rem; text-align: center; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">LEASE PRICE/MONTH</th>
          <th style="padding: 0.75rem 1rem; text-align: center; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">ACTION</th>
        </tr>
      `;

      // Add aircraft rows for this model
      tableRows += aircraftList.map(aircraft => {
        return `
          <tr style="border-bottom: 1px solid var(--border-color); cursor: pointer;" onclick="showAircraftDetails('${aircraft.id}')">
            <td style="padding: 1rem;">
              <div>
                <div style="font-weight: 600; color: var(--text-primary);">${aircraft.model}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${aircraft.manufacturer} ${aircraft.model}</div>
              </div>
            </td>
            <td style="padding: 1rem; color: var(--text-secondary);">${aircraft.type}</td>
            <td style="padding: 1rem; text-align: center; color: var(--text-primary);">${aircraft.capacity} pax</td>
            <td style="padding: 1rem; text-align: center; color: var(--text-primary);">${aircraft.range}</td>
            <td style="padding: 1rem; text-align: center; color: var(--text-primary);">${aircraft.age} years</td>
            <td style="padding: 1rem; text-align: center;">
              <span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; display: inline-block; min-width: 60px; text-align: center; ${
                conditionToPercentage(aircraft.condition) >= 90 ? 'background: var(--success-color); color: white;' :
                conditionToPercentage(aircraft.condition) >= 70 ? 'background: #10b981; color: white;' :
                conditionToPercentage(aircraft.condition) >= 50 ? 'background: #60a5fa; color: white;' :
                'background: var(--warning-color); color: white;'
              }">${conditionToPercentage(aircraft.condition)}%</span>
            </td>
            <td style="padding: 1rem; text-align: center; font-weight: 600; color: var(--success-color);">$${formatCurrency(aircraft.price)}</td>
            <td style="padding: 1rem; text-align: center; font-weight: 600; color: var(--accent-color);">$${formatCurrency(aircraft.leasePrice)}/mo</td>
            <td style="padding: 1rem; text-align: center;">
              <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.8rem;" onclick="event.stopPropagation(); showAircraftDetails('${aircraft.id}')">View Details</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  grid.innerHTML = `
    <table style="width: 100%; border-collapse: collapse;">
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}

// Format currency for display
function formatCurrency(amount) {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

// Search aircraft
function searchAircraft() {
  const searchTerm = document.getElementById('searchAircraftInput').value.toLowerCase();
  
  if (!searchTerm) {
    displayAircraft(allAircraft);
    return;
  }
  
  const filteredAircraft = allAircraft.filter(aircraft => 
    aircraft.model.toLowerCase().includes(searchTerm) ||
    aircraft.manufacturer.toLowerCase().includes(searchTerm) ||
    aircraft.type.toLowerCase().includes(searchTerm) ||
    aircraft.description.toLowerCase().includes(searchTerm)
  );
  
  displayAircraft(filteredAircraft);
}

// Filter aircraft by multiple criteria
function filterAircraft() {
  const manufacturer = document.getElementById('manufacturerFilter').value;
  const type = document.getElementById('typeFilter').value;
  const range = document.getElementById('rangeFilter').value;
  
  let filteredAircraft = [...allAircraft];
  
  if (manufacturer) {
    filteredAircraft = filteredAircraft.filter(aircraft => 
      aircraft.manufacturer === manufacturer
    );
  }
  
  if (type) {
    filteredAircraft = filteredAircraft.filter(aircraft => 
      aircraft.type === type
    );
  }
  
  if (range) {
    filteredAircraft = filteredAircraft.filter(aircraft => 
      aircraft.range === range
    );
  }
  
  displayAircraft(filteredAircraft);
}

// Show aircraft details in modal
function showAircraftDetails(aircraftId) {
  const aircraft = allAircraft.find(a => a.id === aircraftId);
  
  if (!aircraft) return;
  
  const detailContent = document.getElementById('aircraftDetailContent');
  detailContent.innerHTML = `
    <div style="display: flex; gap: 2rem; align-items: flex-start;">
      <div style="flex: 1;">
        <h3 style="color: var(--text-primary); margin-bottom: 1rem;">${aircraft.manufacturer} ${aircraft.model}</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
          <div class="info-row">
            <span class="info-label">Type</span>
            <span class="info-value">${aircraft.type}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Range</span>
            <span class="info-value">${aircraft.range}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Capacity</span>
            <span class="info-value">${aircraft.capacity} passengers</span>
          </div>
          <div class="info-row">
            <span class="info-label">Fuel Efficiency</span>
            <span class="info-value">${aircraft.fuelConsumption} gal/pax/100nm</span>
          </div>
          <div class="info-row">
            <span class="info-label">Age</span>
            <span class="info-value">${aircraft.age} years</span>
          </div>
          <div class="info-row">
            <span class="info-label">Condition</span>
            <span class="info-value">${aircraft.condition}</span>
          </div>
          <div class="info-row" style="grid-column: span 2;">
            <span class="info-label">Purchase Price</span>
            <span class="info-value" style="font-weight: bold; color: var(--success-color); font-size: 1.2rem;">$${formatCurrency(aircraft.price)}</span>
          </div>
          <div class="info-row" style="grid-column: span 2;">
            <span class="info-label">Lease Price/Month</span>
            <span class="info-value" style="font-weight: bold; color: var(--accent-color); font-size: 1.2rem;">$${formatCurrency(aircraft.leasePrice)}/mo</span>
          </div>
        </div>
        <div style="margin-bottom: 1.5rem;">
          <h4 style="color: var(--text-primary); margin-bottom: 0.5rem;">Description</h4>
          <p style="color: var(--text-secondary);">${aircraft.description}</p>
        </div>
      </div>
      <div style="flex: 1; text-align: center;">
        <div style="background: var(--surface-elevated); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; height: 100%;">
          <img src="${aircraft.image || '/images/default-aircraft.jpg'}" alt="${aircraft.model}" 
               style="width: 100%; height: 200px; object-fit: contain; border-radius: 4px; margin-bottom: 1rem;">
          <div style="text-align: left;">
            <h4 style="color: var(--text-primary); margin-bottom: 0.5rem;">Specifications</h4>
            <ul style="color: var(--text-secondary); list-style-type: none; padding-left: 0;">
              <li>• Max Range: ${aircraft.range}</li>
              <li>• Engines: Turbofan</li>
              <li>• Wing Configuration: High-wing</li>
              <li>• Year Introduced: ${2023 - aircraft.age}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Store selected aircraft ID for purchase
  document.getElementById('purchaseAircraftBtn').dataset.aircraftId = aircraftId;
  
  document.getElementById('aircraftDetailModal').style.display = 'flex';
}

// Close aircraft detail modal
function closeAircraftDetailModal() {
  document.getElementById('aircraftDetailModal').style.display = 'none';
}

// Purchase aircraft
async function purchaseAircraft() {
  const aircraftId = document.getElementById('purchaseAircraftBtn').dataset.aircraftId;
  const aircraft = allAircraft.find(a => a.id === aircraftId);
  
  if (!aircraft) {
    alert('Aircraft not found');
    return;
  }
  
  // In a real implementation, this would call an API to purchase the aircraft
  // For now, we'll just show a success message
  alert(`Purchase initiated for ${aircraft.manufacturer} ${aircraft.model}!\n\nPrice: $${formatCurrency(aircraft.price)}\n\nThis would be processed through the backend in a real implementation.`);
  
  // Close modal after purchase
  closeAircraftDetailModal();
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  loadAircraft();
});