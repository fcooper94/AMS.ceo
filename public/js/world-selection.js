let selectedWorldId = null;

// Load user information
async function loadUserInfo() {
  try {
    const response = await fetch('/auth/status');
    const data = await response.json();

    if (data.authenticated) {
      document.getElementById('userName').textContent = data.user.name;
    } else {
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Error loading user info:', error);
  }
}

// Load available worlds
async function loadWorlds() {
  try {
    const response = await fetch('/api/worlds/available');
    const worlds = await response.json();

    const worldsList = document.getElementById('worldsList');
    const myWorldsList = document.getElementById('myWorldsList');
    const myWorldsSection = document.getElementById('myWorlds');

    const myWorlds = worlds.filter(w => w.isMember);
    const availableWorlds = worlds.filter(w => !w.isMember);

    // Show my worlds section if user has any
    if (myWorlds.length > 0) {
      myWorldsSection.style.display = 'block';
      myWorldsList.innerHTML = myWorlds.map(world => createWorldCard(world, true)).join('');
    }

    // Show available worlds
    worldsList.innerHTML = availableWorlds.length > 0
      ? availableWorlds.map(world => createWorldCard(world, false)).join('')
      : '<div class="empty-message">No available worlds</div>';

  } catch (error) {
    console.error('Error loading worlds:', error);
  }
}

// Create world card HTML
function createWorldCard(world, isMember) {
  const timeDate = new Date(world.currentTime);
  const formattedDate = timeDate.toISOString().split('T')[0];

  return `
    <div class="world-card ${isMember ? 'member' : ''}" onclick="${isMember ? `enterWorld('${world.id}')` : `openJoinModal('${world.id}', '${world.name}')`}">
      <div class="world-header">
        <div>
          <div class="world-name">${world.name}</div>
          <div class="world-era">ERA ${world.era}</div>
        </div>
        <div class="world-badge ${isMember ? 'joined' : ''}">
          ${isMember ? 'JOINED' : 'AVAILABLE'}
        </div>
      </div>

      ${isMember && world.airlineName ? `
        <div class="airline-info">
          <div class="airline-name">${world.airlineName}</div>
          <div class="airline-code">ICAO: ${world.airlineCode}</div>
        </div>
      ` : ''}

      ${world.description ? `
        <div class="world-description">${world.description}</div>
      ` : ''}

      <div class="world-info">
        <div class="info-row">
          <span class="info-label">Current Date</span>
          <span class="info-value">${formattedDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Time Sync</span>
          <span class="info-value">${world.timeAcceleration}x</span>
        </div>
        <div class="info-row">
          <span class="info-label">Members</span>
          <span class="info-value">${world.memberCount}/${world.maxPlayers}</span>
        </div>
      </div>
    </div>
  `;
}

// Open join modal
function openJoinModal(worldId, worldName) {
  selectedWorldId = worldId;
  document.getElementById('selectedWorldName').textContent = worldName;
  document.getElementById('airlineName').value = '';
  document.getElementById('airlineCode').value = '';
  document.getElementById('joinError').style.display = 'none';
  document.getElementById('joinModal').style.display = 'flex';
}

// Close join modal
function closeJoinModal() {
  document.getElementById('joinModal').style.display = 'none';
  selectedWorldId = null;
}

// Confirm join
async function confirmJoin() {
  const airlineName = document.getElementById('airlineName').value.trim();
  const airlineCode = document.getElementById('airlineCode').value.trim().toUpperCase();
  const errorDiv = document.getElementById('joinError');

  // Validation
  if (!airlineName || !airlineCode) {
    errorDiv.textContent = 'Please fill in all fields';
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

// Enter world (navigate to dashboard with world context)
function enterWorld(worldId) {
  window.location.href = `/dashboard?world=${worldId}`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadUserInfo();
  loadWorlds();
});
