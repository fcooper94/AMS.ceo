// Marketing Campaigns — frontend JS

let marketingData = null;
let selectedChannels = new Set();

async function loadMarketingData() {
  try {
    const res = await fetch('/api/marketing');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');

    marketingData = data;
    document.getElementById('marketingBalance').textContent = '$' + fmtMoney(data.balance);
    document.getElementById('marketingGameYear').textContent = data.gameYear;

    renderActiveCampaigns(data.campaigns.filter(c => c.isActive));
  } catch (err) {
    console.error('Marketing load error:', err);
    document.getElementById('activeCampaigns').innerHTML =
      '<div class="empty-message">Failed to load marketing data.</div>';
  }
}

function fmtMoney(n) {
  if (n === undefined || n === null) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return Math.round(n).toLocaleString();
  return Math.round(n).toString();
}

// ── Active Campaigns ─────────────────────────────────────────────────────────

function renderActiveCampaigns(campaigns) {
  const container = document.getElementById('activeCampaigns');
  if (!campaigns || campaigns.length === 0) {
    container.innerHTML = '<div class="empty-message" style="margin-bottom:0;">No active campaigns. Click Launch New Campaign to get started.</div>';
    return;
  }

  const channelMap = {};
  if (marketingData) {
    for (const ch of marketingData.availableChannels) channelMap[ch.key] = ch;
  }

  let html = '';
  for (const c of campaigns) {
    const channelNames = (c.channels || []).map(k => channelMap[k]?.name || k).join(', ');
    const channelIcons = (c.channels || []).map(k => channelMap[k]?.icon || '').join(' ');

    let progressHtml = '';
    let durationLabel = 'Indefinite';
    if (c.durationWeeks) {
      const startMs = new Date(c.gameStartDate).getTime();
      const endMs = new Date(c.gameEndDate).getTime();
      const nowMs = marketingData.currentGameDate ? new Date(marketingData.currentGameDate).getTime() : startMs;
      const totalMs = endMs - startMs;
      const elapsedMs = Math.max(0, nowMs - startMs);
      const pct = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
      durationLabel = `${c.durationWeeks} weeks`;
      progressHtml = `
        <div class="campaign-progress-bar" title="${pct}% complete">
          <div class="campaign-progress-fill" style="width:${pct}%"></div>
        </div>`;
    }

    const boostColor = c.demandBoost > 0 ? 'var(--success-color)' : 'var(--text-muted)';

    html += `
    <div class="active-campaign-card">
      <div style="font-size:1.5rem; flex-shrink:0;">${channelIcons || '📣'}</div>
      <div class="active-campaign-info">
        <div class="active-campaign-channels">${channelNames}</div>
        <div class="active-campaign-meta">
          <span>$${fmtMoney(c.weeklyBudget)}/wk</span>
          <span style="color:${boostColor};">+${Number(c.demandBoost).toFixed(1)}% demand</span>
          <span>${durationLabel}</span>
          ${c.gameEndDate ? `<span>Ends: ${c.gameEndDate}</span>` : ''}
        </div>
      </div>
      ${progressHtml}
      <button class="btn btn-secondary" onclick="cancelCampaign('${c.id}')" style="flex-shrink:0; font-size:0.75rem; padding:0.3rem 0.75rem;">Cancel</button>
    </div>`;
  }

  container.innerHTML = html;
}

// ── Channel Grid ─────────────────────────────────────────────────────────────

function renderChannelGrid(channels, gameYear) {
  const grid = document.getElementById('modalChannelGrid');
  if (!channels || channels.length === 0) {
    grid.innerHTML = '<div class="empty-message">No channels available.</div>';
    return;
  }

  let html = '';
  for (const ch of channels) {
    const locked = !ch.available;
    const selected = selectedChannels.has(ch.key);
    const classes = ['channel-card', locked ? 'channel-locked' : '', selected ? 'channel-selected' : ''].filter(Boolean).join(' ');
    const onclick = locked ? '' : `onclick="toggleChannel('${ch.key}')"`;
    const eraLabel = locked ? `<span class="channel-era-badge">Available ${ch.availableFrom}</span>` : '';

    html += `
    <div class="${classes}" ${onclick} id="channel-${ch.key}" title="${locked ? `Available from ${ch.availableFrom}` : ch.description}">
      <div class="channel-tick">✓</div>
      <div class="channel-icon">${ch.icon || '📢'}</div>
      ${eraLabel}
      <div class="channel-name">${ch.name}</div>
      <div class="channel-desc">${ch.description}</div>
      <div class="channel-meta">
        <span class="channel-cost">$${fmtMoney(ch.weeklyBudget)}/wk</span>
        <span class="channel-boost">+${ch.demandBoost}%</span>
      </div>
    </div>`;
  }

  grid.innerHTML = html;
}

function toggleChannel(key) {
  if (selectedChannels.has(key)) {
    selectedChannels.delete(key);
  } else {
    selectedChannels.add(key);
  }
  // Update card visual
  const card = document.getElementById(`channel-${key}`);
  if (card) {
    card.classList.toggle('channel-selected', selectedChannels.has(key));
  }
}

// ── Duration Pills ────────────────────────────────────────────────────────────

function selectDuration(btn) {
  document.querySelectorAll('#durationPills .duration-pill').forEach(p => p.classList.remove('duration-pill-active'));
  btn.classList.add('duration-pill-active');
}

function getSelectedDuration() {
  const active = document.querySelector('#durationPills .duration-pill-active');
  return active ? parseInt(active.dataset.weeks, 10) : 4;
}

// ── Campaign Modal ────────────────────────────────────────────────────────────

let modalCurrentStep = 1;

function openCampaignModal() {
  if (!marketingData) return;

  // Reset state
  selectedChannels.clear();
  modalCurrentStep = 1;

  // Populate channel grid
  renderChannelGrid(marketingData.availableChannels, marketingData.gameYear);

  // Reset duration pills to default (4 weeks)
  document.querySelectorAll('#durationPills .duration-pill').forEach(p => {
    p.classList.toggle('duration-pill-active', p.dataset.weeks === '4');
  });

  goToModalStep(1);
  document.getElementById('campaignModal').classList.add('modal-open');
}

function closeCampaignModal() {
  document.getElementById('campaignModal').classList.remove('modal-open');
}

function goToModalStep(step) {
  modalCurrentStep = step;

  // Show/hide step content
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`modalStep${i}`);
    if (el) el.style.display = i === step ? '' : 'none';
  }

  // Update step indicator dots and lines
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`stepDot${i}`);
    if (dot) {
      dot.classList.toggle('step-dot-active', i === step);
      dot.classList.toggle('step-dot-done', i < step);
    }
  }
  for (let i = 1; i <= 2; i++) {
    const line = document.getElementById(`stepLine${i}`);
    if (line) line.classList.toggle('step-line-done', i < step);
  }

  // Back button
  document.getElementById('modalBackBtn').style.display = step > 1 ? '' : 'none';

  // Next/Launch button
  const nextBtn = document.getElementById('modalNextBtn');
  nextBtn.disabled = false;
  nextBtn.textContent = step === 3 ? '🚀 Launch' : 'Next →';

  // No-selection hint
  document.getElementById('noSelectionHint').style.display = 'none';

  // Step-specific setup
  if (step === 2) renderStep2Preview();
  if (step === 3) renderModalReview();
}

function renderStep2Preview() {
  const chMap = {};
  if (marketingData) for (const ch of marketingData.availableChannels) chMap[ch.key] = ch;
  const pills = [...selectedChannels]
    .map(k => `<span class="camp-preview-pill">${chMap[k]?.icon || ''} ${chMap[k]?.name || k}</span>`)
    .join('');
  document.getElementById('step2ChannelPreview').innerHTML = pills ||
    '<span style="color:var(--text-muted);font-size:0.75rem;">No channels selected</span>';
}

function renderModalReview() {
  if (!marketingData) return;
  const chMap = {};
  for (const ch of marketingData.availableChannels) chMap[ch.key] = ch;

  let totalCost = 0, rawBoost = 0;
  const channelPills = [];
  for (const key of selectedChannels) {
    const ch = chMap[key];
    if (ch) {
      totalCost += ch.weeklyBudget;
      rawBoost += ch.demandBoost;
      channelPills.push(`<span class="review-ch-pill">${ch.icon || ''} ${ch.name}</span>`);
    }
  }

  const cappedBoost = rawBoost <= 20 ? rawBoost : 20 + (rawBoost - 20) * 0.5;
  const durationVal = getSelectedDuration();
  const durationLabel = durationVal > 0 ? `${durationVal} Week${durationVal > 1 ? 's' : ''}` : 'Indefinite';
  const totalCommitment = durationVal > 0 ? '$' + fmtMoney(totalCost * durationVal) : 'Ongoing';

  document.getElementById('reviewChannels').innerHTML = channelPills.join('');
  document.getElementById('reviewWeeklyCost').textContent = '$' + fmtMoney(totalCost) + ' / wk';
  document.getElementById('reviewBoost').textContent = '+' + cappedBoost.toFixed(1) + '%';
  document.getElementById('reviewDuration').textContent = durationLabel;
  document.getElementById('reviewTotal').textContent = totalCommitment;
}

function modalNextStep() {
  if (modalCurrentStep === 1 && selectedChannels.size === 0) {
    const hint = document.getElementById('noSelectionHint');
    hint.style.display = 'inline';
    return;
  }
  if (modalCurrentStep === 3) {
    launchCampaign();
    return;
  }
  goToModalStep(modalCurrentStep + 1);
}

function modalPrevStep() {
  if (modalCurrentStep > 1) goToModalStep(modalCurrentStep - 1);
}

// ── Launch Animation ──────────────────────────────────────────────────────────

function showLaunchAnimation(channelLabels) {
  return new Promise(resolve => {
    document.getElementById('launchChannelNames').textContent = channelLabels;

    const overlay = document.getElementById('launchOverlay');

    // Restart one-shot animations by force-reflow trick
    const animated = overlay.querySelectorAll('.launch-city-dot, .launch-signal-line, .launch-title, .launch-channels-label, .launch-sub');
    animated.forEach(el => { el.style.animationName = 'none'; });
    overlay.offsetHeight; // reflow
    animated.forEach(el => { el.style.animationName = ''; });

    // Reset and drain progress bar
    const fill = document.getElementById('launchProgressFill');
    fill.style.transition = 'none';
    fill.style.width = '100%';

    overlay.classList.add('launch-visible');

    // Start draining after a frame so the reset sticks
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transition = 'width 3s linear';
      fill.style.width = '0%';
    }));

    setTimeout(() => {
      overlay.classList.remove('launch-visible');
      setTimeout(resolve, 420);
    }, 3100);
  });
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function launchCampaign() {
  if (selectedChannels.size === 0) return;

  const durationVal = getSelectedDuration();
  const durationWeeks = durationVal > 0 ? durationVal : null;

  const btn = document.getElementById('modalNextBtn');
  btn.disabled = true;
  btn.textContent = 'Launching...';

  try {
    const res = await fetch('/api/marketing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels: [...selectedChannels], durationWeeks })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to launch');

    const chMap = {};
    if (marketingData) for (const ch of marketingData.availableChannels) chMap[ch.key] = ch;
    const channelLabels = [...selectedChannels].map(k => chMap[k]?.name || k).join('  ·  ');

    selectedChannels.clear();
    closeCampaignModal();
    await showLaunchAnimation(channelLabels);
    await loadMarketingData();
  } catch (err) {
    alert('Failed to launch campaign: ' + err.message);
    btn.disabled = false;
    btn.textContent = '🚀 Launch';
  }
}

async function cancelCampaign(id) {
  if (!confirm('Cancel this campaign?')) return;
  try {
    const res = await fetch(`/api/marketing/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to cancel');
    await loadMarketingData();
  } catch (err) {
    alert('Failed to cancel campaign: ' + err.message);
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
loadMarketingData();
