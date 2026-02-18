/**
 * Staff Configuration
 * Defines airline organizational structure based on fleet size (6 eras).
 * Salary values defined as monthly 2024 USD, converted to weekly by role() helper.
 * Use eraEconomicService for era scaling.
 * Role availability can be year-gated (no Digital Marketing in 1950).
 */

// ─── Organizational Eras (determined by fleet size N) ───────────────────────
const STAFF_ERAS = [
  { idx: 1, minAc: 1,   maxAc: 3,    label: 'Micro Start-up Operator',  PPA: 11, CPA: 22, MPA: 0,   MPP: 0,    OPA: 0.20, CSA: 0,    HQ_base: 6,   HQ_per_ac: 0 },
  { idx: 2, minAc: 4,   maxAc: 10,   label: 'Small Regional Carrier',   PPA: 11, CPA: 24, MPA: 0.4, MPP: 0,    OPA: 0.25, CSA: 0.20, HQ_base: 12,  HQ_per_ac: 0 },
  { idx: 3, minAc: 11,  maxAc: 40,   label: 'Growing Carrier',          PPA: 11, CPA: 24, MPA: 0.7, MPP: 0.10, OPA: 0.30, CSA: 0.25, HQ_base: 21,  HQ_per_ac: 0 },
  { idx: 4, minAc: 41,  maxAc: 100,  label: 'Mid-size Airline',         PPA: 13, CPA: 31, MPA: 0.9, MPP: 0.15, OPA: 0.35, CSA: 0.30, HQ_base: 32,  HQ_per_ac: 0 },
  { idx: 5, minAc: 101, maxAc: 300,  label: 'Major Flag Carrier',       PPA: 15, CPA: 45, MPA: 1.1, MPP: 0.25, OPA: 0.45, CSA: 0.40, HQ_base: 120, HQ_per_ac: 0.6 },
  { idx: 6, minAc: 301, maxAc: 99999,label: 'Global Mega-Carrier',      PPA: 19, CPA: 70, MPA: 1.3, MPP: 0.35, OPA: 0.55, CSA: 0.50, HQ_base: 400, HQ_per_ac: 1.5 },
];

// ─── Department Definitions ─────────────────────────────────────────────────
const DEPARTMENTS = [
  { key: 'executive',   label: 'Executive & Leadership',    outsourceable: false },
  { key: 'flight_ops',  label: 'Flight Operations',         outsourceable: false },
  { key: 'cabin',       label: 'Cabin Crew',                outsourceable: false },
  { key: 'ground',      label: 'Ground Handling',           outsourceable: true, contractorKey: 'ground' },
  { key: 'engineering', label: 'Engineering & MRO',         outsourceable: true, contractorKey: 'engineering' },
  { key: 'commercial',  label: 'Commercial',                outsourceable: false },
  { key: 'corporate',   label: 'Corporate & Administration',outsourceable: false },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function getStaffEra(fleetSize) {
  const N = Math.max(fleetSize, 1); // Era lookup uses min 1 so 0-fleet gets era 1 structure
  return STAFF_ERAS.find(e => N >= e.minAc && N <= e.maxAc) || STAFF_ERAS[0];
}

function c(val) { return Math.ceil(val); } // shorthand ceil

// ─── Roster Computation ─────────────────────────────────────────────────────
/**
 * Compute the full staff roster for an airline.
 * @param {number} fleetSize - Number of active aircraft (N)
 * @param {number} gameYear - Current game year (filters anachronistic roles)
 * @param {object} salaryModifiers - Per-department multipliers, e.g. { global: 1.0, flight_ops: 1.05 }
 * @param {object} crewFromRoutes - Route-based crew requirements: { totalPilots, totalCabinCrew }
 * @returns {object} { departments: [...], summary: {...}, eraLabel, eraIdx }
 */
function computeStaffRoster(fleetSize, gameYear, salaryModifiers = {}, crewFromRoutes = {}) {
  const N = Math.max(fleetSize, 0);
  const era = getStaffEra(N);
  const E = era.idx;
  const globalMod = salaryModifiers.global || 1.0;
  const yr = gameYear || 2024;

  // Helper: add role if year requirement met (converts monthly salary to weekly)
  function role(name, count, monthlySalary, minYear) {
    if (minYear && yr < minYear) return null;
    if (count <= 0) return null;
    return { name, count, baseSalary: Math.round(monthlySalary / 4.33) };
  }

  const departments = [];

  // ━━━ EXECUTIVE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const exec = [];
  exec.push(role('CEO / Accountable Manager', 1, 25000));
  if (E === 1) {
    exec.push(role('Head of Operations', 1, 18000));
    exec.push(role('Safety & Compliance Manager', 1, 12000));
    exec.push(role('Finance & Administration', 1, 10000));
    exec.push(role('Commercial Manager', 1, 10000));
    exec.push(role('Ground Operations Lead', 1, 9000));
  }
  if (E === 2) {
    exec.push(role('Director of Operations', 1, 16000));
    exec.push(role('Chief Pilot', 1, 16000));
    exec.push(role('Cabin Services Manager', 1, 10000));
    exec.push(role('Ground Operations Manager', 1, 10000));
    exec.push(role('Safety Manager', 1, 12000));
    exec.push(role('Compliance / Quality Manager', 1, 11000));
    exec.push(role('Finance Manager', 1, 11000));
    exec.push(role('HR / Recruitment', 1, 8000));
    exec.push(role('Commercial Manager', 1, 10000));
    exec.push(role('IT Support / Systems Admin', 1, 7000, 1970));
    exec.push(role('Maintenance Manager', 1, 11000));
  }
  if (E === 3) {
    exec.push(role('COO', 1, 22000));
    exec.push(role('CFO', 1, 22000));
    exec.push(role('CCO', 1, 18000));
    exec.push(role('Head of Flight Operations', 1, 15000));
    exec.push(role('Training Captain / Standards', 1, 14000));
    exec.push(role('Cabin Services Director', 1, 12000));
    exec.push(role('Ground Operations Director', 1, 12000));
    exec.push(role('Safety Director', 1, 14000));
    exec.push(role('Compliance / Quality Director', 1, 13000));
    exec.push(role('Head of OCC / Network Control', 1, 14000));
    exec.push(role('Head of Revenue Management', 1, 13000, 1985));
    exec.push(role('Head of Network Planning', 1, 13000));
    exec.push(role('Head of Marketing', 1, 12000));
    exec.push(role('Head of Sales', 1, 12000));
    exec.push(role('Customer Support Manager', 1, 8000));
    exec.push(role('HR Director', 1, 12000));
    exec.push(role('Head of IT', 1, 12000, 1970));
    exec.push(role('Procurement Manager', 1, 9000));
    exec.push(role('Legal / Contracts', 1, 10000));
    exec.push(role('Finance Controller', 1, 11000));
  }
  if (E === 4) {
    exec.push(role('COO', 1, 22000));
    exec.push(role('CFO', 1, 22000));
    exec.push(role('CCO', 1, 18000));
    exec.push(role('CIO', 1, 18000, 1970));
    exec.push(role('Chief People Officer', 1, 16000));
    exec.push(role('Chief Safety / Compliance Officer', 1, 16000));
    exec.push(role('Chief Customer Officer', 1, 16000));
    exec.push(role('Flight Operations Director', 1, 15000));
    exec.push(role('Chief Pilot', 1, 16000));
    exec.push(role('Flight Training Director', 1, 14000));
    exec.push(role('Cabin Crew Director', 1, 13000));
    exec.push(role('Ground Operations Director', 1, 13000));
    exec.push(role('Engineering Director', 1, 14000));
    exec.push(role('OCC Director', 1, 14000));
    exec.push(role('Safety Operations Manager', 1, 11000));
    exec.push(role('Security Manager', 1, 11000));
    exec.push(role('Emergency Response Manager', 1, 10000));
    exec.push(role('Revenue Management Director', 1, 14000, 1985));
    exec.push(role('Network Planning Director', 1, 14000));
    exec.push(role('Sales Director', 1, 13000));
    exec.push(role('Marketing / Brand Director', 1, 13000));
    exec.push(role('Loyalty Manager', 1, 10000, 1990));
    exec.push(role('Partnerships / Alliances Manager', 1, 10000));
    exec.push(role('Cargo Manager', 1, 10000));
    exec.push(role('Finance Controller', 1, 12000));
    exec.push(role('Treasury', 1, 10000));
    exec.push(role('Procurement Manager', 1, 9000));
    exec.push(role('Legal Counsel', 1, 12000));
    exec.push(role('HR Operations Manager', 1, 9000));
    exec.push(role('HR Talent / Training Manager', 1, 9000));
    exec.push(role('IT Operations Manager', 1, 10000, 1970));
    exec.push(role('Data / BI Lead', 1, 10000, 1995));
  }
  if (E >= 5) {
    exec.push(role('COO', 1, 24000));
    exec.push(role('CFO', 1, 24000));
    exec.push(role('CCO', 1, 20000));
    exec.push(role('CIO', 1, 20000, 1970));
    exec.push(role('Chief People Officer', 1, 18000));
    exec.push(role('Chief Safety / Compliance Officer', 1, 18000));
    exec.push(role('Chief Customer Officer', 1, 18000));
    // Divisional VPs
    exec.push(role('VP Flight Operations', 1, 17000));
    exec.push(role('VP Cabin Services', 1, 16000));
    exec.push(role('VP Ground Operations', 1, 16000));
    exec.push(role('VP Engineering', 1, 17000));
    exec.push(role('VP OCC / Network Control', 1, 17000));
    exec.push(role('VP Commercial', 1, 17000));
    exec.push(role('VP Cargo', 1, 15000));
    exec.push(role('VP Loyalty', 1, 15000, 1990));
    exec.push(role('VP Customer Experience', 1, 15000));
    exec.push(role('VP IT / Digital', 1, 16000, 1970));
    exec.push(role('VP HR', 1, 15000));
    exec.push(role('VP Finance', 1, 16000));
  }
  if (E === 6) {
    // Group-level additions
    exec.push(role('Group CEO', 1, 35000));
    exec.push(role('Group Strategy Director', 1, 20000));
    exec.push(role('Head of M&A / Transformation', 1, 18000));
    exec.push(role('Group Treasury Director', 1, 16000));
    exec.push(role('Group Safety & Standards Director', 1, 16000));
    exec.push(role('Sustainability / ESG Director', 1, 14000, 2015));
  }

  // ━━━ FLIGHT OPERATIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Pilots are type-rated — single total row, with per-type breakdown for modal
  const pilotsByType = crewFromRoutes.pilotsByType || [];
  let totalCaptains = 0;
  let totalFOs = 0;
  const captainBreakdown = [];
  const foBreakdown = [];
  for (const typeGroup of pilotsByType) {
    const captains = Math.ceil(typeGroup.totalPilots * 0.45);
    const fos = typeGroup.totalPilots - captains;
    totalCaptains += captains;
    totalFOs += fos;
    if (captains > 0) captainBreakdown.push({ typeName: typeGroup.typeName, count: captains });
    if (fos > 0) foBreakdown.push({ typeName: typeGroup.typeName, count: fos });
  }
  const totalPilots = totalCaptains + totalFOs;

  const flightOps = [];
  const captainRole = role('Captain', totalCaptains, 12000);
  if (captainRole) { captainRole.typeBreakdown = captainBreakdown; flightOps.push(captainRole); }
  const foRole = role('First Officer', totalFOs, 7000);
  if (foRole) { foRole.typeBreakdown = foBreakdown; flightOps.push(foRole); }
  if (N > 0) flightOps.push(role('Dispatcher / OCC Controller', Math.max(1, c(era.OPA * N)), 5500));
  if (E >= 2 && era.CSA > 0) {
    flightOps.push(role('Crew Scheduler / Controller', Math.max(1, c(era.CSA * N)), 5000));
  }
  if (E >= 3 && totalPilots > 0) {
    flightOps.push(role('Training Captain', Math.max(1, c(totalPilots / 40)), 14000));
  }

  // ━━━ CABIN SERVICES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Cabin crew counts come from route × aircraft type requirements + 20% spare
  const totalCabinCrew = crewFromRoutes.totalCabinCrew || 0;

  const cabin = [];
  cabin.push(role('Cabin Crew', totalCabinCrew, 3500));
  if (totalCabinCrew > 0) cabin.push(role('Cabin Manager / Purser', Math.max(1, c(totalCabinCrew / 12)), 5000));
  if (E >= 3 && totalCabinCrew > 0) cabin.push(role('Cabin Services Manager', 1, 10000));
  if (E >= 4 && totalCabinCrew > 0) cabin.push(role('In-Flight Service Trainer', Math.max(1, c(0.02 * N)), 6000));

  // ━━━ GROUND HANDLING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const ground = [];
  if (E >= 2) ground.push(role('Ground Handler', c(0.5 * N), 3200));
  if (E >= 3) ground.push(role('Station Manager', Math.max(1, c(0.08 * N)), 6500));
  if (E >= 4) ground.push(role('Ramp Supervisor', Math.max(1, c(0.05 * N)), 4500));
  if (E >= 5) ground.push(role('Station Director', Math.max(1, c(0.02 * N)), 9000));

  // ━━━ ENGINEERING & MRO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const eng = [];
  if (era.MPA > 0) {
    eng.push(role('Line Engineer / Technician', c(era.MPA * N), 6000));
  }
  if (E === 1) {
    // Era 1: fully outsourced, just a liaison once N>=2
    if (N >= 2) eng.push(role('Maintenance Liaison', 1, 5500));
  }
  if (E >= 2) eng.push(role('Maintenance Manager', 1, 11000));
  if (era.MPP > 0) {
    eng.push(role('Maintenance Planner / Tech Records', Math.max(1, c(era.MPP * N)), 5500));
  }
  if (E >= 4) eng.push(role('Quality Assurance Engineer', Math.max(1, c(0.03 * N)), 7000));
  if (E >= 5) eng.push(role('Stores / Parts Manager', Math.max(1, c(0.02 * N)), 5000));

  // ━━━ COMMERCIAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const comm = [];
  if (E >= 2) comm.push(role('Sales Executive', Math.max(1, c(0.05 * N)), 7000));
  if (E >= 2) comm.push(role('Marketing Executive', Math.max(1, c(0.03 * N)), 7000));
  if (E >= 3) comm.push(role('Network Planner', Math.max(1, c(0.04 * N)), 9000));
  if (E >= 3) comm.push(role('Revenue Management Analyst', Math.max(1, c(0.03 * N)), 9500, 1985));
  if (E >= 3) comm.push(role('Customer Support Agent', Math.max(2, c(0.1 * N)), 4000));
  if (E >= 4) comm.push(role('Digital Marketing Manager', 1, 8000, 2000));
  if (E >= 4) comm.push(role('Social Media Manager', 1, 5500, 2010));
  if (E >= 4) comm.push(role('Loyalty Programme Manager', 1, 8000, 1990));
  if (E >= 4) comm.push(role('Partnerships / Alliances Manager', 1, 8000));
  if (E >= 4) comm.push(role('Cargo Sales Executive', Math.max(1, c(0.02 * N)), 6500));
  if (E >= 5) comm.push(role('Pricing Analyst', Math.max(2, c(0.03 * N)), 8000));
  if (E >= 5) comm.push(role('Market Research Analyst', Math.max(1, c(0.01 * N)), 7500));
  if (E >= 6) comm.push(role('Brand Strategist', Math.max(1, c(0.005 * N)), 9000));

  // ━━━ CORPORATE & ADMIN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const corp = [];
  if (E >= 2) corp.push(role('Finance Accountant', Math.max(1, c(0.03 * N)), 7000));
  if (E >= 2) corp.push(role('HR Coordinator', Math.max(1, c(0.02 * N)), 6000));
  if (E >= 2) corp.push(role('IT Systems Administrator', Math.max(1, c(0.02 * N)), 7000, 1970));
  if (E >= 3) corp.push(role('Legal / Contracts Specialist', Math.max(1, c(0.01 * N)), 10000));
  if (E >= 3) corp.push(role('Procurement Specialist', Math.max(1, c(0.01 * N)), 7500));
  if (E >= 4) corp.push(role('Internal Auditor', Math.max(1, c(0.01 * N)), 7500));
  if (E >= 4) corp.push(role('Data / BI Analyst', Math.max(1, c(0.02 * N)), 8500, 1995));
  if (E >= 5) corp.push(role('Cybersecurity Specialist', Math.max(1, c(0.01 * N)), 9000, 2005));
  if (E >= 5) corp.push(role('Corporate Communications', Math.max(1, c(0.01 * N)), 7500));
  if (E >= 5) corp.push(role('Investor Relations', Math.max(1, c(0.005 * N)), 8000));
  if (E >= 5) corp.push(role('Risk & Compliance Analyst', Math.max(2, c(0.02 * N)), 8000));
  if (E >= 6) corp.push(role('ESG / Sustainability Manager', 1, 8500, 2015));
  if (E >= 6) corp.push(role('Transformation / Change Manager', Math.max(1, c(0.005 * N)), 9000));

  // ━━━ Build department objects ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const deptRolesMap = {
    executive: exec, flight_ops: flightOps, cabin, ground, engineering: eng,
    commercial: comm, corporate: corp
  };

  let totalEmployees = 0;
  let totalWeeklyCost = 0;

  for (const dept of DEPARTMENTS) {
    const roles = (deptRolesMap[dept.key] || []).filter(r => r !== null);
    const deptMod = (salaryModifiers[dept.key] || 1.0) * globalMod;

    let deptEmployees = 0;
    let deptCost = 0;

    for (const r of roles) {
      r.adjustedSalary = Math.round(r.baseSalary * deptMod);
      r.totalCost = r.adjustedSalary * r.count;
      deptEmployees += r.count;
      deptCost += r.totalCost;
    }

    departments.push({
      key: dept.key,
      label: dept.label,
      outsourceable: dept.outsourceable,
      contractorKey: dept.contractorKey || null,
      salaryModifier: deptMod,
      roles,
      totalEmployees: deptEmployees,
      totalWeeklyCost: deptCost
    });

    totalEmployees += deptEmployees;
    totalWeeklyCost += deptCost;
  }

  return {
    departments,
    summary: { totalEmployees, totalWeeklyCost },
    eraLabel: era.label,
    eraIdx: E,
    fleetSize: N
  };
}


// ─── Name Generation (for client-side use — exported as arrays) ─────────────
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
  'Nakamura','Kimura','Hayashi','Shimizu','Mori','Matsumoto','Inoue','Okada','Hasegawa','Fujita',
  'Okonkwo','Adeyemi','Oluwole','Bakare','Chukwu','Eze','Musa','Abubakar','Bello','Ibrahim',
  'Park','Kim','Choi','Jeong','Kang','Cho','Yoon','Jang','Lim','Han',
  'Fernandez','Gomez','Diaz','Ruiz','Reyes','Morales','Jimenez','Castillo','Vargas','Herrera'
];

module.exports = {
  STAFF_ERAS,
  DEPARTMENTS,
  FIRST_NAMES,
  LAST_NAMES,
  getStaffEra,
  computeStaffRoster
};
