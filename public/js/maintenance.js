let allAircraft = [];
let aircraftTypes = [];

// Generate deterministic random interval for A, C, and D checks based on aircraft ID
function getCheckIntervalForAircraft(aircraftId, checkType) {
  // Create a hash from aircraft ID to get consistent "random" value
  let hash = 0;
  const str = aircraftId + checkType;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  hash = Math.abs(hash);

  if (checkType === 'A') {
    // 800-1000 flight hours
    const minHours = 800;
    const maxHours = 1000;
    return minHours + (hash % (maxHours - minHours + 1));
  } else if (checkType === 'C') {
    // 2 years = 730 days (fixed)
    return 730;
  } else if (checkType === 'D') {
    // 5-7 years = 1825-2555 days
    const minDays = 1825;
    const maxDays = 2555;
    return minDays + (hash % (maxDays - minDays + 1));
  }

  return null;
}

// Engineer names by culture/region
const ENGINEER_NAMES = {
  british: [
    'James Thompson', 'William Harris', 'Oliver Wright', 'George Mitchell', 'Harry Clarke',
    'Thomas Evans', 'Jack Robinson', 'Daniel Hughes', 'Matthew Lewis', 'Samuel Walker',
    'Emma Richards', 'Sophie Turner', 'Charlotte Green', 'Amelia Hall', 'Jessica Wood'
  ],
  american: [
    'Michael Johnson', 'David Williams', 'Robert Brown', 'John Davis', 'Christopher Miller',
    'Daniel Wilson', 'Andrew Moore', 'Joseph Taylor', 'Ryan Anderson', 'Brandon Thomas',
    'Jennifer Martinez', 'Sarah Jackson', 'Ashley White', 'Amanda Garcia', 'Stephanie Lee'
  ],
  german: [
    'Hans Müller', 'Klaus Schmidt', 'Wolfgang Fischer', 'Stefan Weber', 'Thomas Wagner',
    'Michael Becker', 'Andreas Hoffmann', 'Markus Schulz', 'Jürgen Koch', 'Peter Richter',
    'Anna Meyer', 'Sabine Braun', 'Claudia Krause', 'Monika Lange', 'Petra Schwarz'
  ],
  french: [
    'Jean-Pierre Dubois', 'François Martin', 'Michel Bernard', 'Philippe Moreau', 'Laurent Petit',
    'Pierre Durand', 'Jacques Leroy', 'Christophe Roux', 'Nicolas Simon', 'Olivier Laurent',
    'Marie Lefebvre', 'Sophie Girard', 'Isabelle Bonnet', 'Catherine Mercier', 'Nathalie Dupont'
  ],
  spanish: [
    'Carlos García', 'Miguel Rodríguez', 'José Martínez', 'Antonio López', 'Francisco Hernández',
    'Juan González', 'Pedro Sánchez', 'Manuel Romero', 'Luis Torres', 'Javier Ramírez',
    'María Fernández', 'Carmen Ruiz', 'Ana Díaz', 'Laura Moreno', 'Patricia Muñoz'
  ],
  italian: [
    'Marco Rossi', 'Giuseppe Russo', 'Antonio Conti', 'Giovanni Esposito', 'Francesco Romano',
    'Alessandro Ricci', 'Andrea Colombo', 'Luca Ferrari', 'Matteo Greco', 'Davide Bruno',
    'Francesca Marino', 'Chiara Gallo', 'Valentina Costa', 'Sara Fontana', 'Giulia De Luca'
  ],
  dutch: [
    'Jan de Vries', 'Pieter van Dijk', 'Willem Bakker', 'Kees Visser', 'Hans Smit',
    'Jeroen de Boer', 'Maarten Mulder', 'Bas Bos', 'Thijs de Groot', 'Ruben Jansen',
    'Anna van den Berg', 'Sophie Hendriks', 'Emma Dekker', 'Lisa Vermeer', 'Fleur Peters'
  ],
  scandinavian: [
    'Erik Lindqvist', 'Lars Johansson', 'Anders Nilsson', 'Magnus Eriksson', 'Johan Larsson',
    'Henrik Olsen', 'Bjørn Hansen', 'Mikael Andersen', 'Fredrik Petersen', 'Kristian Berg',
    'Ingrid Svensson', 'Astrid Karlsson', 'Sigrid Pedersen', 'Freya Nielsen', 'Liv Dahl'
  ],
  polish: [
    'Piotr Kowalski', 'Tomasz Nowak', 'Krzysztof Wiśniewski', 'Andrzej Wójcik', 'Marcin Kowalczyk',
    'Paweł Kamiński', 'Michał Lewandowski', 'Jakub Zieliński', 'Adam Szymański', 'Łukasz Woźniak',
    'Anna Dąbrowska', 'Magdalena Kozłowska', 'Katarzyna Jankowska', 'Agnieszka Mazur', 'Monika Krawczyk'
  ],
  russian: [
    'Alexei Petrov', 'Dmitri Ivanov', 'Sergei Kuznetsov', 'Mikhail Sokolov', 'Andrei Popov',
    'Viktor Volkov', 'Nikolai Fedorov', 'Ivan Morozov', 'Pavel Novikov', 'Yuri Kozlov',
    'Olga Smirnova', 'Natalia Lebedeva', 'Elena Orlova', 'Anna Pavlova', 'Maria Volkova'
  ],
  japanese: [
    'Takeshi Yamamoto', 'Hiroshi Tanaka', 'Kenji Watanabe', 'Masashi Suzuki', 'Yuki Sato',
    'Kazuki Kobayashi', 'Ryo Nakamura', 'Shota Ito', 'Daiki Yamada', 'Kenta Matsumoto',
    'Yuki Takahashi', 'Sakura Yoshida', 'Haruka Inoue', 'Aoi Kimura', 'Miku Hayashi'
  ],
  chinese: [
    'Wei Zhang', 'Ming Li', 'Jian Wang', 'Lei Chen', 'Feng Liu',
    'Hao Yang', 'Jun Huang', 'Tao Wu', 'Qiang Zhou', 'Bo Xu',
    'Mei Lin', 'Xiu Zhao', 'Yan Sun', 'Hui Ma', 'Na Zhu'
  ],
  indian: [
    'Rajesh Sharma', 'Anil Patel', 'Vikram Singh', 'Suresh Kumar', 'Rahul Gupta',
    'Amit Verma', 'Sanjay Mehta', 'Pradeep Joshi', 'Manoj Reddy', 'Deepak Nair',
    'Priya Iyer', 'Sunita Rao', 'Anjali Desai', 'Kavita Pillai', 'Neha Kapoor'
  ],
  middle_eastern: [
    'Ahmed Al-Hassan', 'Mohammed Al-Rashid', 'Khalid Al-Farsi', 'Omar Al-Qasim', 'Yusuf Al-Mahmoud',
    'Hassan Al-Nasser', 'Ali Al-Saeed', 'Ibrahim Al-Zahrani', 'Tariq Al-Khalil', 'Fahad Al-Dosari',
    'Fatima Al-Ali', 'Aisha Al-Rashidi', 'Mariam Al-Suwaidi', 'Noura Al-Khaled', 'Layla Al-Ahmed'
  ],
  brazilian: [
    'João Silva', 'Pedro Santos', 'Lucas Oliveira', 'Mateus Souza', 'Gabriel Costa',
    'Rafael Pereira', 'Bruno Almeida', 'Thiago Ribeiro', 'Felipe Carvalho', 'Gustavo Lima',
    'Ana Ferreira', 'Juliana Rodrigues', 'Mariana Martins', 'Camila Gomes', 'Fernanda Barbosa'
  ],
  australian: [
    'Jack Mitchell', 'Liam O\'Brien', 'Noah Campbell', 'Ethan Stewart', 'Mason Kelly',
    'Cooper Ross', 'Ryan Murray', 'Jake Morgan', 'Ben Taylor', 'Tom Wilson',
    'Chloe Thompson', 'Emily Brown', 'Mia Davis', 'Olivia Martin', 'Ava Robinson'
  ]
};

// Map countries to cultures
const COUNTRY_CULTURE_MAP = {
  'United Kingdom': 'british', 'UK': 'british', 'England': 'british', 'Scotland': 'british', 'Wales': 'british',
  'United States': 'american', 'USA': 'american', 'Canada': 'american',
  'Germany': 'german', 'Austria': 'german', 'Switzerland': 'german',
  'France': 'french', 'Belgium': 'french', 'Luxembourg': 'french',
  'Spain': 'spanish', 'Mexico': 'spanish', 'Argentina': 'spanish', 'Chile': 'spanish', 'Colombia': 'spanish',
  'Italy': 'italian',
  'Netherlands': 'dutch',
  'Sweden': 'scandinavian', 'Norway': 'scandinavian', 'Denmark': 'scandinavian', 'Finland': 'scandinavian', 'Iceland': 'scandinavian',
  'Poland': 'polish', 'Czech Republic': 'polish', 'Slovakia': 'polish',
  'Russia': 'russian', 'Ukraine': 'russian', 'Belarus': 'russian',
  'Japan': 'japanese',
  'China': 'chinese', 'Taiwan': 'chinese', 'Hong Kong': 'chinese', 'Singapore': 'chinese',
  'India': 'indian', 'Pakistan': 'indian', 'Bangladesh': 'indian', 'Sri Lanka': 'indian',
  'UAE': 'middle_eastern', 'Saudi Arabia': 'middle_eastern', 'Qatar': 'middle_eastern', 'Kuwait': 'middle_eastern', 'Bahrain': 'middle_eastern', 'Oman': 'middle_eastern',
  'Brazil': 'brazilian', 'Portugal': 'brazilian',
  'Australia': 'australian', 'New Zealand': 'australian'
};

// Get a deterministic "random" engineer name based on aircraft ID and check type
function getEngineerName(aircraftId, checkType, country) {
  // Create a simple hash from the aircraft ID and check type
  const str = aircraftId + checkType;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  hash = Math.abs(hash);

  // Get culture from country, or use hash to pick a random culture
  let culture = COUNTRY_CULTURE_MAP[country];
  if (!culture) {
    // If no country match, use hash to pick a culture for variety
    const cultures = Object.keys(ENGINEER_NAMES);
    culture = cultures[hash % cultures.length];
  }

  const names = ENGINEER_NAMES[culture];
  return names[hash % names.length];
}

// (WIP detection and check status computation handled server-side in /api/fleet/maintenance)

// Load maintenance data
async function loadMaintenanceData() {
  try {
    const fleetResponse = await fetch('/api/fleet/maintenance');
    const data = await fleetResponse.json();

    if (!fleetResponse.ok) {
      throw new Error(data.error || 'Failed to fetch maintenance data');
    }

    allAircraft = data;

    // Extract unique aircraft types for filter
    const typeSet = new Set();
    data.forEach(ac => {
      if (ac.aircraft) {
        const typeName = `${ac.aircraft.manufacturer} ${ac.aircraft.model}${ac.aircraft.variant ? (ac.aircraft.variant.startsWith('-') ? ac.aircraft.variant : '-' + ac.aircraft.variant) : ''}`;
        typeSet.add(typeName);
      }
    });
    aircraftTypes = Array.from(typeSet).sort();
    populateTypeFilter();

    // Statuses are pre-computed server-side - render immediately
    displayMaintenanceData(data);
    updateSummaryStats();
  } catch (error) {
    console.error('Error loading maintenance data:', error);
    document.getElementById('maintenanceGrid').innerHTML = `
      <div class="table-empty">
        <div class="empty-message">ERROR LOADING MAINTENANCE DATA</div>
      </div>
    `;
  }
}

// Populate type filter dropdown
function populateTypeFilter() {
  const select = document.getElementById('typeFilter');
  select.innerHTML = '<option value="">All Types</option>';
  aircraftTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    select.appendChild(option);
  });
}

// Format date and time for display (UTC)
function formatDateTime(date) {
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${hours}:${minutes}z`;
}

// Get aircraft type name
function getTypeName(ac) {
  if (!ac.aircraft) return 'Unknown';
  return `${ac.aircraft.manufacturer} ${ac.aircraft.model}${ac.aircraft.variant ? (ac.aircraft.variant.startsWith('-') ? ac.aircraft.variant : '-' + ac.aircraft.variant) : ''}`;
}

// Get worst status for an aircraft (for filtering)
function getWorstStatus(ac) {
  const checks = ['daily', 'weekly', 'A', 'C', 'D'].map(type =>
    ac.checkStatuses?.[type] || { status: 'none' }
  );

  // expired includes never-performed checks
  if (checks.some(c => c.status === 'expired')) return 'expired';
  if (checks.some(c => c.status === 'warning')) return 'warning';
  if (checks.some(c => c.status === 'inprogress')) return 'inprogress';
  return 'valid';
}

// Filter aircraft based on current filters
function getFilteredAircraft() {
  const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
  const typeFilter = document.getElementById('typeFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;

  return allAircraft.filter(ac => {
    // Search filter
    if (searchTerm && !ac.registration.toLowerCase().includes(searchTerm)) {
      return false;
    }

    // Type filter
    if (typeFilter && getTypeName(ac) !== typeFilter) {
      return false;
    }

    // Status filter
    if (statusFilter) {
      const worstStatus = getWorstStatus(ac);
      if (statusFilter !== worstStatus) {
        return false;
      }
    }

    return true;
  });
}

// Group aircraft by type
function groupAircraftByType(aircraft) {
  const groups = {};
  aircraft.forEach(ac => {
    const typeName = getTypeName(ac);
    if (!groups[typeName]) {
      groups[typeName] = [];
    }
    groups[typeName].push(ac);
  });
  return Object.keys(groups).sort().reduce((sorted, key) => {
    sorted[key] = groups[key];
    return sorted;
  }, {});
}

// Update summary stat boxes
function updateSummaryStats() {
  let overdueCount = 0;
  let allClearCount = 0;
  const hangarItems = [];
  const heavyItems = [];

  allAircraft.forEach(ac => {
    const checks = ['daily', 'weekly', 'A', 'C', 'D'];
    let hasOverdue = false;
    let hasAnyIssue = false;
    const wipChecks = [];

    checks.forEach(type => {
      const s = ac.checkStatuses?.[type] || { status: 'none', text: '--' };
      if (s.status === 'inprogress') {
        // Only show A/C/D checks in the hangar (daily/weekly are minor)
        if (['A', 'C', 'D'].includes(type)) {
          wipChecks.push(type + ' Check');
        }
        hasAnyIssue = true;
      }
      if (s.status === 'expired') { hasOverdue = true; hasAnyIssue = true; }
      if (s.status === 'warning') { hasAnyIssue = true; }
    });

    // Collect hangar items (only A/C/D checks)
    if (wipChecks.length > 0) {
      hangarItems.push({ reg: ac.registration, checks: wipChecks });
    }

    // Heavy checks: C or D that are warning or expired
    const cStatus = ac.checkStatuses?.C || { status: 'none', text: '--' };
    const dStatus = ac.checkStatuses?.D || { status: 'none', text: '--' };
    if (['warning', 'expired'].includes(cStatus.status)) {
      heavyItems.push({
        reg: ac.registration,
        check: 'C-Check',
        status: cStatus.status,
        detail: cStatus.status === 'expired' ? 'overdue' : cStatus.expiryText || ''
      });
    }
    if (['warning', 'expired'].includes(dStatus.status)) {
      heavyItems.push({
        reg: ac.registration,
        check: 'D-Check',
        status: dStatus.status,
        detail: dStatus.status === 'expired' ? 'overdue' : dStatus.expiryText || ''
      });
    }

    if (hasOverdue) overdueCount++;
    if (!hasAnyIssue) allClearCount++;
  });

  // In the Hangar list
  document.getElementById('statInHangar').textContent = hangarItems.length;
  const hangarList = document.getElementById('hangarList');
  if (hangarItems.length === 0) {
    hangarList.innerHTML = '<li class="maint-list-empty">No aircraft in maintenance</li>';
  } else {
    hangarList.innerHTML = hangarItems.map(item =>
      `<li><span class="maint-list-reg">${item.reg}</span><span class="maint-list-check">${item.checks.join(', ')}</span></li>`
    ).join('');
  }

  // Upcoming Heavy Checks list
  document.getElementById('statHeavyChecks').textContent = heavyItems.length;
  const heavyList = document.getElementById('heavyChecksList');
  if (heavyItems.length === 0) {
    heavyList.innerHTML = '<li class="maint-list-empty">None due</li>';
  } else {
    heavyList.innerHTML = heavyItems.map(item => {
      const badge = item.status === 'expired'
        ? '<span style="color:#ef4444;font-weight:600;">OVERDUE</span>'
        : '<span style="color:#d97706;">due soon</span>';
      return `<li><span class="maint-list-reg">${item.reg}</span><span class="maint-list-check">${item.check} &middot; ${badge}</span></li>`;
    }).join('');
  }

  // Counters
  document.getElementById('statOverdue').textContent = overdueCount;
  document.getElementById('statOverdueSub').textContent = overdueCount === 1 ? 'aircraft' : 'aircraft';
  document.getElementById('statAllClear').textContent = allClearCount;
  document.getElementById('statAllClearSub').textContent = `of ${allAircraft.length}`;
}

// Display maintenance data
function displayMaintenanceData(aircraft) {
  const filtered = aircraft || getFilteredAircraft();
  const container = document.getElementById('maintenanceGrid');

  // Update count
  document.getElementById('aircraftCount').textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="table-empty">
        <div class="empty-message">${allAircraft.length === 0 ? 'NO AIRCRAFT IN FLEET' : 'NO MATCHING AIRCRAFT'}</div>
      </div>
    `;
    return;
  }

  const grouped = groupAircraftByType(filtered);
  let html = '';

  for (const [typeName, aircraftList] of Object.entries(grouped)) {
    html += `
      <div class="aircraft-type-header">
        <h3>${typeName} <span>(${aircraftList.length})</span></h3>
      </div>
      <div class="maintenance-header">
        <span>Reg</span>
        <span>Daily</span>
        <span>Weekly</span>
        <span>A Check</span>
        <span>C Check</span>
        <span>D Check</span>
      </div>
    `;

    aircraftList.forEach(ac => {
      const checks = ['daily', 'weekly', 'A', 'C', 'D'];

      html += `<div class="maintenance-row">
          <span class="maintenance-reg">${ac.registration}</span>`;

      checks.forEach(type => {
        // Use pre-computed status from server, fall back to client-side computation
        const check = ac.checkStatuses?.[type] || { status: 'none', text: '--' };
        html += `<div class="maintenance-check-cell">
            <span class="check-status check-${check.status}"
                  onclick="showCheckDetails('${ac.id}', '${type}')"
                  title="Click for details">
              ${check.text}
            </span>
          </div>`;
      });

      html += `</div>`;
    });
  }

  container.innerHTML = html;
}

// Show check details in modal
function showCheckDetails(aircraftId, checkType) {
  const ac = allAircraft.find(a => a.id === aircraftId);
  if (!ac) return;

  // Use pre-computed server status
  const checkStatus = ac.checkStatuses?.[checkType] || { status: 'none', text: '--' };

  const checkNames = {
    'daily': 'Daily Check',
    'weekly': 'Weekly Check',
    'A': 'A Check',
    'C': 'C Check',
    'D': 'D Check'
  };

  const checkDescriptions = {
    'daily': 'Pre-flight inspection performed daily (valid 1-2 days)',
    'weekly': 'Weekly systems and components check (valid 7-8 days)',
    'A': 'Light maintenance check (every 800-1000 flight hours)',
    'C': 'Extensive structural inspection (every 2 years)',
    'D': 'Heavy maintenance overhaul (every 5-7 years)'
  };

  const durationTexts = {
    'daily': '30-90 minutes',
    'weekly': '1.5-3 hours',
    'A': '6-12 hours',
    'C': '2-4 weeks',
    'D': '2-3 months'
  };

  const checkName = checkNames[checkType] || `${checkType} Check`;
  const statusText = {
    'valid': 'Valid',
    'warning': 'Due Soon',
    'expired': 'Overdue',
    'inprogress': 'In Progress',
    'none': 'Never Performed'
  }[checkStatus.status] || checkStatus.status;

  document.getElementById('modalTitle').textContent = `${ac.registration} - ${checkName}`;

  let content = `
    <div class="maint-modal-row">
      <span class="maint-modal-label">Status</span>
      <span class="maint-modal-value check-${checkStatus.status}" style="padding: 0.2rem 0.5rem; border-radius: 3px;">${statusText}</span>
    </div>
    <div class="maint-modal-row">
      <span class="maint-modal-label">Description</span>
      <span class="maint-modal-value">${checkDescriptions[checkType]}</span>
    </div>
    <div class="maint-modal-row">
      <span class="maint-modal-label">Duration</span>
      <span class="maint-modal-value">${durationTexts[checkType]}</span>
    </div>
  `;

  // If in progress, show expected completion time
  if (checkStatus.status === 'inprogress' && checkStatus.completionTime) {
    const completionDate = new Date(checkStatus.completionTime);
    const completionText = formatDateTime(completionDate);
    content += `
      <div class="maint-modal-row">
        <span class="maint-modal-label">Completes</span>
        <span class="maint-modal-value">${completionText}</span>
      </div>
    `;
  }

  if (checkStatus.lastCheckTime) {
    content += `
      <div class="maint-modal-row">
        <span class="maint-modal-label">Last Performed</span>
        <span class="maint-modal-value">${checkStatus.lastCheckTime}</span>
      </div>
    `;
  }

  if (checkStatus.expiryText && checkStatus.status !== 'none' && checkStatus.status !== 'inprogress') {
    content += `
      <div class="maint-modal-row">
        <span class="maint-modal-label">${checkStatus.status === 'expired' ? 'Expired On' : 'Expires'}</span>
        <span class="maint-modal-value">${checkStatus.expiryText}</span>
      </div>
    `;
  }

  // Show interval/validity info
  if (checkType === 'A') {
    const interval = checkStatus.intervalHours || ac.aCheckIntervalHours || getCheckIntervalForAircraft(ac.id, 'A');
    content += `
      <div class="maint-modal-row">
        <span class="maint-modal-label">Interval</span>
        <span class="maint-modal-value">${interval} flight hours</span>
      </div>
    `;
  } else if (['C', 'D'].includes(checkType)) {
    const intervalField = `${checkType.toLowerCase()}CheckIntervalDays`;
    const interval = ac[intervalField] || checkStatus.intervalDays;
    if (interval) {
      let intervalText;
      if (interval < 365) {
        intervalText = `${Math.round(interval / 30)} months (~${interval} days)`;
      } else {
        intervalText = `${Math.round(interval / 365)} years (~${interval} days)`;
      }
      content += `
        <div class="maint-modal-row">
          <span class="maint-modal-label">Interval</span>
          <span class="maint-modal-value">${intervalText}</span>
        </div>
      `;
    }
  } else if (checkType === 'weekly') {
    content += `
      <div class="maint-modal-row">
        <span class="maint-modal-label">Validity</span>
        <span class="maint-modal-value">7-8 days until midnight UTC</span>
      </div>
    `;
  } else if (checkType === 'daily') {
    content += `
      <div class="maint-modal-row">
        <span class="maint-modal-label">Validity</span>
        <span class="maint-modal-value">1-2 days until midnight UTC</span>
      </div>
    `;
  }

  // Add engineer name if check has been performed or is in progress
  if (checkStatus.status !== 'none') {
    const country = ac.homeBaseAirport?.country || ac.homeBase?.country || '';

    // Use the effective check type from server for WIP cascading
    const effectiveCheckType = checkStatus.effectiveCheckType || checkType;

    const engineer = getEngineerName(aircraftId, effectiveCheckType, country);
    const label = checkStatus.status === 'inprogress' ? 'Lead Engineer' : 'Signed Off By';
    content += `
      <div class="maint-modal-row">
        <span class="maint-modal-label">${label}</span>
        <span class="maint-modal-value">${engineer}</span>
      </div>
    `;
  }

  document.getElementById('modalContent').innerHTML = content;
  document.getElementById('maintModalOverlay').style.display = 'flex';
}

// Close modal
function closeMaintenanceModal(event) {
  if (!event || event.target.id === 'maintModalOverlay') {
    document.getElementById('maintModalOverlay').style.display = 'none';
  }
}

// Handle filter changes
function onFilterChange() {
  const filtered = getFilteredAircraft();
  displayMaintenanceData(filtered);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadMaintenanceData();

  // Set up filter event listeners
  document.getElementById('searchFilter').addEventListener('input', onFilterChange);
  document.getElementById('typeFilter').addEventListener('change', onFilterChange);
  document.getElementById('statusFilter').addEventListener('change', onFilterChange);

  // Refresh All button
  const refreshAllBtn = document.getElementById('refreshAllBtn');
  if (refreshAllBtn) {
    refreshAllBtn.addEventListener('click', async () => {
      refreshAllBtn.disabled = true;
      refreshAllBtn.textContent = 'Refreshing...';

      try {
        const response = await fetch('/api/fleet/refresh-all-maintenance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        if (response.ok) {
          refreshAllBtn.textContent = `Done! (${data.success} updated)`;
          // Reload maintenance data to show new schedules
          await loadMaintenanceData();
          setTimeout(() => {
            refreshAllBtn.textContent = 'Refresh All Schedules';
            refreshAllBtn.disabled = false;
          }, 2000);
        } else {
          refreshAllBtn.textContent = 'Error';
          console.error('Refresh error:', data.error);
          setTimeout(() => {
            refreshAllBtn.textContent = 'Refresh All Schedules';
            refreshAllBtn.disabled = false;
          }, 2000);
        }
      } catch (err) {
        console.error('Refresh failed:', err);
        refreshAllBtn.textContent = 'Failed';
        setTimeout(() => {
          refreshAllBtn.textContent = 'Refresh All Schedules';
          refreshAllBtn.disabled = false;
        }, 2000);
      }
    });
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMaintenanceModal();
    }
  });
});

// Statuses are server-computed - the 30-second auto-refresh handles keeping data current

// Periodically refresh data from server (every 30 seconds)
setInterval(() => {
  if (document.visibilityState === 'visible') {
    loadMaintenanceData();
  }
}, 30000);
