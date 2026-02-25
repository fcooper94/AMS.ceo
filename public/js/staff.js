// ─── Staff Page Client-Side Logic ────────────────────────────────────────────

let staffData = null;
let expandedDepts = new Set();

// ─── Name Generation (seeded PRNG for consistent fictional names) ────────────
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return hash;
}

const FIRST_NAMES = [
  'James','Mary','Robert','Patricia','John','Jennifer','Michael','Linda','David','Elizabeth',
  'William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen',
  'Christopher','Lisa','Daniel','Nancy','Matthew','Betty','Anthony','Margaret','Mark','Sandra',
  'Donald','Ashley','Steven','Dorothy','Andrew','Kimberly','Paul','Emily','Joshua','Donna',
  'Kenneth','Michelle','Kevin','Carol','Brian','Amanda','George','Melissa','Timothy','Deborah',
  'Alexander','Stephanie','Samuel','Rebecca','Frank','Sharon','Patrick','Laura','Raymond','Cynthia',
  'Hiroshi','Yuki','Kenji','Sakura','Takeshi','Aiko','Ryu','Hana','Akira','Mei',
  'Wei','Xiao','Jun','Li','Feng','Hua','Cheng','Yan','Ming','Lan',
  'Raj','Priya','Amit','Ananya','Vikram','Deepa','Arjun','Kavita','Suresh','Meera',
  'Omar','Fatima','Ahmed','Layla','Hassan','Amira','Khalid','Noor','Tariq','Zara',
  'Carlos','Maria','Luis','Ana','Diego','Isabella','Javier','Valentina','Pedro','Camila',
  'Jean','Marie','Pierre','Sophie','Laurent','Isabelle','Antoine','Claire','Nicolas','Julie',
  'Hans','Anna','Klaus','Eva','Stefan','Katrin','Wolfgang','Monika','Friedrich','Helga',
  'Ivan','Natasha','Dmitri','Elena','Sergei','Olga','Alexei','Tatiana','Boris','Irina',
  'Kwame','Ama','Kofi','Akosua','Yaw','Abena','Kojo','Efua','Kwesi','Adwoa',
  'Liam','Emma','Noah','Olivia','Ethan','Ava','Lucas','Mia','Mason','Sophia',
  'Aiden','Charlotte','Logan','Amelia','Owen','Harper','Elijah','Evelyn','Caleb','Abigail',
  'Nathan','Grace','Adrian','Lily','Ian','Ella','Oscar','Aria','Felix','Chloe',
  'Sven','Astrid','Erik','Freya','Lars','Ingrid','Nils','Sigrid','Olaf','Linnea',
  'Mateo','Lucia','Pablo','Carmen','Andres','Elena','Marco','Rosa','Alejandro','Sofia'
];

const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
  'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
  'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
  'Tanaka','Yamamoto','Suzuki','Watanabe','Takahashi','Sato','Kobayashi','Nakamura','Ito','Kato',
  'Wang','Chen','Zhang','Liu','Yang','Huang','Wu','Zhou','Xu','Sun',
  'Sharma','Patel','Singh','Kumar','Gupta','Nair','Reddy','Joshi','Rao','Mehta',
  'Al-Rashid','Hassan','Ibrahim','Mohammed','Abbas','Khalil','Mansour','Farouk','Saleh','Nasser',
  'Silva','Santos','Oliveira','Souza','Costa','Ferreira','Pereira','Almeida','Nascimento','Lima',
  'Dubois','Moreau','Laurent','Bernard','Petit','Robert','Richard','Durand','Leroy','Roux',
  'Mueller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Hoffmann','Braun',
  'Ivanov','Petrov','Smirnov','Kuznetsov','Popov','Sokolov','Lebedev','Kozlov','Novikov','Morozov',
  'Mensah','Asante','Owusu','Boateng','Osei','Adjei','Agyemang','Appiah','Gyasi','Frimpong',
  'OBrien','Murphy','Kelly','Sullivan','Walsh','McCarthy','OConnor','Ryan','Brennan','Doyle',
  'Johansson','Lindberg','Eriksson','Larsson','Nilsson','Bergstrom','Andersen','Holm','Dahl','Lund',
  'Rossi','Russo','Esposito','Colombo','Ferrari','Romano','Ricci','Greco','Marino','Bruno',
  'Park','Kim','Choi','Jeong','Kang','Cho','Yoon','Jang','Lim','Han',
  'Fernandez','Gomez','Diaz','Ruiz','Reyes','Morales','Jimenez','Castillo','Vargas','Herrera'
];

function generateNames(seed, count, baseSalary) {
  const rng = mulberry32(seed);
  const names = [];
  for (let i = 0; i < count; i++) {
    const fi = Math.floor(rng() * FIRST_NAMES.length);
    const li = Math.floor(rng() * LAST_NAMES.length);
    const seniorityFactor = 0.90 + (0.20 * (1 - i / Math.max(count, 1)));
    const salary = Math.round(baseSalary * seniorityFactor);
    names.push({ name: `${FIRST_NAMES[fi]} ${LAST_NAMES[li]}`, salary });
  }
  return names;
}

// ─── Currency Formatting ─────────────────────────────────────────────────────
function formatSalary(amount) {
  return '$' + Math.round(amount).toLocaleString('en-US');
}

function formatSalaryShort(amount) {
  if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
  return '$' + Math.round(amount).toLocaleString('en-US');
}

// ─── Data Loading ────────────────────────────────────────────────────────────
async function loadStaffData() {
  try {
    const response = await fetch('/api/staff');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    staffData = await response.json();
    renderSummary();
    renderDepartments();
  } catch (error) {
    console.error('Error loading staff data:', error);
    document.getElementById('staffDepartments').innerHTML =
      '<div class="staff-loading" style="color: var(--warning-color);">Failed to load staff data</div>';
  }
}

// ─── Summary Bar ─────────────────────────────────────────────────────────────
function renderSummary() {
  if (!staffData) return;
  const { summary, eraLabel, fleetSize, salaryModifiers } = staffData;

  document.getElementById('statTotalEmployees').textContent = summary.totalEmployees.toLocaleString();
  document.getElementById('statWeeklyPayroll').textContent = formatSalaryShort(summary.totalWeeklyCost);
  document.getElementById('statFleetSize').textContent = fleetSize;
  document.getElementById('statEraLabel').textContent = eraLabel;

  const globalMod = salaryModifiers.global || 1.0;
  document.getElementById('statGlobalModifier').textContent = Math.round(globalMod * 100) + '%';
}

// ─── Department Rendering ────────────────────────────────────────────────────
function renderDepartments() {
  if (!staffData) return;
  const container = document.getElementById('staffDepartments');
  container.innerHTML = '';

  for (const dept of staffData.departments) {
    if (dept.roles.length === 0 && !dept.outsourceable) continue;

    const contractorInfo = staffData.contractors?.[dept.key];
    const isOutsourced = dept.outsourceable && contractorInfo;

    // For outsourced departments, render a compact banner instead
    if (isOutsourced) {
      container.appendChild(buildOutsourcedBanner(dept, contractorInfo));
      continue;
    }

    container.appendChild(buildDepartmentSection(dept));
  }
}

// ─── Outsourced Department Banner ────────────────────────────────────────────
function buildOutsourcedBanner(dept, contractorInfo) {
  const banner = document.createElement('div');
  banner.className = 'staff-outsourced-banner';

  const outsourceNotes = {
    ground: 'Baggage handling, boarding, fuelling, and ramp operations are managed by your ground handling partner.',
    engineering: 'All maintenance, repair, and overhaul (MRO) work is contracted out to your engineering partner.'
  };

  banner.innerHTML = `
    <div class="outsourced-banner-left">
      <span class="outsourced-dept-name">${dept.label}</span>
      <span class="outsourced-tag">OUTSOURCED</span>
    </div>
    <div class="outsourced-banner-center">
      <span class="outsourced-contractor-name">${contractorInfo.name}</span>
      <span class="outsourced-contractor-note">${outsourceNotes[dept.key] || ''}</span>
    </div>
    <div class="outsourced-banner-right">
      <span class="outsourced-cost">${formatSalary(contractorInfo.weeklyCost)}/wk</span>
      <button class="outsourced-change-btn" onclick="openContractorModal('${dept.key}')">Change</button>
    </div>
  `;

  return banner;
}

// ─── Change Contractor Modal ─────────────────────────────────────────────────
function openContractorModal(category) {
  const contractorInfo = staffData?.contractors?.[category];
  if (!contractorInfo || !contractorInfo.options) return;

  const categoryLabels = { ground: 'Ground Handling', engineering: 'Engineering & MRO' };
  const tierColors = { budget: '#22c55e', standard: '#f59e0b', premium: '#3b82f6' };
  const penaltyCost = contractorInfo.weeklyCost * 2;

  let optionsHtml = contractorInfo.options.map(opt => {
    const isCurrent = opt.current;
    return `
      <label class="contractor-modal-option${isCurrent ? ' contractor-current' : ''}" data-tier="${opt.tier}">
        <div class="contractor-option-header">
          <span class="contractor-option-name" style="color: ${tierColors[opt.tier] || 'var(--text-primary)'}">${opt.name}${isCurrent ? ' <span class="contractor-option-current-tag">CURRENT</span>' : ''}</span>
          <span class="contractor-option-cost">${formatSalary(opt.weeklyCost)}/wk</span>
        </div>
        <div class="contractor-option-desc">${opt.description}</div>
      </label>
    `;
  }).join('');

  const backdrop = document.createElement('div');
  backdrop.className = 'staff-modal-backdrop';
  backdrop.id = 'contractorModalBackdrop';
  backdrop.onclick = (e) => { if (e.target === backdrop) closeContractorModal(); };

  backdrop.innerHTML = `
    <div class="staff-modal contractor-modal">
      <div class="staff-modal-header">
        <h3>Change ${categoryLabels[category] || category} Contractor</h3>
        <button class="staff-modal-close" onclick="closeContractorModal()">&times;</button>
      </div>
      <div class="staff-modal-body">
        <div class="contractor-penalty-notice">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>2-week early termination fee: <strong>${formatSalary(penaltyCost)}</strong> (2× current weekly rate)</span>
        </div>
        <div class="contractor-modal-options">
          ${optionsHtml}
        </div>
        <div id="contractorModalError" class="contractor-modal-error" style="display: none;"></div>
      </div>
      <div class="staff-modal-footer">
        <button class="btn btn-secondary" onclick="closeContractorModal()">Cancel</button>
        <button class="btn btn-primary" id="contractorConfirmBtn" disabled onclick="confirmContractorChange('${category}')">Select a contractor</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('visible'));

  // Add click handlers for options
  backdrop.querySelectorAll('.contractor-modal-option:not(.contractor-current)').forEach(opt => {
    opt.addEventListener('click', () => {
      backdrop.querySelectorAll('.contractor-modal-option').forEach(o => o.classList.remove('contractor-selected'));
      opt.classList.add('contractor-selected');
      const btn = document.getElementById('contractorConfirmBtn');
      btn.disabled = false;
      btn.textContent = 'Switch Contractor';
      delete btn.dataset.confirmed;
      btn.style.borderColor = '';
      btn.style.color = '';
    });
  });
}

async function confirmContractorChange(category) {
  const backdrop = document.getElementById('contractorModalBackdrop');
  if (!backdrop) return;

  const selected = backdrop.querySelector('.contractor-modal-option.contractor-selected');
  if (!selected) return;

  const btn = document.getElementById('contractorConfirmBtn');
  const errorEl = document.getElementById('contractorModalError');

  // First click: ask for confirmation
  if (!btn.dataset.confirmed) {
    btn.dataset.confirmed = 'true';
    btn.textContent = 'Confirm Switch';
    btn.style.borderColor = '#f59e0b';
    btn.style.color = '#f59e0b';
    return;
  }

  const tier = selected.dataset.tier;
  btn.disabled = true;
  btn.textContent = 'Switching...';
  errorEl.style.display = 'none';

  try {
    const response = await fetch('/api/staff/contractor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, tier })
    });
    const data = await response.json();

    if (!response.ok) {
      errorEl.textContent = data.error || 'Failed to change contractor';
      if (data.penaltyCost) {
        errorEl.textContent += ` (need ${formatSalary(data.penaltyCost)}, have ${formatSalary(data.balance)})`;
      }
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Retry';
      return;
    }

    closeContractorModal();
    await loadStaffData();
  } catch (error) {
    console.error('Error changing contractor:', error);
    errorEl.textContent = 'Network error — please try again';
    errorEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Retry';
  }
}

function closeContractorModal() {
  const existing = document.getElementById('contractorModalBackdrop');
  if (existing) existing.remove();
}

window.openContractorModal = openContractorModal;
window.closeContractorModal = closeContractorModal;
window.confirmContractorChange = confirmContractorChange;

// ─── Regular Department Section ──────────────────────────────────────────────
function buildDepartmentSection(dept) {
  const section = document.createElement('div');
  section.className = 'staff-department';
  section.id = `dept-${dept.key}`;

  const isExpanded = expandedDepts.has(dept.key);

  const deptMod = staffData.salaryModifiers?.[dept.key] || 1.0;
  const globalMod = staffData.salaryModifiers?.global || 1.0;
  const effectiveMod = deptMod * globalMod;

  // Header
  const header = document.createElement('div');
  header.className = 'staff-department-header';
  header.onclick = () => toggleDepartment(dept.key);
  header.innerHTML = `
    <div class="staff-dept-name">
      <span class="collapse-icon ${isExpanded ? 'expanded' : ''}">&#9654;</span>
      ${dept.label}
    </div>
    <div class="staff-dept-count">${dept.totalEmployees} staff</div>
    <div class="staff-dept-cost">${formatSalary(dept.totalWeeklyCost)}/wk</div>
    <div class="staff-dept-adjust" onclick="event.stopPropagation()">
      <button class="salary-adjust-btn minus" onclick="adjustDeptSalary('${dept.key}', -0.05)" title="-5%">-</button>
      <span>${Math.round(effectiveMod * 100)}%</span>
      <button class="salary-adjust-btn plus" onclick="adjustDeptSalary('${dept.key}', 0.05)" title="+5%">+</button>
    </div>
  `;
  section.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = `staff-department-body ${isExpanded ? 'expanded' : ''}`;

  const roleHeader = document.createElement('div');
  roleHeader.className = 'staff-role-header';
  roleHeader.innerHTML = '<span>Role</span><span style="text-align:right">Count</span><span style="text-align:right">Weekly</span><span style="text-align:right">Annual</span><span style="text-align:right">Total/wk</span>';
  body.appendChild(roleHeader);

  for (const role of dept.roles) {
    const row = document.createElement('div');
    row.className = 'staff-role-row';
    row.onclick = () => openStaffModal(dept.key, role);
    row.innerHTML = `
      <div class="staff-role-name">
        <svg class="popout-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3"/><path d="M9 2h5v5"/><path d="M14 2L7 9"/></svg>
        ${role.name}
      </div>
      <div class="staff-role-count">${role.count}</div>
      <div class="staff-role-salary">${formatSalary(role.adjustedSalary)}/wk</div>
      <div class="staff-role-annual">${formatSalary(role.adjustedSalary * 52)}/yr</div>
      <div class="staff-role-total">${formatSalary(role.totalCost)}/wk</div>
    `;
    body.appendChild(row);
  }

  section.appendChild(body);
  return section;
}

// ─── Staff Names Modal ───────────────────────────────────────────────────────
function openStaffModal(deptKey, role) {
  // Remove existing modal if any
  closeStaffModal();

  const roleKey = `${deptKey}:${role.name}`;
  const hasTypeBreakdown = role.typeBreakdown && role.typeBreakdown.length > 0;

  const backdrop = document.createElement('div');
  backdrop.id = 'staffModalBackdrop';
  backdrop.className = 'staff-modal-backdrop';
  backdrop.onclick = (e) => { if (e.target === backdrop) closeStaffModal(); };

  const modal = document.createElement('div');
  modal.className = 'staff-modal';

  // Header
  const header = document.createElement('div');
  header.className = 'staff-modal-header';
  header.innerHTML = `
    <div>
      <div class="staff-modal-title">${role.name}</div>
      <div class="staff-modal-subtitle">${role.count} employee${role.count !== 1 ? 's' : ''} &mdash; ${formatSalary(role.adjustedSalary)}/wk &mdash; ${formatSalary(role.adjustedSalary * 52)}/yr</div>
    </div>
    <button class="staff-modal-close" onclick="closeStaffModal()">&times;</button>
  `;
  modal.appendChild(header);

  // Name list header
  const listHeader = document.createElement('div');
  listHeader.className = 'staff-modal-list-header';
  listHeader.innerHTML = '<span>Name</span><span>Weekly</span><span>Annual</span>';
  modal.appendChild(listHeader);

  // Name list (scrollable)
  const list = document.createElement('div');
  list.className = 'staff-modal-list';

  let allNames = [];

  if (hasTypeBreakdown) {
    // Type-rated roles: show names grouped by aircraft type
    let html = '';
    for (const typeGroup of role.typeBreakdown) {
      const typeSeed = hashString(staffData.membershipId + roleKey + ':' + typeGroup.typeName);
      const typeNames = generateNames(typeSeed, typeGroup.count, role.adjustedSalary);
      allNames = allNames.concat(typeNames);
      html += `<div class="staff-modal-type-header">${typeGroup.typeName} <span class="staff-modal-type-count">${typeGroup.count}</span></div>`;
      html += typeNames.map((n, i) =>
        `<div class="staff-modal-row ${i % 2 === 0 ? 'even' : ''}">
          <span class="staff-modal-name">${n.name}</span>
          <span class="staff-modal-salary">${formatSalary(n.salary)}/wk</span>
          <span class="staff-modal-salary">${formatSalary(n.salary * 52)}/yr</span>
        </div>`
      ).join('');
    }
    list.innerHTML = html;
  } else {
    // Standard roles: flat name list
    const seed = hashString(staffData.membershipId + roleKey);
    allNames = generateNames(seed, role.count, role.adjustedSalary);

    // CEO / Group CEO is the player
    if ((role.name === 'CEO / Accountable Manager' || role.name === 'Group CEO') && allNames.length > 0 && staffData.ceoName) {
      allNames[0].name = staffData.ceoName + ' (You)';
    }

    list.innerHTML = allNames.map((n, i) =>
      `<div class="staff-modal-row ${i % 2 === 0 ? 'even' : ''}">
        <span class="staff-modal-name">${n.name}</span>
        <span class="staff-modal-salary">${formatSalary(n.salary)}/wk</span>
        <span class="staff-modal-salary">${formatSalary(n.salary * 52)}/yr</span>
      </div>`
    ).join('');
  }

  modal.appendChild(list);

  // Footer
  const totalSalary = allNames.reduce((s, n) => s + n.salary, 0);
  const footer = document.createElement('div');
  footer.className = 'staff-modal-footer';
  footer.innerHTML = `
    <span>Total: ${formatSalary(totalSalary)}/wk &mdash; ${formatSalary(totalSalary * 52)}/yr</span>
    <button class="staff-modal-close-btn" onclick="closeStaffModal()">Close</button>
  `;
  modal.appendChild(footer);

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // Animate in
  requestAnimationFrame(() => backdrop.classList.add('visible'));
}

function closeStaffModal() {
  const existing = document.getElementById('staffModalBackdrop');
  if (existing) existing.remove();
}

window.closeStaffModal = closeStaffModal;

// ─── Interactions ────────────────────────────────────────────────────────────
function toggleDepartment(deptKey) {
  if (expandedDepts.has(deptKey)) {
    expandedDepts.delete(deptKey);
  } else {
    expandedDepts.add(deptKey);
  }
  renderDepartments();
}

// ─── Salary Adjustments ─────────────────────────────────────────────────────
async function adjustGlobalSalary(delta) {
  if (!staffData) return;
  const current = staffData.salaryModifiers?.global || 1.0;
  const newMod = Math.max(0.5, Math.min(2.0, current + delta));
  await saveSalaryModifier('global', newMod);
}

async function adjustDeptSalary(deptKey, delta) {
  if (!staffData) return;
  const current = staffData.salaryModifiers?.[deptKey] || 1.0;
  const newMod = Math.max(0.5, Math.min(2.0, current + delta));
  await saveSalaryModifier(deptKey, newMod);
}

window.adjustGlobalSalary = adjustGlobalSalary;
window.adjustDeptSalary = adjustDeptSalary;

async function saveSalaryModifier(department, modifier) {
  try {
    const response = await fetch('/api/staff/salary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department, modifier })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await loadStaffData();
  } catch (error) {
    console.error('Error saving salary modifier:', error);
  }
}

// ─── Initialize ──────────────────────────────────────────────────────────────
loadStaffData();
