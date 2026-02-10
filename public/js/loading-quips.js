// Shared loading quips - rotating aviation humour for loading overlays
const LOADING_QUIPS = [
  'Convincing the pilots to show up...',
  'Negotiating with air traffic control...',
  'Searching for the missing aircraft...',
  'Checking if the coffee machine is fixed...',
  'Bribing the baggage handlers...',
  'Waiting for the captain to finish parking...',
  'De-icing the spreadsheets...',
  'Recalculating after wind changed direction...',
  'Asking maintenance to stop hiding the aircraft...',
  'Untangling the flight paths...',
  'Evicting pigeons from Engine 2...',
  'Teaching the new intern what UTC means...',
  'Locating the duty-free cart...',
  'Explaining to scheduling why 25 hours is not a valid day...',
  'Reattaching the winglets with duct tape...',
  'Politely asking the thunderstorm to move...',
  'Checking no one parked on the runway again...',
  'Apologising to Gate 7 for the double booking...',
];

let _loadingQuipInterval = null;

/**
 * Start rotating quips on an element. Call stopLoadingQuips() when loading finishes.
 * @param {string} elementId - ID of the element to update with quips
 */
function startLoadingQuips(elementId) {
  stopLoadingQuips();
  let index = Math.floor(Math.random() * LOADING_QUIPS.length);
  const el = document.getElementById(elementId);
  if (el) el.textContent = LOADING_QUIPS[index];
  _loadingQuipInterval = setInterval(() => {
    index = (index + 1) % LOADING_QUIPS.length;
    const el = document.getElementById(elementId);
    if (el) el.textContent = LOADING_QUIPS[index];
  }, 3000);
}

/**
 * Stop the rotating quips interval.
 */
function stopLoadingQuips() {
  if (_loadingQuipInterval) {
    clearInterval(_loadingQuipInterval);
    _loadingQuipInterval = null;
  }
}
