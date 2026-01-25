let selectedWorldId = null;
let bankruptcyWorldId = null;

// Load available worlds
async function loadWorlds() {
  try {
    const response = await fetch('/api/worlds/available');

    if (!response.ok) {
      if (response.status === 401) {
        // Not authenticated, redirect to login
        window.location.href = '/';
        return;
      }
      throw new Error(`Failed to load worlds: ${response.status} ${response.statusText}`);
    }

    const worlds = await response.json();

    const worldsList = document.getElementById('worldsList');
    const myWorldsList = document.getElementById('myWorldsList');
    const myWorldsSection = document.getElementById('myWorlds');

    if (!Array.isArray(worlds)) {
      console.error('Invalid response format:', worlds);
      worldsList.innerHTML = '<div class="empty-message">Error loading worlds. Please refresh the page.</div>';
      return;
    }

    const myWorlds = worlds.filter(w => w.isMember);
    const availableWorlds = worlds.filter(w => !w.isMember);

    // Show my worlds section if user has any
    if (myWorlds.length > 0) {
      myWorldsSection.style.display = 'block';
      myWorldsList.innerHTML = '';
      myWorlds.forEach(world => {
        const cardElement = createWorldCard(world, true);
        myWorldsList.appendChild(cardElement);
      });
    } else {
      myWorldsSection.style.display = 'none';
    }

    // Show available worlds
    worldsList.innerHTML = '';
    if (availableWorlds.length > 0) {
      availableWorlds.forEach(world => {
        const cardElement = createWorldCard(world, false);
        worldsList.appendChild(cardElement);
      });
    } else if (myWorlds.length === 0) {
      worldsList.innerHTML = '<div class="empty-message">No worlds available. Please contact an administrator.</div>';
    } else {
      worldsList.innerHTML = '<div class="empty-message">No other worlds available.</div>';
    }

  } catch (error) {
    console.error('Error loading worlds:', error);
    const worldsList = document.getElementById('worldsList');
    if (worldsList) {
      worldsList.innerHTML = '<div class="empty-message">Error loading worlds. Please refresh the page.</div>';
    }
  }
}

// Create world card element (returns DOM element)
function createWorldCard(world, isMember) {
  const timeDate = new Date(world.currentTime);
  const formattedDate = timeDate.toISOString().split('T')[0];

  const card = document.createElement('div');
  card.className = `world-card ${isMember ? 'member' : ''}`;
  card.innerHTML = `
    <div class="world-header" style="cursor: pointer;">
      <div>
        <div class="world-name">${world.name || 'Unnamed World'}</div>
        <div class="world-era">ERA ${world.era || 2010}</div>
      </div>
      <div class="world-badge ${isMember ? 'joined' : ''}">
        ${isMember ? 'JOINED' : 'AVAILABLE'}
      </div>
    </div>

    ${isMember && world.airlineName ? `
      <div class="airline-info" style="cursor: pointer;">
        <div class="airline-name">${world.airlineName}</div>
        <div class="airline-code">ICAO: ${world.airlineCode}</div>
      </div>
    ` : ''}

    ${world.description ? `
      <div class="world-description">${world.description}</div>
    ` : ''}

    <div class="world-info" style="cursor: pointer;">
      <div class="info-row">
        <span class="info-label">Current Date</span>
        <span class="info-value">${formattedDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Time Sync</span>
        <span class="info-value">${world.timeAcceleration || 60}x</span>
      </div>
      <div class="info-row">
        <span class="info-label">Members</span>
        <span class="info-value">${world.memberCount || 0}/${world.maxPlayers || 100}</span>
      </div>
    </div>

    ${isMember ? `
      <div class="world-actions" style="padding: 1rem; border-top: 1px solid var(--border-color);">
        <button class="btn btn-secondary" style="width: 100%;">Declare Bankruptcy</button>
      </div>
    ` : ''}
  `;

  // Add event listeners programmatically to avoid injection issues
  const header = card.querySelector('.world-header');
  const worldInfo = card.querySelector('.world-info');
  const airlineInfo = card.querySelector('.airline-info');
  const bankruptcyBtn = card.querySelector('.world-actions button');

  if (header) {
    header.addEventListener('click', () => {
      if (isMember) {
        enterWorld(world.id);
      } else {
        openJoinModal(world.id, world.name);
      }
    });
  }

  if (worldInfo) {
    worldInfo.addEventListener('click', () => {
      if (isMember) {
        enterWorld(world.id);
      } else {
        openJoinModal(world.id, world.name);
      }
    });
  }

  if (airlineInfo) {
    airlineInfo.addEventListener('click', () => {
      enterWorld(world.id);
    });
  }

  if (bankruptcyBtn) {
    bankruptcyBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      leaveWorld(world.id, world.name);
    });
  }

  return card;
}

// Update starting capital info based on airline type
function updateStartingInfo() {
  const airlineType = document.getElementById('airlineType').value;
  const capitalEl = document.getElementById('startingCapital');

  const capitals = {
    'regional': 'USD $500,000',
    'medium-haul': 'USD $1,000,000',
    'long-haul': 'USD $2,000,000'
  };

  capitalEl.textContent = airlineType
    ? `Starting Capital: ${capitals[airlineType]}`
    : 'Starting Capital: Select airline type';
}

// Open join modal
function openJoinModal(worldId, worldName) {
  selectedWorldId = worldId;
  document.getElementById('selectedWorldName').textContent = worldName;
  document.getElementById('region').value = '';
  document.getElementById('airlineType').value = '';
  document.getElementById('airlineName').value = '';
  document.getElementById('airlineCode').value = '';
  document.getElementById('joinError').style.display = 'none';
  document.getElementById('startingCapital').textContent = 'Starting Capital: Select airline type';
  document.getElementById('joinModal').style.display = 'flex';
}

// Close join modal
function closeJoinModal() {
  document.getElementById('joinModal').style.display = 'none';
  selectedWorldId = null;
}

// Confirm join
async function confirmJoin() {
  const region = document.getElementById('region').value;
  const airlineType = document.getElementById('airlineType').value;
  const airlineName = document.getElementById('airlineName').value.trim();
  const airlineCode = document.getElementById('airlineCode').value.trim().toUpperCase();
  const errorDiv = document.getElementById('joinError');

  // Validation
  if (!region || !airlineType || !airlineName || !airlineCode) {
    errorDiv.textContent = 'Please fill in all required fields';
    errorDiv.style.display = 'block';
    return;
  }

  if (!/^[A-Z]{3}$/.test(airlineCode)) {
    errorDiv.textContent = 'Airline code must be exactly 3 uppercase letters';
    errorDiv.style.display = 'block';
    return;
  }

  try {
    const response = await fetch('/api/worlds/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        worldId: selectedWorldId,
        region,
        airlineType,
        airlineName,
        airlineCode
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Successfully joined, reload worlds
      closeJoinModal();
      loadWorlds();
    } else {
      errorDiv.textContent = data.error || 'Failed to join world';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Error joining world:', error);
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

// Open bankruptcy modal
function leaveWorld(worldId, worldName) {
  bankruptcyWorldId = worldId;
  document.getElementById('bankruptcyWorldName').textContent = worldName;
  document.getElementById('bankruptcyModal').style.display = 'flex';
}

// Close bankruptcy modal
function closeBankruptcyModal() {
  document.getElementById('bankruptcyModal').style.display = 'none';
  bankruptcyWorldId = null;
}

// Confirm bankruptcy
async function confirmBankruptcy() {
  if (!bankruptcyWorldId) {
    return;
  }

  try {
    const response = await fetch('/api/worlds/leave', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ worldId: bankruptcyWorldId })
    });

    if (response.ok) {
      closeBankruptcyModal();
      loadWorlds();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to leave world');
    }
  } catch (error) {
    console.error('Error leaving world:', error);
    alert('Network error. Please try again.');
  }
}

// Enter world (navigate to dashboard with world context)
function enterWorld(worldId) {
  window.location.href = `/dashboard?world=${worldId}`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadWorlds();
});
