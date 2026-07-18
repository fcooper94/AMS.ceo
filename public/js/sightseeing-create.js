/**
 * Sightseeing Tour builder.
 * Click the map to drop scenic waypoints; the tour departs from and returns to
 * the airline's base airport. Distance/duration update live from the chosen
 * aircraft's cruise speed. Saves to POST /api/sightseeing-tours.
 */

let baseAirport = null;
let eraMultiplier = 1;   // era price scaling (1950 ≈ 0.10, 2024 = 1.0)
let userFleet = [];
let waypoints = [];        // [{lat, lng, name}]
let tourMap = null;
let baseMarker = null;
let wpMarkers = [];
let pathLine = null;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let selectedDays = [0, 1, 2, 3, 4, 5, 6];

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (typeof L !== 'undefined') return resolve();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function tourDistanceNm() {
  if (!baseAirport || waypoints.length === 0) return 0;
  const b = { lat: parseFloat(baseAirport.latitude), lng: parseFloat(baseAirport.longitude) };
  const pts = [b, ...waypoints, b];
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += haversineNm(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
  return d;
}

function selectedAircraft() {
  const id = document.getElementById('tourAircraft').value;
  return userFleet.find(a => a.id === id) || null;
}

function tourDurationMin(distanceNm) {
  const ac = selectedAircraft();
  const kts = ac?.aircraft?.cruiseSpeed || 0;
  if (!kts || distanceNm <= 0) return null;
  return Math.max(5, Math.round((distanceNm / kts * 60) / 5) * 5);
}

function fmtDuration(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Map ──────────────────────────────────────────────────────────────
async function initMap() {
  await loadLeaflet();
  const lat = parseFloat(baseAirport.latitude), lng = parseFloat(baseAirport.longitude);
  tourMap = L.map('tourMap', { center: [lat, lng], zoom: 9, attributionControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 19 }).addTo(tourMap);

  baseMarker = L.circleMarker([lat, lng], { radius: 8, color: '#58a6ff', fillColor: '#58a6ff', fillOpacity: 0.9, weight: 2 })
    .addTo(tourMap).bindTooltip(`${baseAirport.icaoCode} (base)`, { permanent: false });

  tourMap.on('click', (e) => addWaypoint(e.latlng.lat, e.latlng.lng));
  redrawMap();
}

function addWaypoint(lat, lng) {
  if (waypoints.length >= 25) { showError('A tour can have at most 25 waypoints.'); return; }
  waypoints.push({ lat: +lat.toFixed(5), lng: +lng.toFixed(5), name: '' });
  clearError();
  redrawMap();
  render();
}

function removeWaypoint(i) {
  waypoints.splice(i, 1);
  redrawMap();
  render();
}

function redrawMap() {
  if (!tourMap) return;
  wpMarkers.forEach(m => tourMap.removeLayer(m));
  wpMarkers = [];
  if (pathLine) { tourMap.removeLayer(pathLine); pathLine = null; }

  waypoints.forEach((w, i) => {
    const m = L.circleMarker([w.lat, w.lng], { radius: 7, color: '#f0b429', fillColor: '#f0b429', fillOpacity: 0.85, weight: 2 })
      .addTo(tourMap).bindTooltip(`Waypoint ${i + 1} — click to remove`);
    m.on('click', (ev) => { L.DomEvent.stopPropagation(ev); removeWaypoint(i); });
    wpMarkers.push(m);
  });

  if (baseAirport && waypoints.length > 0) {
    const b = [parseFloat(baseAirport.latitude), parseFloat(baseAirport.longitude)];
    const coords = [b, ...waypoints.map(w => [w.lat, w.lng]), b];
    pathLine = L.polyline(coords, { color: '#58a6ff', weight: 2, opacity: 0.8, dashArray: '4,4' }).addTo(tourMap);
  }
}

// ── Render panel ─────────────────────────────────────────────────────
function render() {
  const dist = tourDistanceNm();
  const dur = tourDurationMin(dist);
  document.getElementById('tourDist').textContent = Math.round(dist).toLocaleString();
  document.getElementById('tourDur').textContent = fmtDuration(dur);

  // Range hint for the selected aircraft
  const ac = selectedAircraft();
  const rangeHint = document.getElementById('tourRangeHint');
  if (ac && ac.aircraft) {
    const range = parseFloat(ac.aircraft.rangeNm) || 0;
    const seats = ac.aircraft.passengerCapacity || 0;
    if (range && dist > range) {
      rangeHint.innerHTML = `<span style="color:#f85149;">Tour ${Math.round(dist)} nm exceeds this aircraft's ${range} nm range.</span>`;
    } else {
      rangeHint.textContent = `${ac.aircraft.cruiseSpeed} kt · ${range} nm range · ${seats} seats`;
    }
  } else {
    rangeHint.textContent = 'Pick an aircraft to compute duration and check range.';
  }

  // Suggested price hint (rough guide for the flat revenue model), era-scaled
  // so a 1950 tour shows 1950-appropriate prices rather than 2024 ones.
  const priceHint = document.getElementById('tourPriceHint');
  if (dur) {
    const suggested = Math.max(5, Math.round((dur * 3 * eraMultiplier) / 5) * 5); // ~$3/scenic-min in 2024 terms
    priceHint.textContent = `Suggested around $${suggested.toLocaleString()} for a ${fmtDuration(dur)} flight.`;
  } else {
    priceHint.textContent = '';
  }

  // Waypoint list
  document.getElementById('wpCount').textContent = waypoints.length;
  const list = document.getElementById('wpList');
  list.innerHTML = waypoints.map((w, i) =>
    `<div class="wp-item"><span class="idx">${i + 1}</span>
      <span>${w.lat.toFixed(3)}, ${w.lng.toFixed(3)}</span>
      <button class="rm" data-i="${i}" title="Remove">&times;</button>
    </div>`).join('') || '<div class="tour-hint">No waypoints yet — click the map.</div>';
  list.querySelectorAll('.rm').forEach(btn => btn.addEventListener('click', () => removeWaypoint(parseInt(btn.dataset.i))));
}

function renderDays() {
  const row = document.getElementById('tourDays');
  row.innerHTML = DAY_LABELS.map((d, i) =>
    `<div class="day-toggle ${selectedDays.includes(i) ? 'on' : ''}" data-day="${i}">${d}</div>`).join('');
  row.querySelectorAll('.day-toggle').forEach(el => el.addEventListener('click', () => {
    const day = parseInt(el.dataset.day);
    if (selectedDays.includes(day)) selectedDays = selectedDays.filter(d => d !== day);
    else selectedDays.push(day);
    el.classList.toggle('on');
  }));
}

function showError(msg) { const e = document.getElementById('tourError'); e.textContent = msg; e.style.display = 'block'; }
function clearError() { const e = document.getElementById('tourError'); e.style.display = 'none'; }

// ── Data ─────────────────────────────────────────────────────────────
async function loadBaseAirport() {
  const r = await fetch('/api/world/info');
  const info = await r.json();
  baseAirport = info.baseAirport;
  if (info.eraMultiplier) eraMultiplier = info.eraMultiplier;
  document.getElementById('tourBaseLabel').textContent = baseAirport ? `${baseAirport.icaoCode} — ${baseAirport.name}` : 'No base airport';
}

async function loadFleet() {
  const r = await fetch('/api/fleet');
  const data = await r.json();
  userFleet = (data.fleet || data).filter(a => a.aircraft && (a.status === 'active' || a.status === 'stored' || !a.status));
  const sel = document.getElementById('tourAircraft');
  userFleet.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    const ac = a.aircraft;
    opt.textContent = `${a.registration} — ${ac.manufacturer} ${ac.model}${ac.variant ? ' ' + ac.variant : ''}`;
    sel.appendChild(opt);
  });
}

async function saveTour() {
  clearError();
  const name = document.getElementById('tourName').value.trim();
  const aircraftId = document.getElementById('tourAircraft').value;
  const price = parseFloat(document.getElementById('tourPrice').value);
  const time = document.getElementById('tourTime').value;

  if (!name) return showError('Please give the tour a name.');
  if (waypoints.length < 1) return showError('Add at least one scenic waypoint on the map.');
  if (!isFinite(price) || price < 0) return showError('Enter a valid ticket price.');
  if (selectedDays.length === 0) return showError('Select at least one operating day.');

  const btn = document.getElementById('saveTourBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const res = await fetch('/api/sightseeing-tours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        baseAirportId: baseAirport.id,
        waypoints,
        ticketPrice: price,
        assignedAircraftId: aircraftId || null,
        scheduledDepartureTime: time || null,
        daysOfWeek: selectedDays.slice().sort((a, b) => a - b)
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      window.location.href = '/routes';
    } else {
      showError(data.error || 'Failed to save tour.');
      btn.disabled = false; btn.textContent = 'Save Tour';
    }
  } catch (err) {
    showError('Network error. Please try again.');
    btn.disabled = false; btn.textContent = 'Save Tour';
  }
}

async function init() {
  renderDays();
  await loadBaseAirport();
  if (!baseAirport) { showError('Your airline has no base airport set.'); return; }
  await Promise.all([loadFleet(), initMap()]);
  render();

  document.getElementById('tourAircraft').addEventListener('change', render);
  document.getElementById('tourPrice').addEventListener('input', render);
  document.getElementById('clearWpBtn').addEventListener('click', () => { waypoints = []; redrawMap(); render(); });
  document.getElementById('saveTourBtn').addEventListener('click', saveTour);
  document.getElementById('cancelTourBtn').addEventListener('click', () => { window.location.href = '/routes'; });
}

document.addEventListener('DOMContentLoaded', init);
