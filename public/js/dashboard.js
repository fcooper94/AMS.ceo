// WebSocket connection
const socket = io();

// Game time state
let currentGameTime = null;
let localClockInterval = null;

// Format date and time
function formatGameTime(dateString) {
  const date = new Date(dateString);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatGameDate(dateString) {
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

// Update game time display
function updateGameTimeDisplay(gameTime) {
  if (!gameTime) return;

  currentGameTime = new Date(gameTime);

  document.getElementById('gameTime').textContent = formatGameTime(gameTime);
  document.getElementById('gameDate').textContent = formatGameDate(gameTime);
}

// Start local clock that advances the time client-side
function startLocalClock(accelerationFactor) {
  if (localClockInterval) {
    clearInterval(localClockInterval);
  }

  // Update display every 100ms for smooth progression
  localClockInterval = setInterval(() => {
    if (currentGameTime) {
      // Advance game time based on acceleration (100ms real time)
      currentGameTime = new Date(currentGameTime.getTime() + (100 * accelerationFactor));
      document.getElementById('gameTime').textContent = formatGameTime(currentGameTime);
      document.getElementById('gameDate').textContent = formatGameDate(currentGameTime);
    }
  }, 100);
}

// Load world information
async function loadWorldInfo() {
  try {
    const response = await fetch('/api/world/info');
    const data = await response.json();

    if (data.error) {
      console.warn('No active world:', data.message);
      document.getElementById('worldName').textContent = 'No World';
      document.getElementById('gameTime').textContent = '--:--';
      document.getElementById('gameDate').textContent = 'Create a world';
      return;
    }

    // Update world info
    document.getElementById('worldName').textContent = data.name;
    document.getElementById('timeAcceleration').textContent = `${data.timeAcceleration}x`;
    document.getElementById('elapsedDays').textContent = data.elapsedDays;
    document.getElementById('worldEra').textContent = data.era;

    // Update game time
    updateGameTimeDisplay(data.currentTime);

    // Start local clock
    startLocalClock(data.timeAcceleration);

  } catch (error) {
    console.error('Error loading world info:', error);
  }
}

// Load user information
async function loadUserInfo() {
  try {
    const response = await fetch('/auth/status');
    const data = await response.json();

    if (data.authenticated) {
      document.getElementById('userName').textContent = data.user.name;
    } else {
      // Redirect to login if not authenticated
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Error loading user info:', error);
  }
}

// Load VATSIM status
async function loadVatsimStatus() {
  const statusDiv = document.getElementById('vatsimStatus');
  try {
    const response = await fetch('/api/health');
    const data = await response.json();

    if (data.status === 'healthy') {
      statusDiv.innerHTML = `
        <div style="color: var(--success-color);">
          ✓ Connected to VATSIM network<br>
          <small style="color: var(--text-secondary);">System operational</small>
        </div>
      `;
    }
  } catch (error) {
    statusDiv.innerHTML = `
      <div style="color: var(--text-secondary);">
        ⚠ Unable to connect to VATSIM network
      </div>
    `;
  }
}

// Socket.IO event listeners
socket.on('world:tick', (data) => {
  // Sync with server time periodically
  currentGameTime = new Date(data.gameTime);
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  loadUserInfo();
  loadWorldInfo();
  loadVatsimStatus();

  // Refresh world info every 30 seconds to stay in sync
  setInterval(loadWorldInfo, 30000);

  // Refresh VATSIM status every 30 seconds
  setInterval(loadVatsimStatus, 30000);
});
