let selectedUserId = null;
let selectedUserData = null;
let selectedPermissionUserId = null;
let selectedPermissionUserData = null;
let allUsers = [];


// Load all users
async function loadUsers() {
  try {
    const response = await fetch('/api/admin/users');
    const users = await response.json();
    allUsers = users; // Store for search functionality

    const tbody = document.getElementById('usersTableBody');

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="padding: 1rem; text-align: center; color: var(--text-muted);">No users found</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = users.map(user => {
      const creditColor = user.unlimitedCredits ? 'var(--accent-color)' :
                         user.credits < 0 ? 'var(--warning-color)' :
                         user.credits < 4 ? 'var(--text-secondary)' :
                         'var(--success-color)';
      const creditDisplay = user.unlimitedCredits ? '∞' : user.credits;

      // Format permissions display
      let permissionStatus = '';
      if (user.isAdmin && user.isContributor) {
        permissionStatus = '<span style="color: var(--success-color); font-weight: bold;">ADMIN & CONTRIBUTOR</span>';
      } else if (user.isAdmin) {
        permissionStatus = '<span style="color: var(--success-color); font-weight: bold;">ADMIN</span>';
      } else if (user.isContributor) {
        permissionStatus = '<span style="color: var(--accent-color); font-weight: bold;">CONTRIBUTOR</span>';
      } else {
        permissionStatus = '<span style="color: var(--text-secondary);">STANDARD</span>';
      }

      return `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 0.5rem; font-family: 'Courier New', monospace;">${user.vatsimId}</td>
          <td style="padding: 0.5rem;">${user.firstName} ${user.lastName}</td>
          <td style="padding: 0.5rem; color: var(--text-secondary);">${user.email || 'N/A'}</td>
          <td style="padding: 0.5rem; text-align: center; font-family: 'Courier New', monospace;">${user.membershipCount}</td>
          <td style="padding: 0.5rem; text-align: center; font-family: 'Courier New', monospace; color: ${creditColor}; font-weight: 600;">${creditDisplay}</td>
          <td style="padding: 0.5rem; text-align: center;">${permissionStatus}</td>
          <td style="padding: 0.5rem; text-align: center;">
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
              <button class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick='openEditModal(${JSON.stringify(user).replace(/'/g, "&#39;")})'>Edit Credits</button>
              <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick='openPermissionModal(${JSON.stringify(user).replace(/'/g, "&#39;")})'>Detailed Permissions</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading users:', error);
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 1rem; text-align: center; color: var(--warning-color);">Error loading users</td>
      </tr>
    `;
  }
}

// Search users
function searchUsers() {
  const searchTerm = document.getElementById('searchUserInput').value.toLowerCase();

  if (!searchTerm) {
    loadUsers();
    return;
  }

  const filteredUsers = allUsers.filter(user =>
    user.vatsimId.toLowerCase().includes(searchTerm) ||
    (user.firstName + ' ' + user.lastName).toLowerCase().includes(searchTerm)
  );

  const tbody = document.getElementById('usersTableBody');

  if (filteredUsers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 1rem; text-align: center; color: var(--text-muted);">No users found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredUsers.map(user => {
    const creditColor = user.unlimitedCredits ? 'var(--accent-color)' :
                       user.credits < 0 ? 'var(--warning-color)' :
                       user.credits < 4 ? 'var(--text-secondary)' :
                       'var(--success-color)';
    const creditDisplay = user.unlimitedCredits ? '∞' : user.credits;

    // Format permissions display
    let permissionStatus = '';
    if (user.isAdmin && user.isContributor) {
      permissionStatus = '<span style="color: var(--success-color); font-weight: bold;">ADMIN & CONTRIBUTOR</span>';
    } else if (user.isAdmin) {
      permissionStatus = '<span style="color: var(--success-color); font-weight: bold;">ADMIN</span>';
    } else if (user.isContributor) {
      permissionStatus = '<span style="color: var(--accent-color); font-weight: bold;">CONTRIBUTOR</span>';
    } else {
      permissionStatus = '<span style="color: var(--text-secondary);">STANDARD</span>';
    }

    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 0.5rem; font-family: 'Courier New', monospace;">${user.vatsimId}</td>
        <td style="padding: 0.5rem;">${user.firstName} ${user.lastName}</td>
        <td style="padding: 0.5rem; color: var(--text-secondary);">${user.email || 'N/A'}</td>
        <td style="padding: 0.5rem; text-align: center; font-family: 'Courier New', monospace;">${user.membershipCount}</td>
        <td style="padding: 0.5rem; text-align: center; font-family: 'Courier New', monospace; color: ${creditColor}; font-weight: 600;">${creditDisplay}</td>
        <td style="padding: 0.5rem; text-align: center;">${permissionStatus}</td>
        <td style="padding: 0.5rem; text-align: center;">
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <button class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick='openEditModal(${JSON.stringify(user).replace(/'/g, "&#39;")})'>Edit Credits</button>
            <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick='openPermissionModal(${JSON.stringify(user).replace(/'/g, "&#39;")})'>Detailed Permissions</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}


// Open edit modal
function openEditModal(user) {
  selectedUserId = user.id;
  selectedUserData = user;
  document.getElementById('editUserName').textContent = `${user.firstName} ${user.lastName} (${user.vatsimId})`;
  document.getElementById('editCurrentCredits').textContent = user.unlimitedCredits ? '∞ (Unlimited)' : user.credits;
  document.getElementById('newCredits').value = user.credits;
  document.getElementById('unlimitedCredits').checked = !!user.unlimitedCredits;
  document.getElementById('editError').style.display = 'none';
  document.getElementById('editCreditsModal').style.display = 'flex';
}

// Close edit modal
function closeEditModal() {
  document.getElementById('editCreditsModal').style.display = 'none';
  selectedUserId = null;
  selectedUserData = null;
}

// Open permission modal
function openPermissionModal(user) {
  selectedPermissionUserId = user.id;
  selectedPermissionUserData = user;
  document.getElementById('permissionUserName').textContent = `${user.firstName} ${user.lastName} (${user.vatsimId})`;
  document.getElementById('isAdminSelect').value = user.isAdmin.toString();
  document.getElementById('isContributorSelect').value = user.isContributor.toString();
  document.getElementById('permissionError').style.display = 'none';
  document.getElementById('permissionModal').style.display = 'flex';
}

// Close permission modal
function closePermissionModal() {
  document.getElementById('permissionModal').style.display = 'none';
  selectedPermissionUserId = null;
  selectedPermissionUserData = null;
}

// Confirm edit
async function confirmEdit() {
  const newCredits = parseInt(document.getElementById('newCredits').value);
  const unlimited = document.getElementById('unlimitedCredits').checked;
  const errorDiv = document.getElementById('editError');

  if (isNaN(newCredits)) {
    errorDiv.textContent = 'Please enter a valid number';
    errorDiv.style.display = 'block';
    return;
  }

  try {
    const response = await fetch(`/api/admin/users/${selectedUserId}/credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ credits: newCredits, unlimitedCredits: unlimited })
    });

    const data = await response.json();

    if (response.ok) {
      closeEditModal();
      loadUsers();
    } else {
      errorDiv.textContent = data.error || 'Failed to update credits';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Error updating credits:', error);
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

// Confirm permission update
async function confirmPermissionUpdate() {
  const isAdmin = document.getElementById('isAdminSelect').value === 'true';
  const isContributor = document.getElementById('isContributorSelect').value === 'true';
  const errorDiv = document.getElementById('permissionError');

  try {
    const response = await fetch(`/api/admin/users/${selectedPermissionUserId}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        isAdmin: isAdmin,
        isContributor: isContributor
      })
    });

    const data = await response.json();

    if (response.ok) {
      closePermissionModal();
      loadUsers();
    } else {
      errorDiv.textContent = data.error || 'Failed to update permissions';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Error updating permissions:', error);
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

// ==================== AIRCRAFT MANAGEMENT ====================

let allAircraft = [];
let selectedAircraftId = null;
let deleteAircraftId = null;

// Switch between tabs
function switchTab(tab) {
  // Update tab buttons
  const usersTab = document.getElementById('usersTab');
  const aircraftTab = document.getElementById('aircraftTab');
  const airportsTab = document.getElementById('airportsTab');
  const worldsTab = document.getElementById('worldsTab');
  const airlinesTab = document.getElementById('airlinesTab');
  const settingsTab = document.getElementById('settingsTab');

  // Remove active state from all tabs
  [usersTab, aircraftTab, airportsTab, worldsTab, airlinesTab, settingsTab].forEach(t => {
    if (t) {
      t.classList.remove('active');
      t.style.borderBottom = '3px solid transparent';
      t.style.color = 'var(--text-muted)';
    }
  });

  // Hide all sections
  document.getElementById('usersSection').style.display = 'none';
  document.getElementById('aircraftSection').style.display = 'none';
  document.getElementById('airportsSection').style.display = 'none';
  document.getElementById('worldsSection').style.display = 'none';
  document.getElementById('airlinesSection').style.display = 'none';
  document.getElementById('settingsSection').style.display = 'none';

  if (tab === 'users') {
    usersTab.classList.add('active');
    usersTab.style.borderBottom = '3px solid var(--primary-color)';
    usersTab.style.color = 'var(--primary-color)';
    document.getElementById('usersSection').style.display = 'block';
  } else if (tab === 'aircraft') {
    aircraftTab.classList.add('active');
    aircraftTab.style.borderBottom = '3px solid var(--primary-color)';
    aircraftTab.style.color = 'var(--primary-color)';
    document.getElementById('aircraftSection').style.display = 'block';

    // Load aircraft if not already loaded
    if (allAircraft.length === 0) {
      loadAircraft();
    }
  } else if (tab === 'airports') {
    airportsTab.classList.add('active');
    airportsTab.style.borderBottom = '3px solid var(--primary-color)';
    airportsTab.style.color = 'var(--primary-color)';
    document.getElementById('airportsSection').style.display = 'block';

    // Load airports if not already loaded
    if (allAirports.length === 0) {
      loadAirports();
    }
  } else if (tab === 'worlds') {
    worldsTab.classList.add('active');
    worldsTab.style.borderBottom = '3px solid var(--primary-color)';
    worldsTab.style.color = 'var(--primary-color)';
    document.getElementById('worldsSection').style.display = 'block';

    // Load worlds if not already loaded
    if (typeof allWorlds === 'undefined' || allWorlds.length === 0) {
      loadWorlds();
    }
  } else if (tab === 'airlines') {
    airlinesTab.classList.add('active');
    airlinesTab.style.borderBottom = '3px solid var(--primary-color)';
    airlinesTab.style.color = 'var(--primary-color)';
    document.getElementById('airlinesSection').style.display = 'block';

    // Load worlds dropdown if not already loaded
    loadAirlinesWorldDropdown();
  } else if (tab === 'settings') {
    settingsTab.classList.add('active');
    settingsTab.style.borderBottom = '3px solid var(--primary-color)';
    settingsTab.style.color = 'var(--primary-color)';
    document.getElementById('settingsSection').style.display = 'block';

    // Load current sidebar setting
    loadSidebarSetting();
  }
}

// Load all aircraft
async function loadAircraft() {
  try {
    const response = await fetch('/api/admin/aircraft');
    const aircraft = await response.json();
    allAircraft = aircraft;

    renderAircraftTable(aircraft);
  } catch (error) {
    console.error('Error loading aircraft:', error);
    const tbody = document.getElementById('aircraftTableBody');
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 1rem; text-align: center; color: var(--warning-color);">Error loading aircraft</td>
      </tr>
    `;
  }
}

// Render aircraft table
function renderAircraftTable(aircraft) {
  const tbody = document.getElementById('aircraftTableBody');

  if (aircraft.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 1rem; text-align: center; color: var(--text-muted);">No aircraft found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = aircraft.map(ac => {
    const fullName = ac.variant ? `${ac.manufacturer} ${ac.model}${ac.variant.startsWith('-') ? ac.variant : '-' + ac.variant}` : `${ac.manufacturer} ${ac.model}`;
    const statusColor = ac.isActive ? 'var(--success-color)' : 'var(--text-secondary)';
    const statusText = ac.isActive ? 'ACTIVE' : 'INACTIVE';
    const operationalYears = (ac.availableFrom || 'Start') + ' - ' + (ac.availableUntil || 'Present');

    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 0.5rem; font-weight: 600;">${fullName}</td>
        <td style="padding: 0.5rem; text-align: center;">${ac.type}</td>
        <td style="padding: 0.5rem; text-align: center;">${ac.rangeCategory}<br><span style="color: var(--text-secondary); font-size: 0.85rem;">${ac.rangeNm} NM</span></td>
        <td style="padding: 0.5rem; text-align: center; font-family: 'Courier New', monospace;">${operationalYears}</td>
        <td style="padding: 0.5rem; text-align: center; font-family: 'Courier New', monospace;">$${parseInt(ac.purchasePrice).toLocaleString()}</td>
        <td style="padding: 0.5rem; text-align: center; color: ${statusColor}; font-weight: 600;">${statusText}</td>
        <td style="padding: 0.5rem; text-align: center;">
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <button class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick='openEditAircraftModal(${JSON.stringify(ac).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; background: #dc2626; border-color: #dc2626; color: white;" onclick='openDeleteAircraftModal("${ac.id}", "${fullName.replace(/'/g, "&#39;")}")'>Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Search aircraft
function searchAircraft() {
  const searchTerm = document.getElementById('searchAircraftInput').value.toLowerCase();

  if (!searchTerm) {
    renderAircraftTable(allAircraft);
    return;
  }

  const filteredAircraft = allAircraft.filter(ac => {
    const fullName = `${ac.manufacturer} ${ac.model}`.toLowerCase();
    return fullName.includes(searchTerm) ||
           ac.manufacturer.toLowerCase().includes(searchTerm) ||
           ac.model.toLowerCase().includes(searchTerm);
  });

  renderAircraftTable(filteredAircraft);
}

// Open add aircraft modal
function openAddAircraftModal() {
  selectedAircraftId = null;
  document.getElementById('aircraftModalTitle').textContent = 'ADD AIRCRAFT';
  clearAircraftForm();
  document.getElementById('aircraftModal').style.display = 'flex';
}

// Open edit aircraft modal
function openEditAircraftModal(aircraft) {
  selectedAircraftId = aircraft.id;
  document.getElementById('aircraftModalTitle').textContent = 'EDIT AIRCRAFT';

  // Populate form
  document.getElementById('aircraftManufacturer').value = aircraft.manufacturer || '';
  document.getElementById('aircraftModel').value = aircraft.model || '';
  document.getElementById('aircraftVariant').value = aircraft.variant || '';
  document.getElementById('aircraftType').value = aircraft.type || '';
  document.getElementById('aircraftRangeCategory').value = aircraft.rangeCategory || '';
  document.getElementById('aircraftRangeNm').value = aircraft.rangeNm || '';
  document.getElementById('aircraftCruiseSpeed').value = aircraft.cruiseSpeed || '';
  document.getElementById('aircraftPassengerCapacity').value = aircraft.passengerCapacity || '';
  document.getElementById('aircraftCargoCapacity').value = aircraft.cargoCapacityKg || '';
  document.getElementById('aircraftFuelCapacity').value = aircraft.fuelCapacityLiters || '';
  document.getElementById('aircraftPurchasePrice').value = aircraft.purchasePrice || '';
  document.getElementById('aircraftUsedPrice').value = aircraft.usedPrice || '';
  document.getElementById('aircraftMaintenanceCost').value = aircraft.maintenanceCostPerHour || '';
  document.getElementById('aircraftMaintenanceMonth').value = aircraft.maintenanceCostPerMonth || '';
  document.getElementById('aircraftFuelBurn').value = aircraft.fuelBurnPerHour || '';
  document.getElementById('aircraftFirstIntroduced').value = aircraft.firstIntroduced || '';
  document.getElementById('aircraftAvailableFrom').value = aircraft.availableFrom || '';
  document.getElementById('aircraftAvailableUntil').value = aircraft.availableUntil || '';
  document.getElementById('aircraftRequiredPilots').value = aircraft.requiredPilots !== undefined ? aircraft.requiredPilots : 2;
  document.getElementById('aircraftRequiredCabinCrew').value = aircraft.requiredCabinCrew !== undefined ? aircraft.requiredCabinCrew : 0;
  document.getElementById('aircraftIsActive').value = aircraft.isActive ? 'true' : 'false';
  document.getElementById('aircraftDescription').value = aircraft.description || '';

  document.getElementById('aircraftError').style.display = 'none';
  document.getElementById('aircraftModal').style.display = 'flex';
}

// Close aircraft modal
function closeAircraftModal() {
  document.getElementById('aircraftModal').style.display = 'none';
  selectedAircraftId = null;
  clearAircraftForm();
}

// Clear aircraft form
function clearAircraftForm() {
  document.getElementById('aircraftManufacturer').value = '';
  document.getElementById('aircraftModel').value = '';
  document.getElementById('aircraftVariant').value = '';
  document.getElementById('aircraftType').value = '';
  document.getElementById('aircraftRangeCategory').value = '';
  document.getElementById('aircraftRangeNm').value = '';
  document.getElementById('aircraftCruiseSpeed').value = '';
  document.getElementById('aircraftPassengerCapacity').value = '';
  document.getElementById('aircraftCargoCapacity').value = '';
  document.getElementById('aircraftFuelCapacity').value = '';
  document.getElementById('aircraftPurchasePrice').value = '';
  document.getElementById('aircraftUsedPrice').value = '';
  document.getElementById('aircraftMaintenanceCost').value = '';
  document.getElementById('aircraftMaintenanceMonth').value = '';
  document.getElementById('aircraftFuelBurn').value = '';
  document.getElementById('aircraftFirstIntroduced').value = '';
  document.getElementById('aircraftAvailableFrom').value = '';
  document.getElementById('aircraftAvailableUntil').value = '';
  document.getElementById('aircraftRequiredPilots').value = '2';
  document.getElementById('aircraftRequiredCabinCrew').value = '0';
  document.getElementById('aircraftIsActive').value = 'true';
  document.getElementById('aircraftDescription').value = '';
  document.getElementById('aircraftError').style.display = 'none';
}

// Save aircraft (create or update)
async function saveAircraft() {
  const errorDiv = document.getElementById('aircraftError');

  const aircraftData = {
    manufacturer: document.getElementById('aircraftManufacturer').value.trim(),
    model: document.getElementById('aircraftModel').value.trim(),
    variant: document.getElementById('aircraftVariant').value.trim() || null,
    type: document.getElementById('aircraftType').value,
    rangeCategory: document.getElementById('aircraftRangeCategory').value,
    rangeNm: parseInt(document.getElementById('aircraftRangeNm').value),
    cruiseSpeed: parseInt(document.getElementById('aircraftCruiseSpeed').value),
    passengerCapacity: parseInt(document.getElementById('aircraftPassengerCapacity').value),
    cargoCapacityKg: parseInt(document.getElementById('aircraftCargoCapacity').value) || null,
    fuelCapacityLiters: parseInt(document.getElementById('aircraftFuelCapacity').value),
    purchasePrice: parseFloat(document.getElementById('aircraftPurchasePrice').value),
    usedPrice: parseFloat(document.getElementById('aircraftUsedPrice').value) || null,
    maintenanceCostPerHour: parseFloat(document.getElementById('aircraftMaintenanceCost').value),
    maintenanceCostPerMonth: parseFloat(document.getElementById('aircraftMaintenanceMonth').value) || null,
    fuelBurnPerHour: parseFloat(document.getElementById('aircraftFuelBurn').value),
    firstIntroduced: parseInt(document.getElementById('aircraftFirstIntroduced').value) || null,
    availableFrom: parseInt(document.getElementById('aircraftAvailableFrom').value) || null,
    availableUntil: parseInt(document.getElementById('aircraftAvailableUntil').value) || null,
    requiredPilots: parseInt(document.getElementById('aircraftRequiredPilots').value) || 2,
    requiredCabinCrew: parseInt(document.getElementById('aircraftRequiredCabinCrew').value) || 0,
    isActive: document.getElementById('aircraftIsActive').value === 'true',
    description: document.getElementById('aircraftDescription').value.trim() || null
  };

  // Validate required fields
  if (!aircraftData.manufacturer || !aircraftData.model || !aircraftData.type || !aircraftData.rangeCategory) {
    errorDiv.textContent = 'Please fill in all required fields';
    errorDiv.style.display = 'block';
    return;
  }

  try {
    let response;
    if (selectedAircraftId) {
      // Update existing aircraft
      response = await fetch(`/api/admin/aircraft/${selectedAircraftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aircraftData)
      });
    } else {
      // Create new aircraft
      response = await fetch('/api/admin/aircraft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aircraftData)
      });
    }

    const data = await response.json();

    if (response.ok) {
      closeAircraftModal();
      loadAircraft();
    } else {
      errorDiv.textContent = data.error || 'Failed to save aircraft';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Error saving aircraft:', error);
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

// Open delete aircraft modal
function openDeleteAircraftModal(aircraftId, aircraftName) {
  deleteAircraftId = aircraftId;
  document.getElementById('deleteAircraftName').textContent = aircraftName;
  document.getElementById('deleteAircraftModal').style.display = 'flex';
}

// Close delete aircraft modal
function closeDeleteAircraftModal() {
  document.getElementById('deleteAircraftModal').style.display = 'none';
  deleteAircraftId = null;
}

// Confirm delete aircraft
async function confirmDeleteAircraft() {
  if (!deleteAircraftId) return;

  try {
    const response = await fetch(`/api/admin/aircraft/${deleteAircraftId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      closeDeleteAircraftModal();
      loadAircraft();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to delete aircraft');
    }
  } catch (error) {
    console.error('Error deleting aircraft:', error);
    alert('Network error. Please try again.');
  }
}

// ==================== AIRPORTS MANAGEMENT ====================

let allAirports = [];
let selectedAirportId = null;
let deleteAirportId = null;

// ==================== WORLDS MANAGEMENT ====================

let allWorlds = [];
let mpWorlds = [];
let spWorlds = [];
let selectedWorldId = null;
let deleteWorldId = null;

// Load all worlds
async function loadWorlds() {
  try {
    const response = await fetch('/api/admin/worlds');
    const worlds = await response.json();
    allWorlds = worlds;

    // Split into multiplayer and singleplayer
    mpWorlds = worlds.filter(w => w.worldType !== 'singleplayer');
    spWorlds = worlds.filter(w => w.worldType === 'singleplayer');

    renderMpWorldsTable(mpWorlds);
    renderSpWorldsTable(spWorlds);
  } catch (error) {
    console.error('Error loading worlds:', error);
    document.getElementById('mpWorldsTableBody').innerHTML = `
      <tr><td colspan="7" style="padding: 1rem; text-align: center; color: var(--warning-color);">Error loading worlds</td></tr>
    `;
    document.getElementById('spWorldsTableBody').innerHTML = `
      <tr><td colspan="7" style="padding: 1rem; text-align: center; color: var(--warning-color);">Error loading worlds</td></tr>
    `;
  }
}

// Render multiplayer worlds table
function renderMpWorldsTable(worlds) {
  const tbody = document.getElementById('mpWorldsTableBody');

  if (worlds.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding: 1rem; text-align: center; color: var(--text-muted);">No multiplayer worlds found</td></tr>`;
    return;
  }

  tbody.innerHTML = worlds.map(world => {
    const statusColor = world.status === 'active' ? 'var(--success-color)' :
                       world.status === 'paused' ? 'var(--warning-color)' :
                       world.status === 'completed' ? 'var(--text-secondary)' :
                       'var(--accent-color)';
    const statusText = world.status.charAt(0).toUpperCase() + world.status.slice(1);
    const currentTime = new Date(world.currentTime);
    const formattedTime = currentTime.toLocaleDateString('en-GB') + ' ' + currentTime.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'});

    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 0.5rem; font-weight: 600;">${world.name}</td>
        <td style="padding: 0.5rem; text-align: center;">${world.era}</td>
        <td style="padding: 0.5rem; text-align: center;">${formattedTime}</td>
        <td style="padding: 0.5rem; text-align: center;">${world.memberCount || 0}/${world.maxPlayers || 100}</td>
        <td style="padding: 0.5rem; text-align: center; color: ${statusColor}; font-weight: 600;">${statusText}</td>
        <td style="padding: 0.5rem; text-align: center; font-family: 'Courier New', monospace;">${world.timeAcceleration || 60}x</td>
        <td style="padding: 0.5rem; text-align: center;">
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <button class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick='openEditWorldModal(${JSON.stringify(world).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; background: #dc2626; border-color: #dc2626; color: white;" onclick='openDeleteWorldModal("${world.id}", "${world.name.replace(/'/g, "&#39;")}")'>Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Render singleplayer worlds table
function renderSpWorldsTable(worlds) {
  const tbody = document.getElementById('spWorldsTableBody');

  if (worlds.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding: 1rem; text-align: center; color: var(--text-muted);">No single player worlds found</td></tr>`;
    return;
  }

  tbody.innerHTML = worlds.map(world => {
    const statusColor = world.status === 'active' ? 'var(--success-color)' :
                       world.status === 'paused' ? 'var(--warning-color)' :
                       world.status === 'completed' ? 'var(--text-secondary)' :
                       'var(--accent-color)';
    const statusText = world.status.charAt(0).toUpperCase() + world.status.slice(1);
    const currentTime = new Date(world.currentTime);
    const formattedTime = currentTime.toLocaleDateString('en-GB') + ' ' + currentTime.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'});
    const ownerName = world.owner ? `${world.owner.firstName} ${world.owner.lastName}` : 'Unknown';

    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 0.5rem; font-weight: 600;">${world.name}</td>
        <td style="padding: 0.5rem;">${ownerName}</td>
        <td style="padding: 0.5rem; text-align: center;">${world.era}</td>
        <td style="padding: 0.5rem; text-align: center;">${formattedTime}</td>
        <td style="padding: 0.5rem; text-align: center; color: ${statusColor}; font-weight: 600;">${statusText}</td>
        <td style="padding: 0.5rem; text-align: center; font-family: 'Courier New', monospace;">${world.timeAcceleration || 60}x</td>
        <td style="padding: 0.5rem; text-align: center;">
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <button class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick='openEditWorldModal(${JSON.stringify(world).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; background: #dc2626; border-color: #dc2626; color: white;" onclick='openDeleteWorldModal("${world.id}", "${world.name.replace(/'/g, "&#39;")}")'>Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Search worlds by type
function searchWorlds(type) {
  const inputId = type === 'singleplayer' ? 'searchSpWorldInput' : 'searchMpWorldInput';
  const searchTerm = document.getElementById(inputId).value.toLowerCase();
  const sourceWorlds = type === 'singleplayer' ? spWorlds : mpWorlds;

  if (!searchTerm) {
    if (type === 'singleplayer') {
      renderSpWorldsTable(spWorlds);
    } else {
      renderMpWorldsTable(mpWorlds);
    }
    return;
  }

  const filtered = sourceWorlds.filter(world => {
    const matchesName = world.name.toLowerCase().includes(searchTerm);
    const matchesEra = world.era.toString().includes(searchTerm);
    const matchesOwner = type === 'singleplayer' && world.owner &&
      `${world.owner.firstName} ${world.owner.lastName}`.toLowerCase().includes(searchTerm);
    return matchesName || matchesEra || matchesOwner;
  });

  if (type === 'singleplayer') {
    renderSpWorldsTable(filtered);
  } else {
    renderMpWorldsTable(filtered);
  }
}

// Open add world modal
function openAddWorldModal(worldType) {
  selectedWorldId = null;
  const isSp = worldType === 'singleplayer';
  document.getElementById('worldModalTitle').textContent = isSp ? 'ADD SINGLE PLAYER WORLD' : 'ADD MULTIPLAYER WORLD';
  clearWorldForm();
  document.getElementById('worldType').value = worldType || 'multiplayer';

  // Show/hide SP-specific fields
  document.getElementById('worldOwnerGroup').style.display = isSp ? 'block' : 'none';
  document.getElementById('worldDifficultyGroup').style.display = isSp ? 'block' : 'none';
  document.getElementById('worldMaxPlayersGroup').style.display = isSp ? 'none' : 'block';

  // Load user list for owner dropdown if SP
  if (isSp) {
    loadWorldOwnerDropdown();
  }

  document.getElementById('worldModal').style.display = 'flex';
}

// Load users into owner dropdown
async function loadWorldOwnerDropdown() {
  const select = document.getElementById('worldOwnerSelect');
  select.innerHTML = '<option value="">-- Loading... --</option>';

  try {
    const response = await fetch('/api/admin/users');
    const users = await response.json();

    select.innerHTML = '<option value="">-- Select Owner --</option>';
    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = `${user.firstName} ${user.lastName} (${user.vatsimId})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading users for owner dropdown:', error);
    select.innerHTML = '<option value="">-- Error loading users --</option>';
  }
}

// Open edit world modal
function openEditWorldModal(world) {
  selectedWorldId = world.id;
  const isSp = world.worldType === 'singleplayer';
  document.getElementById('worldModalTitle').textContent = 'EDIT WORLD';

  // Set world type
  document.getElementById('worldType').value = world.worldType || 'multiplayer';

  // Show/hide SP-specific fields
  document.getElementById('worldOwnerGroup').style.display = isSp ? 'block' : 'none';
  document.getElementById('worldDifficultyGroup').style.display = isSp ? 'block' : 'none';
  document.getElementById('worldMaxPlayersGroup').style.display = isSp ? 'none' : 'block';

  // Populate form
  document.getElementById('worldNameInput').value = world.name || '';
  document.getElementById('worldStartDate').value = world.startDate ? new Date(world.startDate).toISOString().split('T')[0] : '';
  document.getElementById('worldTimeAcceleration').value = world.timeAcceleration || 60;
  document.getElementById('worldMaxPlayers').value = world.maxPlayers || 100;
  document.getElementById('worldJoinCost').value = world.joinCost !== undefined ? world.joinCost : 10;
  document.getElementById('worldWeeklyCost').value = world.weeklyCost !== undefined ? world.weeklyCost : 1;
  document.getElementById('worldFreeWeeks').value = world.freeWeeks !== undefined ? world.freeWeeks : 0;
  document.getElementById('worldEndDate').value = world.endDate ? new Date(world.endDate).toISOString().split('T')[0] : '';
  document.getElementById('worldStatus').value = world.status || 'setup';
  document.getElementById('worldDescription').value = world.description || '';
  document.getElementById('worldDifficulty').value = world.difficulty || '';

  // Load owner dropdown if SP
  if (isSp) {
    loadWorldOwnerDropdown().then(() => {
      document.getElementById('worldOwnerSelect').value = world.ownerUserId || '';
    });
  }

  document.getElementById('worldError').style.display = 'none';
  document.getElementById('worldModal').style.display = 'flex';
}

// Close world modal
function closeWorldModal() {
  document.getElementById('worldModal').style.display = 'none';
  selectedWorldId = null;
  clearWorldForm();
}

// Clear world form
function clearWorldForm() {
  document.getElementById('worldNameInput').value = '';
  document.getElementById('worldStartDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('worldTimeAcceleration').value = '60';
  document.getElementById('worldMaxPlayers').value = '100';
  document.getElementById('worldJoinCost').value = '10';
  document.getElementById('worldWeeklyCost').value = '1';
  document.getElementById('worldFreeWeeks').value = '0';
  document.getElementById('worldEndDate').value = '';
  document.getElementById('worldStatus').value = 'setup';
  document.getElementById('worldDescription').value = '';
  document.getElementById('worldType').value = 'multiplayer';
  document.getElementById('worldOwnerSelect').value = '';
  document.getElementById('worldDifficulty').value = '';
  document.getElementById('worldError').style.display = 'none';
}

// Save world (create or update)
async function saveWorld() {
  const errorDiv = document.getElementById('worldError');
  const worldType = document.getElementById('worldType').value;
  const isSp = worldType === 'singleplayer';

  const startDate = document.getElementById('worldStartDate').value;

  const worldData = {
    name: document.getElementById('worldNameInput').value.trim(),
    era: startDate ? new Date(startDate).getFullYear() : new Date().getFullYear(),
    startDate: startDate,
    timeAcceleration: parseFloat(document.getElementById('worldTimeAcceleration').value),
    maxPlayers: isSp ? 1 : parseInt(document.getElementById('worldMaxPlayers').value),
    joinCost: parseInt(document.getElementById('worldJoinCost').value) || 10,
    weeklyCost: parseInt(document.getElementById('worldWeeklyCost').value) || 1,
    freeWeeks: parseInt(document.getElementById('worldFreeWeeks').value) || 0,
    endDate: document.getElementById('worldEndDate').value || null,
    status: document.getElementById('worldStatus').value,
    description: document.getElementById('worldDescription').value.trim() || null,
    worldType: worldType
  };

  // Add SP-specific fields
  if (isSp) {
    worldData.ownerUserId = document.getElementById('worldOwnerSelect').value || null;
    worldData.difficulty = document.getElementById('worldDifficulty').value || null;
  }

  // Validate required fields
  const missingFields = [];
  if (!worldData.name) missingFields.push('World Name');
  if (!worldData.startDate) missingFields.push('Start Date');
  if (isNaN(worldData.timeAcceleration)) missingFields.push('Time Acceleration');
  if (!worldData.status) missingFields.push('Status');
  if (isSp && !worldData.ownerUserId) missingFields.push('Owner');

  if (missingFields.length > 0) {
    errorDiv.textContent = 'Missing required fields: ' + missingFields.join(', ');
    errorDiv.style.display = 'block';
    return;
  }

  if (worldData.timeAcceleration <= 0) {
    errorDiv.textContent = 'Time acceleration must be greater than 0';
    errorDiv.style.display = 'block';
    return;
  }

  if (!isSp && (isNaN(worldData.maxPlayers) || worldData.maxPlayers <= 0)) {
    worldData.maxPlayers = 100;
  }

  try {
    let response;
    if (selectedWorldId) {
      response = await fetch(`/api/admin/worlds/${selectedWorldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(worldData)
      });
    } else {
      response = await fetch('/api/admin/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(worldData)
      });
    }

    const data = await response.json();

    if (response.ok) {
      closeWorldModal();
      loadWorlds();
    } else {
      errorDiv.textContent = data.error || 'Failed to save world';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Error saving world:', error);
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

// Open delete world modal
function openDeleteWorldModal(worldId, worldName) {
  deleteWorldId = worldId;
  document.getElementById('deleteWorldName').textContent = worldName;
  document.getElementById('deleteWorldModal').style.display = 'flex';
}

// Close delete world modal
function closeDeleteWorldModal() {
  document.getElementById('deleteWorldModal').style.display = 'none';
  deleteWorldId = null;
}

// Confirm delete world
async function confirmDeleteWorld() {
  if (!deleteWorldId) return;

  // Show deleting overlay
  const modalBody = document.querySelector('#deleteWorldModal .modal-body');
  const modalFooter = document.querySelector('#deleteWorldModal .modal-footer');
  const originalBody = modalBody.innerHTML;
  const originalFooter = modalFooter.innerHTML;
  modalBody.innerHTML = `
    <div style="text-align: center; padding: 2rem 0;">
      <div style="font-size: 1.5rem; font-weight: 600; color: var(--warning-color); margin-bottom: 0.5rem;">Deleting World...</div>
      <div style="color: var(--text-secondary); font-size: 0.85rem;">Removing all associated data. This may take a moment.</div>
    </div>
  `;
  modalFooter.innerHTML = '';

  try {
    const response = await fetch(`/api/admin/worlds/${deleteWorldId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      closeDeleteWorldModal();
      loadWorlds();
    } else {
      const data = await response.json();
      modalBody.innerHTML = originalBody;
      modalFooter.innerHTML = originalFooter;
      alert(data.error || 'Failed to delete world');
    }
  } catch (error) {
    console.error('Error deleting world:', error);
    modalBody.innerHTML = originalBody;
    modalFooter.innerHTML = originalFooter;
    alert('Network error. Please try again.');
  }
}

// Load all airports
async function loadAirports() {
  try {
    const response = await fetch('/api/admin/airports');
    const airports = await response.json();
    allAirports = airports;

    renderAirportsTable(airports);
  } catch (error) {
    console.error('Error loading airports:', error);
    const tbody = document.getElementById('airportsTableBody');
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 1rem; text-align: center; color: var(--warning-color);">Error loading airports</td>
      </tr>
    `;
  }
}

// Render airports table
function renderAirportsTable(airports) {
  const tbody = document.getElementById('airportsTableBody');

  if (airports.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 1rem; text-align: center; color: var(--text-muted);">No airports found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = airports.map(airport => {
    const statusColor = airport.isActive ? 'var(--success-color)' : 'var(--text-secondary)';
    const statusText = airport.isActive ? 'ENABLED' : 'DISABLED';
    const codes = airport.iataCode ? `${airport.icaoCode} / ${airport.iataCode}` : airport.icaoCode;

    // Format operational dates
    let operationalDates = '';
    if (airport.operationalFrom && airport.operationalUntil) {
      operationalDates = `${airport.operationalFrom} - ${airport.operationalUntil}`;
    } else if (airport.operationalFrom) {
      operationalDates = `${airport.operationalFrom} - Present`;
    } else if (airport.operationalUntil) {
      operationalDates = `Unknown - ${airport.operationalUntil}`;
    } else {
      operationalDates = 'All periods';
    }

    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 0.5rem; font-weight: 600;">${airport.name}</td>
        <td style="padding: 0.5rem; text-align: center; font-family: 'Courier New', monospace;">${codes}</td>
        <td style="padding: 0.5rem; text-align: center;">${airport.city}<br><span style="color: var(--text-secondary); font-size: 0.85rem;">${airport.country}</span></td>
        <td style="padding: 0.5rem; text-align: center;">${airport.type}</td>
        <td style="padding: 0.5rem; text-align: center; font-size: 0.9rem;">${operationalDates}</td>
        <td style="padding: 0.5rem; text-align: center; color: ${statusColor}; font-weight: 600;">${statusText}</td>
        <td style="padding: 0.5rem; text-align: center;">
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <button class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick='openEditAirportModal(${JSON.stringify(airport).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; background: #dc2626; border-color: #dc2626; color: white;" onclick='openDeleteAirportModal("${airport.id}", "${airport.name.replace(/'/g, "&#39;")}")'>Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Search airports
function searchAirports() {
  const searchTerm = document.getElementById('searchAirportInput').value.toLowerCase();

  if (!searchTerm) {
    renderAirportsTable(allAirports);
    return;
  }

  const filteredAirports = allAirports.filter(airport => {
    return airport.name.toLowerCase().includes(searchTerm) ||
           airport.city.toLowerCase().includes(searchTerm) ||
           airport.country.toLowerCase().includes(searchTerm) ||
           airport.icaoCode.toLowerCase().includes(searchTerm) ||
           (airport.iataCode && airport.iataCode.toLowerCase().includes(searchTerm));
  });

  renderAirportsTable(filteredAirports);
}

// Clear airport cache
async function clearAirportCache() {
  try {
    const confirmed = confirm('This will clear the cached airport data and force all clients to reload. Continue?');
    if (!confirmed) return;

    const response = await fetch('/api/admin/airports/clear-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to clear cache');
    }

    alert(`✓ Cache cleared successfully! (${data.entriesCleared} entries removed)`);
  } catch (error) {
    console.error('Error clearing airport cache:', error);
    alert(`Error: ${error.message}`);
  }
}

// Open add airport modal
function openAddAirportModal() {
  selectedAirportId = null;
  document.getElementById('airportModalTitle').textContent = 'ADD AIRPORT';
  clearAirportForm();
  document.getElementById('airportModal').style.display = 'flex';
}

// Open edit airport modal
function openEditAirportModal(airport) {
  selectedAirportId = airport.id;
  document.getElementById('airportModalTitle').textContent = 'EDIT AIRPORT';

  // Populate form
  document.getElementById('airportIcaoCode').value = airport.icaoCode || '';
  document.getElementById('airportIataCode').value = airport.iataCode || '';
  document.getElementById('airportName').value = airport.name || '';
  document.getElementById('airportCity').value = airport.city || '';
  document.getElementById('airportCountry').value = airport.country || '';
  document.getElementById('airportLatitude').value = airport.latitude || '';
  document.getElementById('airportLongitude').value = airport.longitude || '';
  document.getElementById('airportElevation').value = airport.elevation || '';
  document.getElementById('airportType').value = airport.type || '';
  document.getElementById('airportTimezone').value = airport.timezone || '';
  document.getElementById('airportOperationalFrom').value = airport.operationalFrom || '';
  document.getElementById('airportOperationalUntil').value = airport.operationalUntil || '';
  document.getElementById('airportIsActive').value = airport.isActive ? 'true' : 'false';

  document.getElementById('airportError').style.display = 'none';
  document.getElementById('airportModal').style.display = 'flex';
}

// Close airport modal
function closeAirportModal() {
  document.getElementById('airportModal').style.display = 'none';
  selectedAirportId = null;
  clearAirportForm();
}

// Clear airport form
function clearAirportForm() {
  document.getElementById('airportIcaoCode').value = '';
  document.getElementById('airportIataCode').value = '';
  document.getElementById('airportName').value = '';
  document.getElementById('airportCity').value = '';
  document.getElementById('airportCountry').value = '';
  document.getElementById('airportLatitude').value = '';
  document.getElementById('airportLongitude').value = '';
  document.getElementById('airportElevation').value = '';
  document.getElementById('airportType').value = '';
  document.getElementById('airportTimezone').value = '';
  document.getElementById('airportOperationalFrom').value = '';
  document.getElementById('airportOperationalUntil').value = '';
  document.getElementById('airportIsActive').value = 'true';
  document.getElementById('airportError').style.display = 'none';
}

// Save airport (create or update)
async function saveAirport() {
  const errorDiv = document.getElementById('airportError');

  const airportData = {
    icaoCode: document.getElementById('airportIcaoCode').value.trim().toUpperCase(),
    iataCode: document.getElementById('airportIataCode').value.trim().toUpperCase() || null,
    name: document.getElementById('airportName').value.trim(),
    city: document.getElementById('airportCity').value.trim(),
    country: document.getElementById('airportCountry').value.trim(),
    latitude: parseFloat(document.getElementById('airportLatitude').value),
    longitude: parseFloat(document.getElementById('airportLongitude').value),
    elevation: parseInt(document.getElementById('airportElevation').value) || null,
    type: document.getElementById('airportType').value,
    timezone: document.getElementById('airportTimezone').value.trim() || null,
    operationalFrom: parseInt(document.getElementById('airportOperationalFrom').value) || null,
    operationalUntil: parseInt(document.getElementById('airportOperationalUntil').value) || null,
    isActive: document.getElementById('airportIsActive').value === 'true'
  };

  // Validate required fields
  if (!airportData.icaoCode || !airportData.name || !airportData.city || !airportData.country ||
      isNaN(airportData.latitude) || isNaN(airportData.longitude) || !airportData.type) {
    errorDiv.textContent = 'Please fill in all required fields';
    errorDiv.style.display = 'block';
    return;
  }

  // Validate ICAO code format
  if (!/^[A-Z]{4}$/.test(airportData.icaoCode)) {
    errorDiv.textContent = 'ICAO code must be exactly 4 uppercase letters';
    errorDiv.style.display = 'block';
    return;
  }

  // Validate IATA code if provided
  if (airportData.iataCode && !/^[A-Z]{3}$/.test(airportData.iataCode)) {
    errorDiv.textContent = 'IATA code must be exactly 3 uppercase letters';
    errorDiv.style.display = 'block';
    return;
  }

  try {
    let response;
    if (selectedAirportId) {
      // Update existing airport
      response = await fetch(`/api/admin/airports/${selectedAirportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(airportData)
      });
    } else {
      // Create new airport
      response = await fetch('/api/admin/airports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(airportData)
      });
    }

    const data = await response.json();

    if (response.ok) {
      closeAirportModal();
      loadAirports();
    } else {
      errorDiv.textContent = data.error || 'Failed to save airport';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Error saving airport:', error);
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

// Open delete airport modal
function openDeleteAirportModal(airportId, airportName) {
  deleteAirportId = airportId;
  document.getElementById('deleteAirportName').textContent = airportName;
  document.getElementById('deleteAirportModal').style.display = 'flex';
}

// Close delete airport modal
function closeDeleteAirportModal() {
  document.getElementById('deleteAirportModal').style.display = 'none';
  deleteAirportId = null;
}

// Confirm delete airport
async function confirmDeleteAirport() {
  if (!deleteAirportId) return;

  try {
    const response = await fetch(`/api/admin/airports/${deleteAirportId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      closeDeleteAirportModal();
      loadAirports();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to delete airport');
    }
  } catch (error) {
    console.error('Error deleting airport:', error);
    alert('Network error. Please try again.');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadUsers();

  // Update world times regularly to keep them ticking
  setInterval(() => {
    if (document.getElementById('worldsSection').style.display !== 'none') {
      loadWorlds(); // Refresh the world list to update times
    }
  }, 10000); // Update every 10 seconds to keep clocks ticking
});

// Settings Tab Functions
function loadSidebarSetting() {
  const sidebarEnabled = localStorage.getItem('sidebarEnabled') !== 'false';
  const toggleCheckbox = document.getElementById('sidebarEnabledToggle');
  const statusDiv = document.getElementById('sidebarStatus');

  if (toggleCheckbox) {
    toggleCheckbox.checked = sidebarEnabled;
  }

  if (statusDiv) {
    if (sidebarEnabled) {
      statusDiv.textContent = 'ENABLED';
      statusDiv.style.background = 'var(--success-color)';
    } else {
      statusDiv.textContent = 'DISABLED';
      statusDiv.style.background = 'var(--warning-color)';
    }
  }

  // Also load other settings
  loadDevBypassSetting();
  loadUnderConstructionSetting();
}

function toggleSidebar() {
  const toggleCheckbox = document.getElementById('sidebarEnabledToggle');
  const statusDiv = document.getElementById('sidebarStatus');
  const isEnabled = toggleCheckbox.checked;

  // Save setting to localStorage
  localStorage.setItem('sidebarEnabled', isEnabled);

  // Update status display
  if (statusDiv) {
    if (isEnabled) {
      statusDiv.textContent = 'ENABLED';
      statusDiv.style.background = 'var(--success-color)';
    } else {
      statusDiv.textContent = 'DISABLED';
      statusDiv.style.background = 'var(--warning-color)';
    }
  }

  // Show notification
  showSettingNotification(`Sidebar ${isEnabled ? 'Enabled' : 'Disabled'}`, 'Users need to refresh the page for changes to take effect', isEnabled);
}

// Dev Bypass Settings
async function loadDevBypassSetting() {
  try {
    const response = await fetch('/api/admin/settings/devBypassEnabled');
    const data = await response.json();
    const isEnabled = data.value === true || data.value === 'true';

    const toggleCheckbox = document.getElementById('devBypassToggle');
    const statusDiv = document.getElementById('devBypassStatus');

    if (toggleCheckbox) {
      toggleCheckbox.checked = isEnabled;
    }

    if (statusDiv) {
      if (isEnabled) {
        statusDiv.textContent = 'ENABLED';
        statusDiv.style.background = 'var(--warning-color)';
      } else {
        statusDiv.textContent = 'DISABLED';
        statusDiv.style.background = 'var(--text-muted)';
      }
    }
  } catch (error) {
    console.error('Error loading dev bypass setting:', error);
  }
}

async function toggleDevBypass() {
  const toggleCheckbox = document.getElementById('devBypassToggle');
  const statusDiv = document.getElementById('devBypassStatus');
  const isEnabled = toggleCheckbox.checked;

  try {
    const response = await fetch('/api/admin/settings/devBypassEnabled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: isEnabled,
        description: 'Enable dev bypass login on the login page'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update setting');
    }

    // Update status display
    if (statusDiv) {
      if (isEnabled) {
        statusDiv.textContent = 'ENABLED';
        statusDiv.style.background = 'var(--warning-color)';
      } else {
        statusDiv.textContent = 'DISABLED';
        statusDiv.style.background = 'var(--text-muted)';
      }
    }

    showSettingNotification(
      `Dev Bypass ${isEnabled ? 'Enabled' : 'Disabled'}`,
      isEnabled ? 'Admin Bypass button will now appear on the login page' : 'Admin Bypass button hidden from login page',
      !isEnabled // Green when disabled (safer), orange when enabled (warning)
    );
  } catch (error) {
    console.error('Error updating dev bypass setting:', error);
    // Revert checkbox
    toggleCheckbox.checked = !isEnabled;
    alert('Failed to update setting. Please try again.');
  }
}

// Under Construction Settings
async function loadUnderConstructionSetting() {
  try {
    const response = await fetch('/api/admin/settings/underConstruction');
    const data = await response.json();
    const isEnabled = data.value === true || data.value === 'true';

    const toggleCheckbox = document.getElementById('underConstructionToggle');
    const statusDiv = document.getElementById('underConstructionStatus');

    if (toggleCheckbox) {
      toggleCheckbox.checked = isEnabled;
    }

    if (statusDiv) {
      if (isEnabled) {
        statusDiv.textContent = 'ENABLED';
        statusDiv.style.background = 'var(--warning-color)';
      } else {
        statusDiv.textContent = 'DISABLED';
        statusDiv.style.background = 'var(--text-muted)';
      }
    }
  } catch (error) {
    console.error('Error loading under construction setting:', error);
  }
}

async function toggleUnderConstruction() {
  const toggleCheckbox = document.getElementById('underConstructionToggle');
  const statusDiv = document.getElementById('underConstructionStatus');
  const isEnabled = toggleCheckbox.checked;

  try {
    const response = await fetch('/api/admin/settings/underConstruction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: isEnabled,
        description: 'Show Coming Soon page instead of login page'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update setting');
    }

    if (statusDiv) {
      if (isEnabled) {
        statusDiv.textContent = 'ENABLED';
        statusDiv.style.background = 'var(--warning-color)';
      } else {
        statusDiv.textContent = 'DISABLED';
        statusDiv.style.background = 'var(--text-muted)';
      }
    }

    showSettingNotification(
      `Under Construction ${isEnabled ? 'Enabled' : 'Disabled'}`,
      isEnabled ? 'Home page now shows Coming Soon. Use the bottom-right corner to bypass.' : 'Home page restored to normal login.',
      !isEnabled
    );
  } catch (error) {
    console.error('Error updating under construction setting:', error);
    toggleCheckbox.checked = !isEnabled;
    alert('Failed to update setting. Please try again.');
  }
}

function showSettingNotification(title, message, isSuccess) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${isSuccess ? 'var(--success-color)' : 'var(--warning-color)'}" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <div>
        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">
          ${title}
        </div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">
          ${message}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Remove notification after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Recompute ATC Routes
async function recomputeRoutes() {
  const btn = document.getElementById('recomputeRoutesBtn');
  const progressDiv = document.getElementById('recomputeRoutesProgress');
  const messageSpan = document.getElementById('recomputeRoutesMessage');

  btn.disabled = true;
  btn.textContent = 'Processing...';
  btn.style.opacity = '0.6';
  progressDiv.style.display = 'block';
  messageSpan.textContent = 'Clearing existing routes and triggering recomputation...';

  try {
    const response = await fetch('/api/world/recompute-routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 409) {
      messageSpan.textContent = 'Route computation is already in progress. Please wait.';
      showSettingNotification('Already Running', 'Route computation is already in progress', false);
      return;
    }

    if (response.status === 503) {
      messageSpan.textContent = 'Airway service is not ready yet. Try again shortly.';
      showSettingNotification('Service Not Ready', 'Airway service is still initializing', false);
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to trigger route recomputation');
    }

    const data = await response.json();
    messageSpan.textContent = `${data.routesCleared} routes queued for recomputation. This will run in the background.`;
    showSettingNotification('Routes Recomputing', `${data.routesCleared} routes are being recalculated`, true);
  } catch (error) {
    console.error('Error recomputing routes:', error);
    messageSpan.textContent = 'Error: ' + error.message;
    showSettingNotification('Error', 'Failed to trigger route recomputation', false);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Recompute Routes';
    btn.style.opacity = '1';
  }
}

// ==================== AIRLINES MANAGEMENT ====================

let allAirlines = [];
let selectedAirlineId = null;
let selectedAirlineData = null;
let selectedFleetAircraftId = null;
let airlinesWorldsLoaded = false;

// Load worlds dropdown for airlines tab
async function loadAirlinesWorldDropdown() {
  if (airlinesWorldsLoaded) return;

  try {
    const response = await fetch('/api/admin/worlds');
    const worlds = await response.json();

    const select = document.getElementById('airlinesWorldSelect');
    select.innerHTML = '<option value="">-- Select a World --</option>';

    worlds.forEach(world => {
      const option = document.createElement('option');
      option.value = world.id;
      option.textContent = `${world.name} (${world.era})`;
      select.appendChild(option);
    });

    airlinesWorldsLoaded = true;
  } catch (error) {
    console.error('Error loading worlds for airlines dropdown:', error);
  }
}

// Load airlines for selected world
async function loadAirlines() {
  const worldId = document.getElementById('airlinesWorldSelect').value;
  const tbody = document.getElementById('airlinesTableBody');

  // Clear owner search and reset to world view
  document.getElementById('searchOwnerInput').value = '';
  document.getElementById('airlinesTableTitle').textContent = 'AIRLINES IN WORLD';
  setAirlinesTableWorldColumn(false);

  if (!worldId) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="padding: 1rem; text-align: center; color: var(--text-muted);">Select a world to view airlines</td>
      </tr>
    `;
    allAirlines = [];
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="8" style="padding: 1rem; text-align: center; color: var(--text-muted);">Loading airlines...</td>
    </tr>
  `;

  try {
    const response = await fetch(`/api/admin/airlines?worldId=${worldId}`);
    const airlines = await response.json();
    allAirlines = airlines;

    renderAirlinesTable(airlines);
  } catch (error) {
    console.error('Error loading airlines:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="padding: 1rem; text-align: center; color: var(--warning-color);">Error loading airlines</td>
      </tr>
    `;
  }
}

// Render airlines table
function renderAirlinesTable(airlines, showWorld = false) {
  const tbody = document.getElementById('airlinesTableBody');
  const colspan = showWorld ? 9 : 8;

  if (airlines.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${colspan}" style="padding: 1rem; text-align: center; color: var(--text-muted);">${showWorld ? 'No airlines found for this owner' : 'No airlines found in this world'}</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = airlines.map(airline => {
    const codes = airline.iataCode
      ? `${airline.airlineCode || 'N/A'} / ${airline.iataCode}`
      : airline.airlineCode || 'N/A';

    const balanceColor = parseFloat(airline.balance) < 0 ? 'var(--warning-color)' : 'var(--success-color)';
    const balance = parseFloat(airline.balance || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

    const ownerName = airline.user ? `${airline.user.firstName} ${airline.user.lastName}` : 'Unknown';
    const baseAirport = airline.baseAirport ? airline.baseAirport.icaoCode : 'N/A';
    const worldCell = showWorld
      ? `<td style="padding: 0.5rem; text-align: center; font-size: 0.85rem;">${airline.world ? `${airline.world.name}` : 'N/A'}</td>`
      : '';

    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 0.5rem; font-weight: 600;">${airline.airlineName || 'Unnamed Airline'}</td>
        <td style="padding: 0.5rem; text-align: center; font-family: 'Courier New', monospace;">${codes}</td>
        <td style="padding: 0.5rem;">${ownerName}</td>
        ${worldCell}
        <td style="padding: 0.5rem; text-align: center; font-family: 'Courier New', monospace;">${baseAirport}</td>
        <td style="padding: 0.5rem; text-align: center; font-family: 'Courier New', monospace; color: ${balanceColor}; font-weight: 600;">${balance}</td>
        <td style="padding: 0.5rem; text-align: center; font-family: 'Courier New', monospace;">${airline.fleetCount || 0}</td>
        <td style="padding: 0.5rem; text-align: center;">
          <div style="width: 60px; height: 8px; background: var(--surface); border-radius: 4px; overflow: hidden; margin: 0 auto;">
            <div style="width: ${airline.reputation || 50}%; height: 100%; background: var(--primary-color);"></div>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-secondary);">${airline.reputation || 50}%</span>
        </td>
        <td style="padding: 0.5rem; text-align: center;">
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <button class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick='openEditAirlineBalanceModal(${JSON.stringify(airline).replace(/'/g, "&#39;")})'>Edit Balance</button>
            <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick='openEditAirlineFleetModal(${JSON.stringify(airline).replace(/'/g, "&#39;")})'>Manage Fleet</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Search airlines by name/code (requires world selected)
function searchAirlines() {
  // Clear owner search when using name/code search
  document.getElementById('searchOwnerInput').value = '';

  const searchTerm = document.getElementById('searchAirlineInput').value.toLowerCase();

  if (!searchTerm) {
    renderAirlinesTable(allAirlines);
    return;
  }

  const filteredAirlines = allAirlines.filter(airline => {
    const airlineName = (airline.airlineName || '').toLowerCase();
    const airlineCode = (airline.airlineCode || '').toLowerCase();
    const iataCode = (airline.iataCode || '').toLowerCase();

    return airlineName.includes(searchTerm) ||
           airlineCode.includes(searchTerm) ||
           iataCode.includes(searchTerm);
  });

  renderAirlinesTable(filteredAirlines);
}

// Search airlines by owner (across all worlds)
let ownerSearchTimer = null;
function searchAirlinesByOwner() {
  // Clear name/code search when using owner search
  document.getElementById('searchAirlineInput').value = '';

  const searchTerm = document.getElementById('searchOwnerInput').value.trim();

  if (!searchTerm) {
    // Restore world-based view
    document.getElementById('airlinesTableTitle').textContent = 'AIRLINES IN WORLD';
    const worldId = document.getElementById('airlinesWorldSelect').value;
    if (worldId) {
      renderAirlinesTable(allAirlines);
    } else {
      document.getElementById('airlinesTableBody').innerHTML = `
        <tr>
          <td colspan="8" style="padding: 1rem; text-align: center; color: var(--text-muted);">Select a world to view airlines</td>
        </tr>
      `;
    }
    setAirlinesTableWorldColumn(false);
    return;
  }

  // Debounce the API call
  if (ownerSearchTimer) clearTimeout(ownerSearchTimer);
  ownerSearchTimer = setTimeout(async () => {
    document.getElementById('airlinesTableTitle').textContent = 'AIRLINES BY OWNER';
    document.getElementById('airlinesTableBody').innerHTML = `
      <tr>
        <td colspan="9" style="padding: 1rem; text-align: center; color: var(--text-muted);">Searching...</td>
      </tr>
    `;

    try {
      const response = await fetch(`/api/admin/airlines/search-by-owner?query=${encodeURIComponent(searchTerm)}`);
      const airlines = await response.json();
      setAirlinesTableWorldColumn(true);
      renderAirlinesTable(airlines, true);
    } catch (error) {
      console.error('Error searching airlines by owner:', error);
      document.getElementById('airlinesTableBody').innerHTML = `
        <tr>
          <td colspan="9" style="padding: 1rem; text-align: center; color: var(--warning-color);">Error searching airlines</td>
        </tr>
      `;
    }
  }, 300);
}

// Toggle WORLD column in airlines table header
function setAirlinesTableWorldColumn(show) {
  const headRow = document.getElementById('airlinesTableHead');
  const existingWorldTh = headRow.querySelector('[data-col="world"]');

  if (show && !existingWorldTh) {
    const worldTh = document.createElement('th');
    worldTh.setAttribute('data-col', 'world');
    worldTh.style.cssText = 'padding: 0.5rem; text-align: center; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);';
    worldTh.textContent = 'WORLD';
    // Insert after OWNER column (3rd th, index 2)
    const ownerTh = headRow.children[2];
    ownerTh.after(worldTh);
  } else if (!show && existingWorldTh) {
    existingWorldTh.remove();
  }
}

// ==================== AIRLINE BALANCE MODAL ====================

function openEditAirlineBalanceModal(airline) {
  selectedAirlineId = airline.id;
  selectedAirlineData = airline;

  document.getElementById('editAirlineName').textContent = `${airline.airlineName || 'Unnamed'} (${airline.airlineCode || 'N/A'})`;
  document.getElementById('editCurrentBalance').textContent = parseFloat(airline.balance || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  document.getElementById('newBalance').value = parseFloat(airline.balance || 0).toFixed(2);
  document.getElementById('editBalanceError').style.display = 'none';
  document.getElementById('editAirlineBalanceModal').style.display = 'flex';
}

function closeEditAirlineBalanceModal() {
  document.getElementById('editAirlineBalanceModal').style.display = 'none';
  selectedAirlineId = null;
  selectedAirlineData = null;
}

async function confirmEditBalance() {
  const newBalance = parseFloat(document.getElementById('newBalance').value);
  const errorDiv = document.getElementById('editBalanceError');

  if (isNaN(newBalance)) {
    errorDiv.textContent = 'Please enter a valid number';
    errorDiv.style.display = 'block';
    return;
  }

  try {
    const response = await fetch(`/api/admin/airlines/${selectedAirlineId}/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance: newBalance })
    });

    const data = await response.json();

    if (response.ok) {
      closeEditAirlineBalanceModal();
      loadAirlines();
      showSettingNotification('Balance Updated', `Airline balance set to ${newBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, true);
    } else {
      errorDiv.textContent = data.error || 'Failed to update balance';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Error updating balance:', error);
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

// ==================== AIRLINE FLEET MODAL ====================

let currentFleetAirlineId = null;

function openEditAirlineFleetModal(airline) {
  currentFleetAirlineId = airline.id;
  document.getElementById('fleetAirlineName').textContent = `${airline.airlineName || 'Unnamed'} (${airline.airlineCode || 'N/A'})`;
  document.getElementById('fleetError').style.display = 'none';
  document.getElementById('editAirlineFleetModal').style.display = 'flex';

  loadAirlineFleet(airline.id);
}

function closeEditAirlineFleetModal() {
  document.getElementById('editAirlineFleetModal').style.display = 'none';
  currentFleetAirlineId = null;
}

async function loadAirlineFleet(airlineId) {
  const tbody = document.getElementById('airlineFleetTableBody');
  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="padding: 1rem; text-align: center; color: var(--text-muted);">Loading fleet...</td>
    </tr>
  `;

  try {
    const response = await fetch(`/api/admin/airlines/${airlineId}/fleet`);
    const fleet = await response.json();

    if (fleet.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="padding: 1rem; text-align: center; color: var(--text-muted);">No aircraft in fleet</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = fleet.map(ac => {
      const aircraftName = ac.aircraft ? `${ac.aircraft.manufacturer} ${ac.aircraft.model}` : 'Unknown';
      const statusColor = ac.status === 'active' ? 'var(--success-color)' : 'var(--warning-color)';
      const flightHours = parseFloat(ac.totalFlightHours) || 0;

      return `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 0.5rem; font-family: 'Courier New', monospace; font-weight: 600;">${ac.registration}</td>
          <td style="padding: 0.5rem;">${aircraftName}</td>
          <td style="padding: 0.5rem; text-align: center;">${ac.ageYears || 0} yrs</td>
          <td style="padding: 0.5rem; text-align: center; font-family: 'Courier New', monospace;">${flightHours.toFixed(1)}</td>
          <td style="padding: 0.5rem; text-align: center; color: ${statusColor}; font-weight: 600;">${(ac.status || 'active').toUpperCase()}</td>
          <td style="padding: 0.5rem; text-align: center;">
            <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; background: #dc2626; border-color: #dc2626; color: white;" onclick='openDeleteFleetAircraftModal("${ac.id}", "${ac.registration}")'>Remove</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading fleet:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 1rem; text-align: center; color: var(--warning-color);">Error loading fleet</td>
      </tr>
    `;
  }
}

// ==================== ADD AIRCRAFT TO FLEET MODAL ====================

async function openAddAircraftToFleetModal() {
  document.getElementById('newAircraftRegistration').value = '';
  document.getElementById('newAircraftAge').value = '0';
  document.getElementById('newAircraftFlightHours').value = '0';
  document.getElementById('addAircraftError').style.display = 'none';
  document.getElementById('addAircraftToFleetModal').style.display = 'flex';

  // Load aircraft types dropdown
  const select = document.getElementById('newAircraftType');
  select.innerHTML = '<option value="">-- Loading... --</option>';

  try {
    const response = await fetch('/api/admin/aircraft');
    const aircraft = await response.json();

    select.innerHTML = '<option value="">-- Select Aircraft --</option>';
    aircraft.filter(ac => ac.isActive).forEach(ac => {
      const option = document.createElement('option');
      option.value = ac.id;
      option.textContent = `${ac.manufacturer} ${ac.model}${ac.variant ? (ac.model.endsWith('-') || ac.variant.startsWith('-') ? ac.variant : '-' + ac.variant) : ''}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading aircraft types:', error);
    select.innerHTML = '<option value="">-- Error loading --</option>';
  }
}

function closeAddAircraftToFleetModal() {
  document.getElementById('addAircraftToFleetModal').style.display = 'none';
}

async function confirmAddAircraftToFleet() {
  const errorDiv = document.getElementById('addAircraftError');

  const aircraftTypeId = document.getElementById('newAircraftType').value;
  const registration = document.getElementById('newAircraftRegistration').value.trim().toUpperCase();
  const ageYears = parseInt(document.getElementById('newAircraftAge').value) || 0;
  const flightHours = parseFloat(document.getElementById('newAircraftFlightHours').value) || 0;

  if (!aircraftTypeId || !registration) {
    errorDiv.textContent = 'Please select an aircraft type and enter a registration';
    errorDiv.style.display = 'block';
    return;
  }

  try {
    const response = await fetch(`/api/admin/airlines/${currentFleetAirlineId}/fleet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aircraftId: aircraftTypeId,
        registration,
        ageYears,
        totalFlightHours: flightHours
      })
    });

    const data = await response.json();

    if (response.ok) {
      closeAddAircraftToFleetModal();
      loadAirlineFleet(currentFleetAirlineId);
      loadAirlines(); // Refresh fleet count
      showSettingNotification('Aircraft Added', `${registration} added to fleet`, true);
    } else {
      errorDiv.textContent = data.error || 'Failed to add aircraft';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Error adding aircraft:', error);
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

// ==================== DELETE FLEET AIRCRAFT MODAL ====================

function openDeleteFleetAircraftModal(aircraftId, registration) {
  selectedFleetAircraftId = aircraftId;
  document.getElementById('deleteFleetAircraftName').textContent = registration;
  // Reset checkbox when opening modal
  const checkbox = document.getElementById('addToUsedMarketCheckbox');
  if (checkbox) checkbox.checked = false;
  document.getElementById('deleteFleetAircraftModal').style.display = 'flex';
}

function closeDeleteFleetAircraftModal() {
  document.getElementById('deleteFleetAircraftModal').style.display = 'none';
  selectedFleetAircraftId = null;
  // Reset checkbox when closing
  const checkbox = document.getElementById('addToUsedMarketCheckbox');
  if (checkbox) checkbox.checked = false;
}

async function confirmDeleteFleetAircraft() {
  if (!selectedFleetAircraftId) return;

  // Check if we should add to used market
  const addToMarketCheckbox = document.getElementById('addToUsedMarketCheckbox');
  const addToMarket = addToMarketCheckbox ? addToMarketCheckbox.checked : false;

  try {
    const url = `/api/admin/airlines/fleet/${selectedFleetAircraftId}?addToMarket=${addToMarket}`;
    const response = await fetch(url, {
      method: 'DELETE'
    });

    if (response.ok) {
      const data = await response.json();
      closeDeleteFleetAircraftModal();
      loadAirlineFleet(currentFleetAirlineId);
      loadAirlines(); // Refresh fleet count

      if (addToMarket) {
        showSettingNotification('Aircraft Removed & Listed', 'Aircraft removed from fleet and added to used market', true);
      } else {
        showSettingNotification('Aircraft Removed', 'Aircraft removed from fleet', true);
      }
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to remove aircraft');
    }
  } catch (error) {
    console.error('Error removing aircraft:', error);
    alert('Network error. Please try again.');
  }
}
