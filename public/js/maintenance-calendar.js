// Maintenance Calendar — weekly Gantt-style view with drag-and-drop scheduling

var _calWeekStart = null; // Date (Monday of displayed week, UTC)
var _calData = null;      // Last API response
var _calDragCheck = null;  // Currently dragged sidebar item { aircraftId, checkType, registration }

// Check type colors (match scheduling page)
var CAL_COLORS = {
  daily:  '#F59E0B',
  weekly: '#8B5CF6',
  A:      '#17A2B8',
  C:      '#6B7280',
  D:      '#4B5563'
};

var CAL_LABELS = { daily: 'DY', weekly: 'WK', A: 'A', C: 'C', D: 'D' };
var CAL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
var _calFlightIndex = {}; // key: aircraftId:date -> array of flight blocks

// ── Initialisation ──────────────────────────────────────────────────────────

function initCalendar() {
  // Compute Monday of the current game-time week
  var now = _calGetGameTime();
  _calWeekStart = _calGetMonday(now);

  _calInitSidebarDrag();
  loadCalendarData();
}

function _calGetGameTime() {
  // Use the global world time if available (from layout.js)
  if (typeof getGlobalWorldTime === 'function') {
    var t = getGlobalWorldTime();
    if (t) return new Date(t);
  }
  return new Date();
}

function _calGetMonday(d) {
  var dt = new Date(d);
  var dow = dt.getUTCDay(); // 0=Sun
  var diff = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(dt.getUTCDate() + diff);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}

function _calFmtDate(d) {
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getUTCDate() + ' ' + months[d.getUTCMonth()];
}

function _calFmtDateFull(d) {
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getUTCDate() + ' ' + months[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}

function _calDateStr(d) {
  return d.toISOString().split('T')[0];
}

// ── Week navigation ─────────────────────────────────────────────────────────

function calNavWeek(dir) {
  _calWeekStart.setUTCDate(_calWeekStart.getUTCDate() + dir * 7);
  loadCalendarData();
}

function calGoToday() {
  _calWeekStart = _calGetMonday(_calGetGameTime());
  loadCalendarData();
}

// ── Global Maintenance Settings Modal (matches scheduling page) ────────────

function calShowMaintenanceModal() {
  var existing = document.getElementById('calMaintenanceModal');
  if (existing) existing.remove();

  if (!_calData || !_calData.aircraft || _calData.aircraft.length === 0) {
    alert('No aircraft in fleet.');
    return;
  }

  var ac = _calData.aircraft;
  var total = ac.length;
  var counts = {
    daily: ac.filter(function(a) { return a.autoScheduleDaily; }).length,
    weekly: ac.filter(function(a) { return a.autoScheduleWeekly; }).length,
    A: ac.filter(function(a) { return a.autoScheduleA; }).length,
    C: ac.filter(function(a) { return a.autoScheduleC; }).length,
    D: ac.filter(function(a) { return a.autoScheduleD; }).length
  };

  var checkTypes = [
    { type: 'daily', name: 'Daily Check', color: '#3fb950', desc: 'Every 24 hours of operation' },
    { type: 'weekly', name: 'Weekly Check', color: '#a371f7', desc: 'Every 7 days' },
    { type: 'A', name: 'A Check', color: '#58a6ff', desc: 'Light maintenance (~500 flight hours)' },
    { type: 'C', name: 'C Check', color: '#f97316', desc: 'Heavy maintenance (~20 months)' },
    { type: 'D', name: 'D Check', color: '#f85149', desc: 'Major overhaul (~6 years)' }
  ];

  var checkRows = '';
  for (var i = 0; i < checkTypes.length; i++) {
    var ck = checkTypes[i];
    var isOn = counts[ck.type] === total;
    checkRows += '<div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem;background:var(--surface-elevated);border-radius:6px;">'
      + '<div style="display:flex;align-items:center;gap:0.75rem;">'
      + '<span style="color:' + ck.color + ';font-weight:600;font-size:0.9rem;min-width:100px;">' + ck.name + '</span>'
      + '<span style="color:var(--text-muted);font-size:0.8rem;">' + ck.desc + '</span>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:0.75rem;">'
      + '<span style="color:var(--text-muted);font-size:0.75rem;">' + counts[ck.type] + '/' + total + ' enabled</span>'
      + '<label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;">'
      + '<input type="checkbox" id="calGlobal_' + ck.type + '"' + (isOn ? ' checked' : '') + ' style="opacity:0;width:0;height:0;">'
      + '<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:' + (isOn ? ck.color : 'var(--surface)') + ';border:1px solid ' + (isOn ? ck.color : 'var(--border-color)') + ';transition:0.2s;border-radius:24px;"></span>'
      + '<span style="position:absolute;height:18px;width:18px;left:' + (isOn ? '23px' : '3px') + ';top:3px;background:white;transition:0.2s;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>'
      + '</label></div></div>';
  }

  var allOn = counts.daily === total && counts.weekly === total && counts.A === total && counts.C === total && counts.D === total;

  var html = '<div id="calMaintenanceModal" onclick="_calCloseMaintenanceModal()" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:10000;">'
    + '<div onclick="event.stopPropagation()" style="background:#161b22;border:1px solid #30363d;border-radius:8px;min-width:500px;max-width:600px;box-shadow:0 8px 32px rgba(0,0,0,0.4);">'

    // Header
    + '<div style="padding:1rem 1.5rem;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center;">'
    + '<h3 style="margin:0;color:#f0f6fc;font-size:1.1rem;display:flex;align-items:center;gap:0.5rem;">'
    + '<span style="font-size:1.2rem;">&#128295;</span> Auto-Schedule Settings'
    + '</h3>'
    + '<button onclick="_calCloseMaintenanceModal()" style="background:none;border:none;color:#8b949e;font-size:1.5rem;cursor:pointer;padding:0;line-height:1;">&times;</button>'
    + '</div>'

    // Body
    + '<div style="padding:1.5rem;">'
    + '<p style="color:#8b949e;margin:0 0 1rem 0;font-size:0.9rem;">'
    + 'Configure auto-scheduling for maintenance checks across all <strong style="color:#f0f6fc;">' + total + ' aircraft</strong> in your fleet.'
    + '</p>'

    // Auto All toggle
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:linear-gradient(135deg,rgba(88,166,255,0.15),rgba(163,113,247,0.15));border:1px solid rgba(88,166,255,0.3);border-radius:6px;margin-bottom:0.75rem;">'
    + '<div style="display:flex;align-items:center;gap:0.75rem;">'
    + '<span style="color:#f0f6fc;font-weight:700;font-size:0.95rem;">Auto All</span>'
    + '<span style="color:#8b949e;font-size:0.8rem;">Enable/disable all checks at once</span>'
    + '</div>'
    + '<label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;">'
    + '<input type="checkbox" id="calGlobal_all"' + (allOn ? ' checked' : '') + ' style="opacity:0;width:0;height:0;">'
    + '<span id="calGlobal_all_slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:' + (allOn ? '#58a6ff' : 'var(--surface)') + ';border:1px solid ' + (allOn ? '#58a6ff' : 'var(--border-color)') + ';transition:0.2s;border-radius:24px;"></span>'
    + '<span id="calGlobal_all_knob" style="position:absolute;height:18px;width:18px;left:' + (allOn ? '23px' : '3px') + ';top:3px;background:white;transition:0.2s;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>'
    + '</label></div>'

    // Individual checks
    + '<p style="color:#8b949e;margin:0 0 0.5rem 0;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">Individual Checks</p>'
    + '<div style="display:flex;flex-direction:column;gap:0.5rem;">' + checkRows + '</div>'

    // Warning box
    + '<div id="calMaintWarning" style="display:none;margin-top:1rem;padding:0.75rem;background:rgba(248,81,73,0.1);border:1px solid rgba(248,81,73,0.3);border-radius:6px;">'
    + '<p style="color:#f85149;margin:0;font-size:0.8rem;">'
    + '<strong>Warning:</strong> Disabling auto-schedule will remove all future scheduled maintenance for those check types. Checks already in progress will not be affected.'
    + '</p></div>'

    // Note
    + '<div style="margin-top:0.75rem;padding:0.75rem;background:rgba(88,166,255,0.1);border:1px solid rgba(88,166,255,0.2);border-radius:6px;">'
    + '<p style="color:#8b949e;margin:0;font-size:0.8rem;">'
    + '<strong style="color:#58a6ff;">Note:</strong> Aircraft with expired checks will have auto-scheduling enabled but checks won\'t be scheduled until the expired check is performed manually.'
    + '</p></div>'

    + '</div>'

    // Footer
    + '<div style="padding:1rem 1.5rem;border-top:1px solid #30363d;display:flex;justify-content:flex-end;gap:0.75rem;">'
    + '<button onclick="_calCloseMaintenanceModal()" style="padding:0.5rem 1rem;background:#21262d;border:1px solid #30363d;border-radius:6px;color:#c9d1d9;cursor:pointer;font-size:0.9rem;">Cancel</button>'
    + '<button onclick="_calApplyMaintenanceSettings()" style="padding:0.5rem 1rem;background:#238636;border:1px solid #2ea043;border-radius:6px;color:white;cursor:pointer;font-size:0.9rem;font-weight:500;">Apply to All Aircraft</button>'
    + '</div>'

    + '</div></div>';

  document.body.insertAdjacentHTML('beforeend', html);

  // Wire up toggle listeners
  var types = ['daily', 'weekly', 'A', 'C', 'D'];
  var colors = { daily: '#3fb950', weekly: '#a371f7', A: '#58a6ff', C: '#f97316', D: '#f85149' };

  for (var ti = 0; ti < types.length; ti++) {
    (function(type) {
      var inp = document.getElementById('calGlobal_' + type);
      if (!inp) return;
      inp.addEventListener('change', function() {
        var slider = this.nextElementSibling;
        var knob = slider.nextElementSibling;
        if (this.checked) {
          slider.style.background = colors[type];
          slider.style.borderColor = colors[type];
          knob.style.left = '23px';
        } else {
          slider.style.background = 'var(--surface)';
          slider.style.borderColor = 'var(--border-color)';
          knob.style.left = '3px';
        }
        _calUpdateAutoAllToggle(types, colors);
        _calUpdateWarning(types);
      });
    })(types[ti]);
  }

  // Auto All toggle
  var autoAll = document.getElementById('calGlobal_all');
  if (autoAll) {
    autoAll.addEventListener('change', function() {
      var isChecked = this.checked;
      var slider = document.getElementById('calGlobal_all_slider');
      var knob = document.getElementById('calGlobal_all_knob');
      if (isChecked) {
        slider.style.background = '#58a6ff';
        slider.style.borderColor = '#58a6ff';
        knob.style.left = '23px';
      } else {
        slider.style.background = 'var(--surface)';
        slider.style.borderColor = 'var(--border-color)';
        knob.style.left = '3px';
      }
      for (var j = 0; j < types.length; j++) {
        var inp2 = document.getElementById('calGlobal_' + types[j]);
        if (inp2 && inp2.checked !== isChecked) {
          inp2.checked = isChecked;
          var s = inp2.nextElementSibling;
          var k = s.nextElementSibling;
          if (isChecked) {
            s.style.background = colors[types[j]];
            s.style.borderColor = colors[types[j]];
            k.style.left = '23px';
          } else {
            s.style.background = 'var(--surface)';
            s.style.borderColor = 'var(--border-color)';
            k.style.left = '3px';
          }
        }
      }
      _calUpdateWarning(types);
    });
  }

  // Initial warning state
  _calUpdateWarning(types);
}

function _calUpdateAutoAllToggle(types, colors) {
  var allChecked = true;
  for (var i = 0; i < types.length; i++) {
    var inp = document.getElementById('calGlobal_' + types[i]);
    if (!inp || !inp.checked) { allChecked = false; break; }
  }
  var autoAll = document.getElementById('calGlobal_all');
  var slider = document.getElementById('calGlobal_all_slider');
  var knob = document.getElementById('calGlobal_all_knob');
  if (autoAll && slider && knob) {
    autoAll.checked = allChecked;
    slider.style.background = allChecked ? '#58a6ff' : 'var(--surface)';
    slider.style.borderColor = allChecked ? '#58a6ff' : 'var(--border-color)';
    knob.style.left = allChecked ? '23px' : '3px';
  }
}

function _calUpdateWarning(types) {
  // Show warning if ANY check type is being turned off (was on for all, now unchecked)
  var warning = document.getElementById('calMaintWarning');
  if (!warning || !_calData) return;

  var ac = _calData.aircraft;
  var total = ac.length;
  var anyDisabling = false;
  var fieldMap = { daily: 'autoScheduleDaily', weekly: 'autoScheduleWeekly', A: 'autoScheduleA', C: 'autoScheduleC', D: 'autoScheduleD' };

  for (var i = 0; i < types.length; i++) {
    var inp = document.getElementById('calGlobal_' + types[i]);
    if (!inp) continue;
    // Count how many currently have this enabled
    var currentCount = ac.filter(function(a) { return a[fieldMap[types[i]]]; }).length;
    // If turning off and some aircraft currently have it on
    if (!inp.checked && currentCount > 0) { anyDisabling = true; break; }
  }
  warning.style.display = anyDisabling ? '' : 'none';
}

function _calCloseMaintenanceModal() {
  var modal = document.getElementById('calMaintenanceModal');
  if (modal) modal.remove();
}

async function _calApplyMaintenanceSettings() {
  var settings = {
    autoScheduleDaily: !!(document.getElementById('calGlobal_daily') || {}).checked,
    autoScheduleWeekly: !!(document.getElementById('calGlobal_weekly') || {}).checked,
    autoScheduleA: !!(document.getElementById('calGlobal_A') || {}).checked,
    autoScheduleC: !!(document.getElementById('calGlobal_C') || {}).checked,
    autoScheduleD: !!(document.getElementById('calGlobal_D') || {}).checked
  };

  _calCloseMaintenanceModal();

  try {
    var res = await fetch('/api/fleet/global-maintenance-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to apply settings');

    // Update local data
    if (_calData && _calData.aircraft) {
      for (var i = 0; i < _calData.aircraft.length; i++) {
        _calData.aircraft[i].autoScheduleDaily = settings.autoScheduleDaily;
        _calData.aircraft[i].autoScheduleWeekly = settings.autoScheduleWeekly;
        _calData.aircraft[i].autoScheduleA = settings.autoScheduleA;
        _calData.aircraft[i].autoScheduleC = settings.autoScheduleC;
        _calData.aircraft[i].autoScheduleD = settings.autoScheduleD;
      }
    }

    _calShowNotice('Settings applied to ' + data.updatedCount + ' aircraft. ' + data.maintenanceScheduled + ' checks scheduled.');

    // Reload calendar to reflect changes
    loadCalendarData();
  } catch (err) {
    console.error('Error applying maintenance settings:', err);
    alert('Failed to apply settings: ' + err.message);
  }
}

// ── Data loading ────────────────────────────────────────────────────────────

async function loadCalendarData() {
  var overlay = document.getElementById('calLoadingOverlay');
  if (overlay) overlay.style.display = '';
  try {
    var weekStartStr = _calDateStr(_calWeekStart);
    var res = await fetch('/api/fleet/maintenance/calendar?weekStart=' + weekStartStr);
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    _calData = data;
    _calRender();
  } catch (err) {
    console.error('Error loading calendar data:', err);
    var body = document.getElementById('calBody');
    if (body) body.innerHTML = '<tr><td colspan="8" style="padding:1.5rem;text-align:center;color:var(--warning-color);">Error loading calendar data</td></tr>';
  } finally {
    if (overlay) overlay.style.display = 'none';
  }
}

// ── Rendering ───────────────────────────────────────────────────────────────

function _calRender() {
  if (!_calData) return;

  // Update week label
  var weekEnd = new Date(_calWeekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  var label = document.getElementById('calWeekLabel');
  if (label) label.textContent = _calFmtDateFull(_calWeekStart) + ' \u2013 ' + _calFmtDateFull(weekEnd);

  var todayStr = _calDateStr(_calGetGameTime());

  // Build day dates array (Mon-Sun)
  var dayDates = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date(_calWeekStart);
    d.setUTCDate(d.getUTCDate() + i);
    dayDates.push(_calDateStr(d));
  }

  // Header row
  var head = document.getElementById('calHead');
  var hRow = '<tr><th class="cal-reg-col">REG</th>';
  for (var di = 0; di < 7; di++) {
    var dd = new Date(_calWeekStart);
    dd.setUTCDate(dd.getUTCDate() + di);
    var isToday = dayDates[di] === todayStr;
    hRow += '<th' + (isToday ? ' class="cal-today-col"' : '') + '>' + CAL_DAYS[di] + '<br><span style="font-weight:400;font-size:0.6rem;">' + _calFmtDate(dd) + '</span></th>';
  }
  hRow += '</tr>';
  head.innerHTML = hRow;

  // Group aircraft by type
  var groups = {};
  var groupOrder = [];
  for (var ai = 0; ai < _calData.aircraft.length; ai++) {
    var ac = _calData.aircraft[ai];
    var typeName = ac.type || 'Other';
    if (!groups[typeName]) { groups[typeName] = []; groupOrder.push(typeName); }
    groups[typeName].push(ac);
  }

  // Index maintenance blocks by aircraftId + displayDate
  var blockIndex = {}; // key: aircraftId:date -> array of blocks
  for (var bi = 0; bi < _calData.maintenanceBlocks.length; bi++) {
    var blk = _calData.maintenanceBlocks[bi];
    var displayDate = blk.displayDate || blk.scheduledDate;
    var key = blk.aircraftId + ':' + displayDate;
    if (!blockIndex[key]) blockIndex[key] = [];
    blockIndex[key].push(blk);
  }

  // Index flight blocks by aircraftId + date
  _calFlightIndex = {};
  if (_calData.flightBlocks) {
    for (var fi = 0; fi < _calData.flightBlocks.length; fi++) {
      var fb = _calData.flightBlocks[fi];
      var fKey = fb.aircraftId + ':' + fb.date;
      if (!_calFlightIndex[fKey]) _calFlightIndex[fKey] = [];
      _calFlightIndex[fKey].push(fb);
    }
  }

  // Identify multi-day checks that should render as spanning bars
  // Group by (id) to find all day-blocks for the same maintenance record
  var spanGroups = {};
  for (var si = 0; si < _calData.maintenanceBlocks.length; si++) {
    var sb = _calData.maintenanceBlocks[si];
    if (sb.spanDays > 1) {
      if (!spanGroups[sb.id]) spanGroups[sb.id] = [];
      spanGroups[sb.id].push(sb);
    }
  }

  // Build body
  var body = document.getElementById('calBody');
  var html = '';

  for (var gi = 0; gi < groupOrder.length; gi++) {
    var gName = groupOrder[gi];
    var gAircraft = groups[gName];

    // Type header row
    html += '<tr class="cal-type-header"><td colspan="8">' + gName + ' <span style="font-weight:400;font-size:0.7rem;color:var(--text-muted);">(' + gAircraft.length + ')</span></td></tr>';

    for (var aci = 0; aci < gAircraft.length; aci++) {
      var aircraft = gAircraft[aci];

      // Registration cell
      html += '<tr><td class="cal-reg-cell"><div class="reg">' + aircraft.registration + '</div>';
      if (aircraft.status === 'maintenance') html += '<div class="ac-status" style="color:#3b82f6;">In hangar</div>';
      else if (aircraft.status !== 'active') html += '<div class="ac-status">' + aircraft.status + '</div>';
      html += '</td>';

      // Day cells
      for (var ddi = 0; ddi < 7; ddi++) {
        var dateStr = dayDates[ddi];
        var cellIsToday = dateStr === todayStr;
        var cellKey = aircraft.id + ':' + dateStr;
        var cellBlocks = blockIndex[cellKey] || [];

        html += '<td class="cal-cell' + (cellIsToday ? ' cal-today-col' : '') + '"';
        html += ' data-date="' + dateStr + '" data-aircraft-id="' + aircraft.id + '"';
        html += ' ondragover="_calDragOver(event)" ondragleave="_calDragLeave(event)" ondrop="_calDrop(event)"';
        html += '>';

        // Render flight blocks as background context
        var cellFlights = _calFlightIndex[cellKey] || [];
        for (var fli = 0; fli < cellFlights.length; fli++) {
          var flight = cellFlights[fli];
          var fDepMins = _calParseTime(flight.departureTime);
          var fDurMins = flight.durationMinutes || 120;
          // For multi-day flights (arrivalDayOffset > 0), clamp to end of day
          var fEffDur = flight.arrivalDayOffset > 0 ? (1440 - fDepMins) : fDurMins;
          var fLeftPct = (fDepMins / 1440) * 100;
          var fWidthPct = Math.max(5, (fEffDur / 1440) * 100);
          // Make droppable when dragging a daily check for this aircraft
          var droppableClass = _calDragCheck && _calDragCheck.checkType === 'daily' ? ' cal-flight-droppable' : '';
          var fLabel = flight.depCode + '\u2013' + flight.arrCode;
          html += '<div class="cal-flight' + droppableClass + '"';
          html += ' style="left:' + fLeftPct.toFixed(1) + '%;width:' + fWidthPct.toFixed(1) + '%;"';
          html += ' title="' + (flight.flightNum || '') + ' ' + flight.depCode + '\u2192' + flight.arrCode + ' dep ' + flight.departureTime + ' arr ' + flight.arrivalTime + '"';
          html += ' data-arrival-time="' + flight.arrivalTime + '"';
          html += ' data-turnaround="' + (flight.turnaround || 45) + '"';
          html += ' data-flight-num="' + (flight.flightNum || '') + '"';
          html += ' data-dep-code="' + flight.depCode + '"';
          html += ' data-arr-code="' + flight.arrCode + '"';
          html += '>' + fLabel + '</div>';
        }

        // Render blocks in this cell
        // Separate single-day blocks from multi-day span members
        var singleBlocks = [];
        var renderedSpanIds = {};

        for (var cb = 0; cb < cellBlocks.length; cb++) {
          var block = cellBlocks[cb];
          if (block.spanDays > 1) {
            // Multi-day: only render the spanning bar once (from the first visible day)
            if (!renderedSpanIds[block.id] && block.dayInSpan <= block.spanDays) {
              var spanGroup = spanGroups[block.id] || [block];
              html += _calRenderSpanBar(block, spanGroup, ddi, dayDates);
              renderedSpanIds[block.id] = true;
            }
          } else {
            singleBlocks.push(block);
          }
        }

        // Render single-day blocks stacked
        for (var sbi = 0; sbi < singleBlocks.length; sbi++) {
          var sb2 = singleBlocks[sbi];
          var startMins = _calParseTime(sb2.startTime);
          var leftPct = (startMins / 1440) * 100;
          var widthPct = Math.max(8, (sb2.duration / 1440) * 100);
          var topOff = sbi * 12;

          html += '<div class="cal-block check-' + sb2.checkType + '"';
          html += ' style="left:' + leftPct.toFixed(1) + '%;width:' + widthPct.toFixed(1) + '%;top:' + (2 + topOff) + 'px;height:' + Math.max(12, 32 - topOff * 2) + 'px;"';
          html += ' title="' + sb2.checkType.toUpperCase() + ' Check — ' + sb2.startTime + ' (' + _calFmtDuration(sb2.duration) + ')"';
          html += ' onclick="_calBlockClick(\'' + sb2.aircraftId + '\',\'' + sb2.checkType + '\')"';
          html += '>' + CAL_LABELS[sb2.checkType] + '</div>';
        }

        html += '</td>';
      }
      html += '</tr>';
    }
  }

  if (_calData.aircraft.length === 0) {
    html = '<tr><td colspan="8" style="padding:1.5rem;text-align:center;color:var(--text-muted);">No aircraft in fleet</td></tr>';
  }

  body.innerHTML = html;

  // Mark multi-day span bars that we already rendered via first-cell
  // (The span bar is rendered inside the first visible cell with overflow:visible so it appears to cross cells)

  _calRenderSidebar();
}

// ── Multi-day span bar ──────────────────────────────────────────────────────

function _calRenderSpanBar(firstBlock, spanGroup, startDayIdx, dayDates) {
  // How many days of this check fall within the visible week?
  var visibleDays = 0;
  for (var sg = 0; sg < spanGroup.length; sg++) {
    var dd = spanGroup[sg].displayDate || spanGroup[sg].scheduledDate;
    if (dayDates.indexOf(dd) >= 0) visibleDays++;
  }
  if (visibleDays === 0) visibleDays = 1;

  // Find first visible day index for this span
  var firstVisIdx = -1;
  for (var fv = 0; fv < spanGroup.length; fv++) {
    var fdd = spanGroup[fv].displayDate || spanGroup[fv].scheduledDate;
    var idx = dayDates.indexOf(fdd);
    if (idx >= 0 && (firstVisIdx < 0 || idx < firstVisIdx)) firstVisIdx = idx;
  }
  if (firstVisIdx < 0) firstVisIdx = startDayIdx;

  // Only render from the first visible day's cell (this function is called from that cell)
  if (startDayIdx !== firstVisIdx) return '';

  // Width = number of visible days * 100% of one cell
  // We use calc() relative to the cell — each cell is (100/7)% of the table
  // Since we're inside a cell, 100% = one cell width. So span = visibleDays * 100%
  var widthPct = visibleDays * 100;

  var exBefore = firstBlock.extendsBeforeWeek;
  var exAfter = false;
  // Check if last block extends after week
  for (var ea = 0; ea < spanGroup.length; ea++) {
    if (spanGroup[ea].extendsAfterWeek) exAfter = true;
  }

  var label = '';
  if (exBefore) label += '<span class="cal-span-arrow">\u25C0 </span>';
  label += CAL_LABELS[firstBlock.checkType] + ' <span style="font-weight:400;font-size:0.55rem;">(' + firstBlock.spanDays + 'd)</span>';
  if (exAfter) label += '<span class="cal-span-arrow"> \u25B6</span>';

  var tooltip = firstBlock.checkType.toUpperCase() + ' Check — ' + _calFmtDuration(firstBlock.duration) + ' total, day ' + firstBlock.dayInSpan + ' of ' + firstBlock.spanDays;

  var s = '<div class="cal-block cal-span-bar check-' + firstBlock.checkType + '"';
  s += ' style="left:0;width:' + widthPct + '%;top:2px;height:calc(100% - 4px);"';
  s += ' title="' + tooltip + '"';
  s += ' onclick="_calBlockClick(\'' + firstBlock.aircraftId + '\',\'' + firstBlock.checkType + '\')"';
  s += '>' + label + '</div>';
  return s;
}

// ── Sidebar rendering ───────────────────────────────────────────────────────

function _calRenderSidebar() {
  var sidebar = document.getElementById('calSidebar');
  var list = document.getElementById('calSidebarList');
  if (!sidebar || !list || !_calData) return;

  // Show sidebar when there are pending checks (always useful for manual scheduling)
  if (!_calData.pendingChecks || _calData.pendingChecks.length === 0) {
    sidebar.style.display = 'none';
    return;
  }

  sidebar.style.display = '';

  var html = '';
  // Sort: expired first, then by check type severity
  var sorted = _calData.pendingChecks.slice().sort(function(a, b) {
    var sevOrder = { expired: 0, warning: 1 };
    var typeOrder = { D: 0, C: 1, A: 2, weekly: 3, daily: 4 };
    var sd = (sevOrder[a.severity] || 9) - (sevOrder[b.severity] || 9);
    if (sd !== 0) return sd;
    return (typeOrder[a.checkType] || 9) - (typeOrder[b.checkType] || 9);
  });

  for (var i = 0; i < sorted.length; i++) {
    var pc = sorted[i];
    var color = CAL_COLORS[pc.checkType] || '#666';
    var sevClass = pc.severity === 'expired' ? 'severity-expired' : 'severity-warning';
    var sevLabel = pc.severity === 'expired' ? 'EXP' : 'DUE';

    html += '<div class="cal-sidebar-item" draggable="true"';
    html += ' data-aircraft-id="' + pc.aircraftId + '"';
    html += ' data-check-type="' + pc.checkType + '"';
    html += ' data-registration="' + pc.registration + '"';
    html += ' ondragstart="_calSidebarDragStart(event)"';
    html += ' ondragend="_calSidebarDragEnd(event)"';
    html += '>';
    html += '<span class="check-badge" style="background:' + color + ';">' + CAL_LABELS[pc.checkType] + '</span>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="font-size:0.75rem;font-weight:600;color:var(--accent-color);font-family:monospace;">' + pc.registration + '</div>';
    html += '<div style="font-size:0.6rem;color:var(--text-muted);">' + pc.aircraftType + ' \u00b7 ' + (pc.durationDisplay || '') + '</div>';
    html += '</div>';
    html += '<span class="severity-badge ' + sevClass + '">' + sevLabel + '</span>';
    html += '<div style="font-size:0.55rem;color:var(--text-muted);max-width:60px;text-align:right;">' + pc.expiryText + '</div>';
    html += '</div>';
  }

  list.innerHTML = html;
}

// ── Drag and drop ───────────────────────────────────────────────────────────

function _calSidebarDragStart(event) {
  var item = event.target.closest('.cal-sidebar-item');
  if (!item) return;
  _calDragCheck = {
    aircraftId: item.getAttribute('data-aircraft-id'),
    checkType: item.getAttribute('data-check-type'),
    registration: item.getAttribute('data-registration')
  };
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', _calDragCheck.aircraftId + ':' + _calDragCheck.checkType);
  item.style.opacity = '0.5';

  // If dragging a daily check, enable flight blocks as drop targets
  if (_calDragCheck.checkType === 'daily') {
    var flightEls = document.querySelectorAll('.cal-flight');
    for (var i = 0; i < flightEls.length; i++) {
      flightEls[i].classList.add('cal-flight-droppable');
      flightEls[i].setAttribute('ondragover', '_calFlightDragOver(event)');
      flightEls[i].setAttribute('ondragleave', '_calFlightDragLeave(event)');
      flightEls[i].setAttribute('ondrop', '_calFlightDrop(event)');
    }
  }
}

function _calSidebarDragEnd(event) {
  _calDragCheck = null;
  // Restore opacity on all items
  var items = document.querySelectorAll('.cal-sidebar-item');
  for (var i = 0; i < items.length; i++) items[i].style.opacity = '';
  // Remove all drag-over highlights
  var cells = document.querySelectorAll('.cal-cell.drag-over');
  for (var j = 0; j < cells.length; j++) cells[j].classList.remove('drag-over');
  // Clean up flight droppable state
  var flightEls = document.querySelectorAll('.cal-flight');
  for (var k = 0; k < flightEls.length; k++) {
    flightEls[k].classList.remove('cal-flight-droppable', 'drag-over-flight');
    flightEls[k].removeAttribute('ondragover');
    flightEls[k].removeAttribute('ondragleave');
    flightEls[k].removeAttribute('ondrop');
  }
}

function _calDragOver(event) {
  if (!_calDragCheck) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';

  var cell = event.target.closest('.cal-cell');
  if (!cell) return;

  // Only highlight if this cell's aircraft matches the dragged check
  var cellAcId = cell.getAttribute('data-aircraft-id');
  if (cellAcId === _calDragCheck.aircraftId) {
    cell.classList.add('drag-over');
  }
}

function _calDragLeave(event) {
  var cell = event.target.closest('.cal-cell');
  if (cell) cell.classList.remove('drag-over');
}

async function _calDrop(event) {
  event.preventDefault();
  var cell = event.target.closest('.cal-cell');
  if (!cell || !_calDragCheck) return;
  cell.classList.remove('drag-over');

  var cellAcId = cell.getAttribute('data-aircraft-id');
  var cellDate = cell.getAttribute('data-date');
  if (cellAcId !== _calDragCheck.aircraftId) return;

  // Schedule the check via API
  try {
    var res = await fetch('/api/fleet/maintenance/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aircraftId: _calDragCheck.aircraftId,
        checkType: _calDragCheck.checkType,
        scheduledDate: cellDate
      })
    });
    var data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to schedule');
      return;
    }
    // Reload calendar to show the new check
    _calDragCheck = null;
    loadCalendarData();
  } catch (err) {
    console.error('Error scheduling maintenance:', err);
    alert('Failed to schedule maintenance');
  }
}

// ── Flight block drag handlers (daily check → turnaround) ──────────────────

function _calFlightDragOver(event) {
  if (!_calDragCheck || _calDragCheck.checkType !== 'daily') return;
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = 'move';
  var flightEl = event.target.closest('.cal-flight');
  if (flightEl) flightEl.classList.add('drag-over-flight');
}

function _calFlightDragLeave(event) {
  var flightEl = event.target.closest('.cal-flight');
  if (flightEl) flightEl.classList.remove('drag-over-flight');
}

async function _calFlightDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  var flightEl = event.target.closest('.cal-flight');
  if (!flightEl || !_calDragCheck || _calDragCheck.checkType !== 'daily') return;
  flightEl.classList.remove('drag-over-flight');

  // Get the parent cell for date + aircraft ID
  var cell = flightEl.closest('.cal-cell');
  if (!cell) return;
  var cellAcId = cell.getAttribute('data-aircraft-id');
  var cellDate = cell.getAttribute('data-date');
  if (cellAcId !== _calDragCheck.aircraftId) return;

  // Get turnaround time from the flight block
  var arrivalTime = flightEl.getAttribute('data-arrival-time') || '12:00';
  var flightNum = flightEl.getAttribute('data-flight-num') || '';
  var depCode = flightEl.getAttribute('data-dep-code') || '';
  var arrCode = flightEl.getAttribute('data-arr-code') || '';

  // Schedule the daily check at the turnaround (arrival time)
  try {
    var res = await fetch('/api/fleet/maintenance/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aircraftId: _calDragCheck.aircraftId,
        checkType: 'daily',
        scheduledDate: cellDate,
        startTime: arrivalTime
      })
    });
    var data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to schedule');
      return;
    }
    // Notify user this was scheduled on the turnaround
    var msg = 'Daily check scheduled during turnaround';
    if (flightNum) msg += ' after ' + flightNum;
    msg += ' (' + depCode + '\u2192' + arrCode + ')';
    msg += ' arriving at ' + arrivalTime;
    _calShowNotice(msg);

    _calDragCheck = null;
    loadCalendarData();
  } catch (err) {
    console.error('Error scheduling on turnaround:', err);
    alert('Failed to schedule maintenance');
  }
}

function _calShowNotice(message) {
  // Remove any existing notice
  var existing = document.getElementById('calNotice');
  if (existing) existing.remove();

  var notice = document.createElement('div');
  notice.id = 'calNotice';
  notice.style.cssText = 'position:fixed;top:1rem;left:50%;transform:translateX(-50%);z-index:9999;background:#1e40af;color:#fff;padding:0.6rem 1.2rem;border-radius:6px;font-size:0.8rem;box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:opacity 0.3s;';
  notice.textContent = message;
  document.body.appendChild(notice);

  setTimeout(function() {
    notice.style.opacity = '0';
    setTimeout(function() { notice.remove(); }, 300);
  }, 4000);
}

// ── Sidebar draggable header (move the panel) ───────────────────────────────

function _calInitSidebarDrag() {
  var header = document.getElementById('calSidebarHeader');
  var sidebar = document.getElementById('calSidebar');
  if (!header || !sidebar) return;

  var isDragging = false, offsetX = 0, offsetY = 0;

  header.addEventListener('mousedown', function(e) {
    if (e.target.closest('.cal-sidebar-close')) return;
    isDragging = true;
    var rect = sidebar.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    // Switch from bottom/right to top/left positioning
    sidebar.style.top = rect.top + 'px';
    sidebar.style.left = rect.left + 'px';
    sidebar.style.bottom = 'auto';
    sidebar.style.right = 'auto';
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    var x = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - offsetX));
    var y = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - offsetY));
    sidebar.style.left = x + 'px';
    sidebar.style.top = y + 'px';
  });

  document.addEventListener('mouseup', function() {
    isDragging = false;
  });
}

// ── Touch support (tap-to-place) ────────────────────────────────────────────

var _calArmedPlacement = null;

function _calTapSidebarItem(item) {
  _calArmedPlacement = {
    aircraftId: item.getAttribute('data-aircraft-id'),
    checkType: item.getAttribute('data-check-type'),
    registration: item.getAttribute('data-registration')
  };
  // Highlight the item
  var items = document.querySelectorAll('.cal-sidebar-item');
  for (var i = 0; i < items.length; i++) items[i].style.outline = '';
  item.style.outline = '2px solid var(--accent-color)';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _calParseTime(timeStr) {
  if (!timeStr) return 0;
  var parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
}

function _calFmtDuration(mins) {
  if (mins >= 1440) return Math.ceil(mins / 1440) + 'd';
  if (mins >= 60) {
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return h + 'h' + (m > 0 ? ' ' + m + 'm' : '');
  }
  return mins + 'm';
}

function _calBlockClick(aircraftId, checkType) {
  // Delegate to the existing maintenance modal if available
  if (typeof showCheckDetails === 'function') {
    // Find the aircraft in _calData
    var ac = null;
    if (_calData && _calData.aircraft) {
      for (var i = 0; i < _calData.aircraft.length; i++) {
        if (_calData.aircraft[i].id === aircraftId) { ac = _calData.aircraft[i]; break; }
      }
    }
    if (ac) {
      // Build a minimal checkStatuses-like object for the modal
      showCheckDetails(ac.registration, checkType, 'check-valid', {
        status: 'valid', text: 'Scheduled', expiryText: 'Scheduled on calendar'
      }, ac);
    }
  }
}
