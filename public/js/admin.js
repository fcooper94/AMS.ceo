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
          <td colspan="7" style="padding: 2rem; text-align: center; color: var(--text-muted);">No users found</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = users.map(user => {
      const creditColor = user.credits < 0 ? 'var(--warning-color)' :
                         user.credits < 4 ? 'var(--text-secondary)' :
                         'var(--success-color)';

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
          <td style="padding: 1rem; font-family: 'Courier New', monospace;">${user.vatsimId}</td>
          <td style="padding: 1rem;">${user.firstName} ${user.lastName}</td>
          <td style="padding: 1rem; color: var(--text-secondary);">${user.email || 'N/A'}</td>
          <td style="padding: 1rem; text-align: center; font-family: 'Courier New', monospace;">${user.membershipCount}</td>
          <td style="padding: 1rem; text-align: center; font-family: 'Courier New', monospace; color: ${creditColor}; font-weight: 600;">${user.credits}</td>
          <td style="padding: 1rem; text-align: center;">${permissionStatus}</td>
          <td style="padding: 1rem; text-align: center;">
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.8rem;" onclick='openEditModal(${JSON.stringify(user)})'>Edit Credits</button>
              <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.8rem;" onclick='openPermissionModal(${JSON.stringify(user)})'>Detailed Permissions</button>
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
        <td colspan="7" style="padding: 2rem; text-align: center; color: var(--warning-color);">Error loading users</td>
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
        <td colspan="7" style="padding: 2rem; text-align: center; color: var(--text-muted);">No users found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredUsers.map(user => {
    const creditColor = user.credits < 0 ? 'var(--warning-color)' :
                       user.credits < 4 ? 'var(--text-secondary)' :
                       'var(--success-color)';

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
        <td style="padding: 1rem; font-family: 'Courier New', monospace;">${user.vatsimId}</td>
        <td style="padding: 1rem;">${user.firstName} ${user.lastName}</td>
        <td style="padding: 1rem; color: var(--text-secondary);">${user.email || 'N/A'}</td>
        <td style="padding: 1rem; text-align: center; font-family: 'Courier New', monospace;">${user.membershipCount}</td>
        <td style="padding: 1rem; text-align: center; font-family: 'Courier New', monospace; color: ${creditColor}; font-weight: 600;">${user.credits}</td>
        <td style="padding: 1rem; text-align: center;">${permissionStatus}</td>
        <td style="padding: 1rem; text-align: center;">
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.8rem;" onclick='openEditModal(${JSON.stringify(user)})'>Edit Credits</button>
            <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.8rem;" onclick='openPermissionModal(${JSON.stringify(user)})'>Detailed Permissions</button>
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
  document.getElementById('editCurrentCredits').textContent = user.credits;
  document.getElementById('newCredits').value = user.credits;
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
      body: JSON.stringify({ credits: newCredits })
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadUsers();
});
