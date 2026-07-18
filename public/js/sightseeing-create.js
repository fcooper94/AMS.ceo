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
let editTourId = null;   // set when editing an existing tour (?id=…); only price + aircraft change

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
  if (editTourId) return; // route is fixed when editing — only price + aircraft change
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
      .addTo(tourMap).bindTooltip(editTourId ? `Waypoint ${i + 1}` : `Waypoint ${i + 1} — click to remove`);
    if (!editTourId) m.on('click', (ev) => { L.DomEvent.stopPropagation(ev); removeWaypoint(i); });
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

  // Waypoint list (no remove buttons in edit mode — the route is fixed)
  document.getElementById('wpCount').textContent = waypoints.length;
  const list = document.getElementById('wpList');
  list.innerHTML = waypoints.map((w, i) =>
    `<div class="wp-item"><span class="idx">${i + 1}</span>
      <span>${w.lat.toFixed(3)}, ${w.lng.toFixed(3)}</span>
      ${editTourId ? '' : `<button class="rm" data-i="${i}" title="Remove">&times;</button>`}
    </div>`).join('') || '<div class="tour-hint">No waypoints yet — click the map.</div>';
  if (!editTourId) list.querySelectorAll('.rm').forEach(btn => btn.addEventListener('click', () => removeWaypoint(parseInt(btn.dataset.i))));
}

function renderDays() {
  const row = document.getElementById('tourDays');
  const locked = !!editTourId; // operating days are fixed when editing
  row.innerHTML = DAY_LABELS.map((d, i) =>
    `<div class="day-toggle ${selectedDays.includes(i) ? 'on' : ''}" data-day="${i}"${locked ? ' style="opacity:0.6;cursor:default;"' : ''}>${d}</div>`).join('');
  if (locked) return;
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

function _typeKeyOf(ac) {
  return `${ac.manufacturer} ${ac.model}${ac.variant ? ' ' + ac.variant : ''}`;
}

async function loadFleet() {
  const r = await fetch('/api/fleet');
  const data = await r.json();
  userFleet = (data.fleet || data).filter(a => a.aircraft && (a.status === 'active' || a.status === 'stored' || !a.status));
  const sel = document.getElementById('tourAircraft');
  // Tours are assigned to an aircraft TYPE (any aircraft of that type flies it),
  // like routes — group the fleet by type and store a representative aircraft id.
  const byType = new Map();
  userFleet.forEach(a => {
    const key = _typeKeyOf(a.aircraft);
    if (!byType.has(key)) byType.set(key, { key, rep: a, count: 0 });
    byType.get(key).count++;
  });
  [...byType.values()].sort((x, y) => x.key.localeCompare(y.key)).forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.rep.id;            // representative aircraft of this type
    opt.dataset.typeKey = g.key;
    opt.textContent = `${g.key} (${g.count})`;
    sel.appendChild(opt);
  });
}

async function saveTour() {
  clearError();
  const aircraftId = document.getElementById('tourAircraft').value;
  const price = parseFloat(document.getElementById('tourPrice').value);
  if (!isFinite(price) || price < 0) return showError('Enter a valid ticket price.');

  const btn = document.getElementById('saveTourBtn');
  const savingLabel = editTourId ? 'Save Changes' : 'Save Tour';
  btn.disabled = true; btn.textContent = 'Saving…';

  try {
    let res;
    if (editTourId) {
      // Edit mode: only price + assigned aircraft are changeable.
      res = await fetch(`/api/sightseeing-tours/${editTourId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketPrice: price, assignedAircraftId: aircraftId || null })
      });
    } else {
      const name = document.getElementById('tourName').value.trim();
      const time = document.getElementById('tourTime').value;
      if (!name) { btn.disabled = false; btn.textContent = savingLabel; return showError('Please give the tour a name.'); }
      if (waypoints.length < 1) { btn.disabled = false; btn.textContent = savingLabel; return showError('Add at least one scenic waypoint on the map.'); }
      if (selectedDays.length === 0) { btn.disabled = false; btn.textContent = savingLabel; return showError('Select at least one operating day.'); }
      res = await fetch('/api/sightseeing-tours', {
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
    }
    const data = await res.json();
    if (res.ok && data.success) {
      window.location.href = '/routes';
    } else {
      showError(data.error || 'Failed to save tour.');
      btn.disabled = false; btn.textContent = savingLabel;
    }
  } catch (err) {
    showError('Network error. Please try again.');
    btn.disabled = false; btn.textContent = savingLabel;
  }
}

// Load an existing tour into the form (edit mode) and lock everything but price + aircraft.
async function loadTourForEdit() {
  const r = await fetch('/api/sightseeing-tours');
  const tours = await r.json();
  const t = Array.isArray(tours) ? tours.find(x => x.id === editTourId) : null;
  if (!t) { showError('Tour not found.'); editTourId = null; return; }

  if (t.baseAirport) baseAirport = t.baseAirport; // centre the map on the tour's base
  waypoints = (t.waypoints || []).map(w => ({ lat: +w.lat, lng: +w.lng, name: w.name || '' }));
  selectedDays = Array.isArray(t.daysOfWeek) ? t.daysOfWeek.slice() : [0, 1, 2, 3, 4, 5, 6];

  const nameEl = document.getElementById('tourName');
  nameEl.value = t.name || ''; nameEl.disabled = true;
  document.getElementById('tourPrice').value = Math.round(parseFloat(t.ticketPrice)) || '';
  const timeEl = document.getElementById('tourTime');
  if (t.scheduledDepartureTime) timeEl.value = t.scheduledDepartureTime.substring(0, 5);
  timeEl.disabled = true;
  // Select the type option matching the tour's assigned aircraft type.
  const sel = document.getElementById('tourAircraft');
  if (t.assignedAircraft) {
    const typeKey = _typeKeyOf(t.assignedAircraft);
    const opt = [...sel.options].find(o => o.dataset.typeKey === typeKey);
    if (opt) sel.value = opt.value;
  }

  const clearBtn = document.getElementById('clearWpBtn');
  if (clearBtn) clearBtn.style.display = 'none';
  const h1 = document.querySelector('h1');
  if (h1) h1.textContent = 'EDIT SIGHTSEEING TOUR';
  const hint = h1?.parentElement?.querySelector('.tour-hint');
  if (hint) hint.textContent = 'Only the ticket price and assigned aircraft can be changed.';
  const saveBtn = document.getElementById('saveTourBtn');
  if (saveBtn) saveBtn.textContent = 'Save Changes';

  renderDays(); // re-render (locked) with the tour's days
}

async function init() {
  editTourId = new URLSearchParams(window.location.search).get('id');
  renderDays();
  await loadBaseAirport();
  if (!baseAirport) { showError('Your airline has no base airport set.'); return; }
  await loadFleet();
  if (editTourId) await loadTourForEdit();
  await initMap();
  render();

  document.getElementById('tourAircraft').addEventListener('change', render);
  document.getElementById('tourPrice').addEventListener('input', render);
  const clearBtn = document.getElementById('clearWpBtn');
  if (clearBtn) clearBtn.addEventListener('click', () => { if (editTourId) return; waypoints = []; redrawMap(); render(); });
  document.getElementById('saveTourBtn').addEventListener('click', saveTour);
  document.getElementById('cancelTourBtn').addEventListener('click', () => { window.location.href = '/routes'; });
}

document.addEventListener('DOMContentLoaded', init);
