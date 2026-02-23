// Marketing Campaigns — frontend JS

let marketingData = null;
let selectedChannels = new Set();
let selectedAudienceLevels = {};

async function loadMarketingData() {
  try {
    const res = await fetch('/api/marketing');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');

    marketingData = data;
    document.getElementById('marketingBalance').textContent = '$' + fmtMoney(data.balance);
    document.getElementById('marketingGameYear').textContent = data.gameYear;

    checkEraChange(data.eraMultiplier, data.eraName, data.gameYear);
    renderActiveCampaigns(data.campaigns.filter(c => c.isActive));
  } catch (err) {
    console.error('Marketing load error:', err);
    document.getElementById('activeCampaigns').innerHTML =
      '<div class="empty-message">Failed to load marketing data.</div>';
  }
}

// ── Era Toast ─────────────────────────────────────────────────────────────────

function checkEraChange(eraMultiplier, eraName, gameYear) {
  const storageKey = 'mktg_era_notified';
  const stored = parseFloat(localStorage.getItem(storageKey) || '0');

  // Show toast if multiplier has increased since last visit
  if (eraMultiplier > stored) {
    localStorage.setItem(storageKey, String(eraMultiplier));
    // Don't show on very first visit (no stored value yet) to avoid noise on initial load
    if (stored > 0) {
      showEraToast(eraName, gameYear);
    } else {
      // First ever visit — just silently record, no toast
    }
  }
}

let eraToastTimer = null;

function showEraToast(eraName, gameYear) {
  const toast = document.getElementById('eraToast');
  document.getElementById('eraToastMsg').textContent =
    `Marketing costs have increased. Campaigns now priced for ${gameYear}.`;
  document.getElementById('eraToastEra').textContent = eraName.toUpperCase();

  toast.classList.add('toast-visible');

  if (eraToastTimer) clearTimeout(eraToastTimer);
  eraToastTimer = setTimeout(dismissEraToast, 9000);
}

function dismissEraToast() {
  document.getElementById('eraToast').classList.remove('toast-visible');
  if (eraToastTimer) { clearTimeout(eraToastTimer); eraToastTimer = null; }
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
  const levelsMeta = marketingData?.audienceLevelsMeta || {};

  let html = '';
  for (const c of campaigns) {
    const audienceLevels = c.audienceLevels || {};
    const channelNames = (c.channels || []).map(k => {
      const name = channelMap[k]?.name || k;
      const lvl = audienceLevels[k];
      const lvlLabel = lvl ? (levelsMeta[lvl]?.label || lvl) : '';
      return lvlLabel ? `${name} (${lvlLabel})` : name;
    }).join(', ');
    const channelIcons = (c.channels || []).map(k => channelMap[k]?.icon || '').join(' ');

    let durationMain = 'Indefinite';
    if (c.durationWeeks && c.gameEndDate) {
      const endMs = new Date(c.gameEndDate).getTime();
      const nowMs = marketingData.currentGameDate ? new Date(marketingData.currentGameDate).getTime() : Date.now();
      const remainingWeeks = Math.ceil(Math.max(0, endMs - nowMs) / (7 * 24 * 60 * 60 * 1000));
      durationMain = remainingWeeks > 0
        ? `${remainingWeeks} wk${remainingWeeks !== 1 ? 's' : ''} remaining`
        : 'Ending soon';
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
        </div>
      </div>
      <div class="campaign-duration-badge">
        <div class="campaign-duration-main">${durationMain}</div>
      </div>
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
        <span class="channel-cost">from $${fmtMoney(ch.baseWeeklyCost)}/wk</span>
        <span class="channel-boost">+${ch.demandBoost}%+</span>
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
  selectedAudienceLevels = {};
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
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`modalStep${i}`);
    if (el) el.style.display = i === step ? '' : 'none';
  }

  // Update step indicator dots and lines
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`stepDot${i}`);
    if (dot) {
      dot.classList.toggle('step-dot-active', i === step);
      dot.classList.toggle('step-dot-done', i < step);
    }
  }
  for (let i = 1; i <= 3; i++) {
    const line = document.getElementById(`stepLine${i}`);
    if (line) line.classList.toggle('step-line-done', i < step);
  }

  // Back button
  document.getElementById('modalBackBtn').style.display = step > 1 ? '' : 'none';

  // Next/Launch button
  const nextBtn = document.getElementById('modalNextBtn');
  nextBtn.disabled = false;
  nextBtn.textContent = step === 4 ? '🚀 Launch' : 'Next →';

  // No-selection hint
  document.getElementById('noSelectionHint').style.display = 'none';

  // Step-specific setup
  if (step === 2) renderAudienceStep();
  if (step === 3) renderStep3Preview();
  if (step === 4) renderModalReview();
}

function renderAudienceStep() {
  if (!marketingData) return;
  const chMap = {};
  for (const ch of marketingData.availableChannels) chMap[ch.key] = ch;
  const levels = marketingData.audienceLevelsMeta || {};

  let html = '';
  for (const key of selectedChannels) {
    const ch = chMap[key];
    if (!ch) continue;
    // Default to first available audience level for this channel
    if (!selectedAudienceLevels[key]) selectedAudienceLevels[key] = ch.audiences[0];
    const currentLevel = selectedAudienceLevels[key];

    const levelBtns = ch.audiences.map(lvl => {
      const meta = levels[lvl] || {};
      const cost = Math.round(ch.baseWeeklyCost * (meta.costMultiplier || 1));
      const boost = (ch.demandBoost * (meta.boostMultiplier || 1)).toFixed(1);
      const isActive = lvl === currentLevel;
      return `<button class="audience-level-btn${isActive ? ' audience-level-active' : ''}"
        onclick="selectAudience('${key}', '${lvl}')">
        ${meta.icon || ''} ${meta.label || lvl}
        <span class="audience-level-cost">$${fmtMoney(cost)}/wk · +${boost}%</span>
      </button>`;
    }).join('');

    html += `
    <div class="audience-ch-row">
      <div class="audience-ch-name">${ch.icon || ''} ${ch.name}</div>
      <div class="audience-level-btns" id="audienceBtns-${key}">${levelBtns}</div>
    </div>`;
  }

  document.getElementById('audienceStep').innerHTML = html;
}

function selectAudience(channelKey, level) {
  selectedAudienceLevels[channelKey] = level;

  const chMap = {};
  if (marketingData) for (const ch of marketingData.availableChannels) chMap[ch.key] = ch;
  const ch = chMap[channelKey];
  if (!ch) return;

  const container = document.getElementById(`audienceBtns-${channelKey}`);
  if (!container) return;
  const btns = container.querySelectorAll('.audience-level-btn');
  btns.forEach((btn, i) => {
    btn.classList.toggle('audience-level-active', ch.audiences[i] === level);
  });
}

function renderStep3Preview() {
  const chMap = {};
  if (marketingData) for (const ch of marketingData.availableChannels) chMap[ch.key] = ch;
  const levels = marketingData?.audienceLevelsMeta || {};
  const pills = [...selectedChannels]
    .map(k => {
      const lvl = selectedAudienceLevels[k] || chMap[k]?.audiences?.[0] || '';
      const lvlLabel = levels[lvl]?.label || lvl;
      return `<span class="camp-preview-pill">${chMap[k]?.icon || ''} ${chMap[k]?.name || k} · ${lvlLabel}</span>`;
    })
    .join('');
  document.getElementById('step3ChannelPreview').innerHTML = pills ||
    '<span style="color:var(--text-muted);font-size:0.75rem;">No channels selected</span>';
}

function renderModalReview() {
  if (!marketingData) return;
  const chMap = {};
  for (const ch of marketingData.availableChannels) chMap[ch.key] = ch;
  const levels = marketingData.audienceLevelsMeta || {};

  let totalCost = 0, rawBoost = 0;
  const channelPills = [];
  for (const key of selectedChannels) {
    const ch = chMap[key];
    if (ch) {
      const lvl = selectedAudienceLevels[key] || ch.audiences[0];
      const multiplier = levels[lvl]?.costMultiplier || 1.0;
      const boostMult = levels[lvl]?.boostMultiplier || 1.0;
      const chCost = Math.round(ch.baseWeeklyCost * multiplier);
      totalCost += chCost;
      rawBoost += ch.demandBoost * boostMult;
      const lvlLabel = levels[lvl]?.label || lvl;
      channelPills.push(`<span class="review-ch-pill">${ch.icon || ''} ${ch.name} <span style="color:var(--text-muted);font-size:0.68rem;font-weight:400;">${lvlLabel}</span></span>`);
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
  if (modalCurrentStep === 4) {
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
      body: JSON.stringify({ channels: [...selectedChannels], audienceLevels: selectedAudienceLevels, durationWeeks })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to launch');

    const chMap = {};
    if (marketingData) for (const ch of marketingData.availableChannels) chMap[ch.key] = ch;
    const channelLabels = [...selectedChannels].map(k => chMap[k]?.name || k).join('  ·  ');

    selectedChannels.clear();
    selectedAudienceLevels = {};
    closeCampaignModal();
    await showLaunchAnimation(channelLabels);
    await loadMarketingData();
  } catch (err) {
    alert('Failed to launch campaign: ' + err.message);
    btn.disabled = false;
    btn.textContent = '🚀 Launch';
  }
}

let cancelTargetId = null;

function cancelCampaign(id) {
  const chMap = {};
  if (marketingData) for (const ch of marketingData.availableChannels) chMap[ch.key] = ch;

  // Find the campaign to get its channel names
  const campaign = marketingData?.campaigns?.find(c => c.id === id);
  const channelNames = campaign
    ? (campaign.channels || []).map(k => chMap[k]?.name || k).join(', ')
    : 'Campaign';

  cancelTargetId = id;
  document.getElementById('cancelModalCampaignName').textContent = channelNames;
  document.getElementById('cancelModal').classList.add('modal-open');
}

function closeCancelModal() {
  document.getElementById('cancelModal').classList.remove('modal-open');
  cancelTargetId = null;
}

async function confirmCancelCampaign() {
  if (!cancelTargetId) return;
  const btn = document.getElementById('cancelModalConfirmBtn');
  btn.disabled = true;
  btn.textContent = 'Cancelling...';
  try {
    const res = await fetch(`/api/marketing/${cancelTargetId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to cancel');
    closeCancelModal();
    await loadMarketingData();
  } catch (err) {
    alert('Failed to cancel campaign: ' + err.message);
    btn.disabled = false;
    btn.textContent = 'Cancel Campaign';
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
loadMarketingData();
