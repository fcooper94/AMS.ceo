let allRoutes = [];
let filteredRoutes = [];
let selectedRouteIds = new Set();

// Format days of week for display
function formatDaysOfWeek(daysArray) {
  if (!daysArray || daysArray.length === 0) return 'No days';
  if (daysArray.length === 7) return 'Daily';

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return daysArray.map(d => dayLabels[d]).join(' ');
}

// Display days of week as visual indicators (M T W T F S S)
function displayDaysOfWeek(daysArray) {
  if (!daysArray || daysArray.length === 0) {
    return '<span style="color: var(--text-muted);">No days</span>';
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // M T W T F S S

  return dayOrder.map(dayIndex => {
    const isActive = daysArray.includes(dayIndex);
    const label = dayLabels[dayIndex];
    const color = isActive ? 'var(--success-color)' : 'var(--border-color)';
    const fontWeight = isActive ? '700' : '400';

    return `<span style="color: ${color}; font-weight: ${fontWeight}; margin: 0 0.15rem;">${label}</span>`;
  }).join('');
}

// Load all routes
async function loadAllRoutes() {
  try {
    const response = await fetch('/api/routes');
    const routes = await response.json();

    if (!response.ok) {
      throw new Error(routes.error || 'Failed to fetch routes');
    }

    allRoutes = routes;
    populateAircraftTypeFilter(routes);
    displayAllRoutes(routes);
  } catch (error) {
    console.error('Error loading routes:', error);
    document.getElementById('routesTable').innerHTML = `
      <div class="empty-message">Error loading routes</div>
    `;
  }
}

// Populate aircraft type filter dropdown
function populateAircraftTypeFilter(routes) {
  const filterSelect = document.getElementById('aircraftTypeFilter');
  if (!filterSelect) return;

  // Extract unique aircraft types from routes
  const aircraftTypes = new Set();
  routes.forEach(route => {
    if (route.assignedAircraft && route.assignedAircraft.aircraft) {
      const aircraft = route.assignedAircraft.aircraft;
      const typeName = `${aircraft.manufacturer} ${aircraft.model}${aircraft.variant ? (aircraft.variant.startsWith('-') ? aircraft.variant : '-' + aircraft.variant) : ''}`;
      aircraftTypes.add(typeName);
    }
  });

  // Sort aircraft types alphabetically
  const sortedTypes = Array.from(aircraftTypes).sort();

  // Keep the "All Aircraft Types" option and add the sorted types
  filterSelect.innerHTML = '<option value="">All Aircraft Types</option>' +
    sortedTypes.map(type => `<option value="${type}">${type}</option>`).join('');
}

// Display all routes in a table
function displayAllRoutes(routes) {
  const container = document.getElementById('routesTable');
  filteredRoutes = routes;

  // Clear selections that are no longer in the filtered list
  const filteredIds = new Set(routes.map(r => r.id));
  selectedRouteIds = new Set([...selectedRouteIds].filter(id => filteredIds.has(id)));
  updateBulkActionBar();

  if (routes.length === 0) {
    container.innerHTML = `
      <div class="empty-message">
        <p>NO ROUTES CREATED YET</p>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">
          Create your first route to start operating flights
        </p>
      </div>
    `;
    return;
  }

  const allSelected = routes.length > 0 && routes.every(r => selectedRouteIds.has(r.id));

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
      <thead>
        <tr style="background: var(--surface-elevated); border-bottom: 2px solid var(--border-color);">
          <th style="padding: 0.5rem; text-align: center; width: 40px;">
            <input type="checkbox" id="selectAllRoutes" onchange="toggleSelectAll(this.checked)" ${allSelected ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--accent-color);" title="Select all routes" />
          </th>
          <th style="padding: 0.5rem; text-align: left; color: var(--text-secondary); font-weight: 600; font-size: 0.75rem;">ROUTE</th>
          <th style="padding: 0.5rem; text-align: left; color: var(--text-secondary); font-weight: 600; font-size: 0.75rem; white-space: nowrap;">FROM → TO</th>
          <th style="padding: 0.5rem; text-align: center; color: var(--text-secondary); font-weight: 600; font-size: 0.75rem;">OPERATING DAYS</th>
          <th style="padding: 0.5rem; text-align: center; color: var(--text-secondary); font-weight: 600; font-size: 0.75rem;">PROFIT</th>
          <th style="padding: 0.5rem; text-align: center; color: var(--text-secondary); font-weight: 600; font-size: 0.75rem;">LOAD %</th>
          <th style="padding: 0.5rem; text-align: center; color: var(--text-secondary); font-weight: 600; font-size: 0.75rem;">STATUS</th>
          <th style="padding: 0.5rem; text-align: center; color: var(--text-secondary); font-weight: 600; font-size: 0.75rem;">ACTIONS</th>
        </tr>
      </thead>
      <tbody>
        ${routes.map(route => {
          const profit = route.profit || 0;
          const profitColor = profit >= 0 ? 'var(--success-color)' : 'var(--warning-color)';
          const statusColor = route.isActive ? 'var(--success-color)' : 'var(--text-muted)';
          const statusText = route.isActive ? 'ACTIVE' : 'INACTIVE';
          const isSelected = selectedRouteIds.has(route.id);

          return `
            <tr style="border-bottom: 1px solid var(--border-color); ${isSelected ? 'background: rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);' : ''}">
              <td style="padding: 0.4rem 0.5rem; text-align: center;">
                <input type="checkbox" class="route-checkbox" data-route-id="${route.id}" onchange="toggleRouteSelection('${route.id}', this.checked)" ${isSelected ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--accent-color);" />
              </td>
              <td style="padding: 0.4rem 0.5rem; color: var(--accent-color); font-weight: 600; white-space: nowrap;">
                ${route.routeNumber}${route.returnRouteNumber ? ' / ' + route.returnRouteNumber : ''}
              </td>
              <td style="padding: 0.4rem 0.5rem; white-space: nowrap;">
                <div style="color: var(--text-primary);">
                  ${route.techStopAirport
                    ? `${route.departureAirport.icaoCode} → <span style="color: var(--accent-color); font-weight: 600;" title="Technical stop for refuelling">${route.techStopAirport.icaoCode}</span> → ${route.arrivalAirport.icaoCode} → <span style="color: var(--accent-color); font-weight: 600;" title="Technical stop for refuelling">${route.techStopAirport.icaoCode}</span> → ${route.departureAirport.icaoCode}`
                    : `${route.departureAirport.icaoCode} → ${route.arrivalAirport.icaoCode} → ${route.departureAirport.icaoCode}`
                  }
                </div>
              </td>
              <td style="padding: 0.4rem 0.5rem; text-align: center; color: var(--text-primary); white-space: nowrap;">
                ${displayDaysOfWeek(route.daysOfWeek)}
              </td>
              <td style="padding: 0.4rem 0.5rem; text-align: center; color: ${profitColor}; font-weight: 600; white-space: nowrap;">
                ${profit >= 0 ? '+' : ''}$${Math.round(profit).toLocaleString('en-US')}
              </td>
              <td style="padding: 0.4rem 0.5rem; text-align: center; color: var(--text-primary); white-space: nowrap;">
                ${(route.averageLoadFactor * 100).toFixed(1)}%
              </td>
              <td style="padding: 0.4rem 0.5rem; text-align: center; white-space: nowrap;">
                <span style="color: ${statusColor}; font-weight: 600; font-size: 0.8rem;">
                  ${statusText}
                </span>
              </td>
              <td style="padding: 0.4rem 0.5rem; text-align: center; white-space: nowrap;">
                <div style="display: flex; gap: 0.25rem; justify-content: center;">
                  <button onclick="editRoute('${route.id}')" title="Edit Route" style="background: transparent; border: none; color: var(--accent-color); cursor: pointer; padding: 0.2rem 0.5rem; font-size: 1rem; line-height: 1; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                    ✎
                  </button>
                  <button onclick="deleteRoute('${route.id}')" title="Delete Route" style="background: transparent; border: none; color: var(--warning-color); cursor: pointer; padding: 0.2rem 0.5rem; font-size: 1.2rem; line-height: 1; font-weight: 400; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                    ×
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHtml;
}

// Toggle select all routes
function toggleSelectAll(checked) {
  if (checked) {
    filteredRoutes.forEach(route => selectedRouteIds.add(route.id));
  } else {
    filteredRoutes.forEach(route => selectedRouteIds.delete(route.id));
  }
  displayAllRoutes(filteredRoutes);
}

// Toggle individual route selection
function toggleRouteSelection(routeId, checked) {
  if (checked) {
    selectedRouteIds.add(routeId);
  } else {
    selectedRouteIds.delete(routeId);
  }
  updateSelectAllCheckbox();
  updateBulkActionBar();
}

// Update select all checkbox state
function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById('selectAllRoutes');
  if (selectAllCheckbox && filteredRoutes.length > 0) {
    const allSelected = filteredRoutes.every(r => selectedRouteIds.has(r.id));
    selectAllCheckbox.checked = allSelected;
  }
}

// Update bulk action bar visibility and count
function updateBulkActionBar() {
  const bulkActionBar = document.getElementById('bulkActionBar');
  const selectedCount = document.getElementById('selectedCount');

  if (!bulkActionBar) return;

  if (selectedRouteIds.size > 0) {
    bulkActionBar.style.display = 'flex';
    selectedCount.textContent = selectedRouteIds.size;
  } else {
    bulkActionBar.style.display = 'none';
  }
}

// Clear all selections
function clearSelection() {
  selectedRouteIds.clear();
  displayAllRoutes(filteredRoutes);
}

// Show bulk delete modal
function showBulkDeleteModal() {
  if (selectedRouteIds.size === 0) return;

  const modal = document.getElementById('bulkDeleteModal');
  const message = document.getElementById('bulkDeleteModalMessage');
  const count = selectedRouteIds.size;

  message.textContent = `Are you sure you want to delete ${count} route${count > 1 ? 's' : ''}?`;
  modal.style.display = 'flex';
}

// Close bulk delete modal
function closeBulkDeleteModal() {
  document.getElementById('bulkDeleteModal').style.display = 'none';
}

// Confirm and execute bulk delete
async function confirmBulkDelete() {
  if (selectedRouteIds.size === 0) return;

  const routeIds = Array.from(selectedRouteIds);
  const count = routeIds.length;

  closeBulkDeleteModal();

  try {
    const response = await fetch('/api/routes/bulk', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ routeIds })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete routes');
    }

    // Clear selections and reload routes
    selectedRouteIds.clear();
    await loadAllRoutes();

    // Show success banner
    showSuccessBanner('bulk_deleted', `${data.deletedCount} route${data.deletedCount > 1 ? 's' : ''}`);
  } catch (error) {
    console.error('Error bulk deleting routes:', error);
    alert(`Error: ${error.message}`);
  }
}

// Filter routes based on search input and aircraft type
function filterRoutes() {
  const searchInput = document.getElementById('routeSearchInput');
  const aircraftTypeFilter = document.getElementById('aircraftTypeFilter');

  if (!searchInput || !aircraftTypeFilter) return;

  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedAircraftType = aircraftTypeFilter.value;

  // Filter routes based on both search term and aircraft type
  let filtered = allRoutes;

  // Apply aircraft type filter
  if (selectedAircraftType !== '') {
    filtered = filtered.filter(route => {
      if (!route.assignedAircraft || !route.assignedAircraft.aircraft) return false;

      const aircraft = route.assignedAircraft.aircraft;
      const typeName = `${aircraft.manufacturer} ${aircraft.model}${aircraft.variant ? (aircraft.variant.startsWith('-') ? aircraft.variant : '-' + aircraft.variant) : ''}`;

      return typeName === selectedAircraftType;
    });
  }

  // Apply search term filter
  if (searchTerm !== '') {
    filtered = filtered.filter(route => {
      // Search in flight numbers
      if (route.routeNumber?.toLowerCase().includes(searchTerm)) return true;
      if (route.returnRouteNumber?.toLowerCase().includes(searchTerm)) return true;

      // Search in departure airport
      if (route.departureAirport?.icaoCode?.toLowerCase().includes(searchTerm)) return true;
      if (route.departureAirport?.iataCode?.toLowerCase().includes(searchTerm)) return true;
      if (route.departureAirport?.name?.toLowerCase().includes(searchTerm)) return true;
      if (route.departureAirport?.city?.toLowerCase().includes(searchTerm)) return true;

      // Search in arrival airport
      if (route.arrivalAirport?.icaoCode?.toLowerCase().includes(searchTerm)) return true;
      if (route.arrivalAirport?.iataCode?.toLowerCase().includes(searchTerm)) return true;
      if (route.arrivalAirport?.name?.toLowerCase().includes(searchTerm)) return true;
      if (route.arrivalAirport?.city?.toLowerCase().includes(searchTerm)) return true;

      // Search in tech stop airport (if present)
      if (route.techStopAirport) {
        if (route.techStopAirport?.icaoCode?.toLowerCase().includes(searchTerm)) return true;
        if (route.techStopAirport?.iataCode?.toLowerCase().includes(searchTerm)) return true;
        if (route.techStopAirport?.name?.toLowerCase().includes(searchTerm)) return true;
        if (route.techStopAirport?.city?.toLowerCase().includes(searchTerm)) return true;
      }

      return false;
    });
  }

  displayAllRoutes(filtered);
}

// Create new route - navigate to creation page
function createNewRoute() {
  window.location.href = '/routes/create';
}

// Edit route - navigate to edit page
function editRoute(routeId) {
  window.location.href = `/routes/edit?id=${routeId}`;
}

// Store route to be deleted
let pendingDeleteRoute = null;

// Delete route - show modal
function deleteRoute(routeId) {
  const route = allRoutes.find(r => r.id === routeId);
  if (!route) return;

  pendingDeleteRoute = route;

  // Show modal
  const modal = document.getElementById('deleteModal');
  const message = document.getElementById('deleteModalMessage');
  message.textContent = `Are you sure you want to delete route ${route.routeNumber}${route.returnRouteNumber ? ' / ' + route.returnRouteNumber : ''}?`;
  modal.style.display = 'flex';
}

// Close delete modal
function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
  pendingDeleteRoute = null;
}

// Confirm and execute delete
async function confirmDeleteRoute() {
  if (!pendingDeleteRoute) return;

  const route = pendingDeleteRoute;
  const routeNumber = route.routeNumber;

  closeDeleteModal();

  try {
    const response = await fetch(`/api/routes/${route.id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete route');
    }

    // Reload routes after deletion
    await loadAllRoutes();

    // Show success banner
    showSuccessBanner('deleted', routeNumber);
  } catch (error) {
    console.error('Error deleting route:', error);
    alert(`Error: ${error.message}`);
  }
}

// Show success banner (from URL params or direct call)
function showSuccessBanner(type = null, route = null) {
  // Check URL params if not provided directly
  if (!type || !route) {
    const urlParams = new URLSearchParams(window.location.search);
    type = urlParams.get('success');
    route = urlParams.get('route');
  }

  if (!type || !route) return;

  const container = document.getElementById('successBannerContainer');
  if (!container) return;

  // Clear any existing banners
  container.innerHTML = '';

  const routeNumber = decodeURIComponent(route);
  let message = '';
  let link = '';

  if (type === 'created') {
    message = `✓ Route ${routeNumber} created successfully!`;
    link = `<a href="/scheduling" style="color: var(--success-color); text-decoration: underline; margin-left: 1rem;">Assign it on the scheduling page</a>`;
  } else if (type === 'deleted') {
    message = `✓ Route ${routeNumber} deleted successfully!`;
    link = '';
  } else if (type === 'bulk_deleted') {
    message = `✓ ${routeNumber} deleted successfully!`;
    link = '';
  }

  const banner = document.createElement('div');
  banner.style.cssText = `
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid var(--success-color);
    border-radius: 4px;
    color: var(--success-color);
    padding: 1rem 1.5rem;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  banner.innerHTML = `
    <div>
      <span style="font-weight: 600;">${message}</span>
      ${link}
    </div>
    <button onclick="this.parentElement.remove()" style="background: none; border: none; color: var(--success-color); font-size: 1.5rem; cursor: pointer; padding: 0 0.5rem; line-height: 1;">×</button>
  `;
  container.appendChild(banner);

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (banner.parentElement) {
      banner.remove();
    }
  }, 10000);

  // Clean up URL if it came from URL params
  if (window.location.search) {
    window.history.replaceState({}, '', '/routes');
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  showSuccessBanner();
  loadAllRoutes();
});
