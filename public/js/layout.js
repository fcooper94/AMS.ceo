// Common layout functionality for the application

// Load user information for navigation bar
async function loadUserInfo() {
  try {
    const response = await fetch('/auth/status');
    const data = await response.json();

    if (data.authenticated) {
      // Update user info in navigation
      const userNameElement = document.getElementById('userName');
      if (userNameElement) {
        userNameElement.textContent = data.user.name;
      }

      const creditsEl = document.getElementById('userCredits');
      if (creditsEl) {
        creditsEl.textContent = data.user.credits;
        // Color code credits based on value
        if (data.user.credits < 0) {
          creditsEl.style.color = 'var(--warning-color)';
        } else if (data.user.credits < 4) {
          creditsEl.style.color = 'var(--text-secondary)';
        } else {
          creditsEl.style.color = 'var(--success-color)';
        }
      }

      // Show admin link if user is admin
      const adminLink = document.getElementById('adminLink');
      if (adminLink && data.user.isAdmin) {
        adminLink.style.display = 'inline-block';
        // Ensure proper CSS classes are applied
        if (!adminLink.classList.contains('btn')) {
          adminLink.classList.add('btn');
        }
        if (!adminLink.classList.contains('btn-secondary')) {
          adminLink.classList.add('btn-secondary');
        }
      }
    } else {
      // Redirect to login if not authenticated (only on protected pages)
      if (window.location.pathname !== '/' &&
          window.location.pathname !== '/auth/login' &&
          window.location.pathname !== '/auth/vatsim/callback') {
        window.location.href = '/';
      }
    }
  } catch (error) {
    console.error('Error loading user info:', error);
  }
}

// Universal page initialization
function initializeLayout() {
  loadUserInfo();

  // Use event delegation to handle clicks on "Add to Fleet" button
  document.addEventListener('click', function(event) {
    // Check if the clicked element is the "Add to Fleet" button
    let target = event.target;

    // Traverse up the DOM to find if any parent element is the "Add to Fleet" button
    while (target && target !== document) {
      if (target.classList.contains('btn-action')) {
        // Check if the button text contains "Add to Fleet" (case-insensitive)
        const buttonText = target.textContent ? target.textContent.trim().toUpperCase() : '';
        if (buttonText.includes('ADD TO FLEET')) {
          event.preventDefault();
          showAircraftMarketplaceOptions();
          return; // Exit early to avoid multiple triggers
        }
      }
      target = target.parentElement;
    }
  });

  // Add common functionality that should be available on all pages
  initializeCommonComponents();
}

// Initialize common components across all pages
function initializeCommonComponents() {
  // Add any other common functionality that should be available on all pages
  // For example, common modals, tooltips, etc.

  // Ensure admin link visibility is handled consistently across all pages
  ensureAdminLinkVisibility();

  // Add other universal functionality here
}

// Ensure admin link visibility is consistent across all pages
function ensureAdminLinkVisibility() {
  // Check if user is authenticated and has admin rights
  fetch('/auth/status')
    .then(response => response.json())
    .then(data => {
      if (data.authenticated && data.user.isAdmin) {
        const adminLink = document.getElementById('adminLink');
        if (adminLink) {
          adminLink.style.display = 'inline-block';
          // Ensure proper CSS classes are applied
          if (!adminLink.classList.contains('btn')) {
            adminLink.classList.add('btn');
          }
          if (!adminLink.classList.contains('btn-secondary')) {
            adminLink.classList.add('btn-secondary');
          }
          // Ensure no conflicting styles are applied
          adminLink.style.marginRight = '1rem';
        }
      }
    })
    .catch(error => {
      console.error('Error checking admin status:', error);
    });
}

// Function to show aircraft marketplace options
function showAircraftMarketplaceOptions() {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'marketplaceOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: var(--surface);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 2rem;
    width: 90%;
    max-width: 600px;
    text-align: center;
  `;

  modalContent.innerHTML = `
    <h2 style="margin-bottom: 2rem; color: var(--text-primary);">AIRCRAFT MARKETPLACE</h2>
    <p style="margin-bottom: 2rem; color: var(--text-secondary);">Choose an option to expand your fleet</p>

    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <button id="usedAircraftBtn" class="btn btn-primary" style="padding: 1.5rem; font-size: 1.1rem;">
        Used Aircraft Market
      </button>
      <button id="newAircraftBtn" class="btn btn-secondary" style="padding: 1.5rem; font-size: 1.1rem;">
        Purchase Aircraft New from Manufacturer
      </button>
      <button id="closeMarketplaceBtn" class="btn btn-logout" style="padding: 0.75rem; margin-top: 1rem;">
        Close
      </button>
    </div>
  `;

  overlay.appendChild(modalContent);
  document.body.appendChild(overlay);

  // Add event listeners to buttons
  document.getElementById('usedAircraftBtn').addEventListener('click', function() {
    window.location.href = '/aircraft-marketplace?category=used';
  });

  document.getElementById('newAircraftBtn').addEventListener('click', function() {
    window.location.href = '/aircraft-marketplace?category=new';
  });

  document.getElementById('closeMarketplaceBtn').addEventListener('click', function() {
    document.body.removeChild(overlay);
  });
}

// Call initialize function when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeLayout);