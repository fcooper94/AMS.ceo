// Bank & Loans — credit score, bank offers, active loan management

let currentOffers = [];
let selectedBank = null;
let selectedLoanType = 'fleet_expansion';
let selectedStrategy = 'fixed';
let currentLoans = [];
let repayLoanId = null;

async function loadLoansPage() {
  try {
    const [loansRes, offersRes] = await Promise.all([
      fetch('/api/loans'),
      fetch('/api/loans/offers')
    ]);
    const loansData = await loansRes.json();
    const offersData = await offersRes.json();

    if (!loansRes.ok) throw new Error(loansData.error || 'Failed to load loans');
    if (!offersRes.ok) throw new Error(offersData.error || 'Failed to load offers');

    renderCreditScore(loansData);
    currentLoans = loansData.loans || [];
    renderActiveLoans(loansData);
    currentOffers = offersData.offers || [];
    renderBankOffers(offersData);
  } catch (err) {
    console.error('Error loading loans page:', err);
  }
}

// ── Credit Score ────────────────────────────────────────────────────────────

function renderCreditScore(data) {
  const scoreEl = document.getElementById('creditScoreNumber');
  const labelEl = document.getElementById('creditScoreLabel');
  const factorsEl = document.getElementById('creditFactors');
  const netWorthEl = document.getElementById('netWorthDisplay');

  scoreEl.textContent = data.creditScore;
  scoreEl.style.color = data.creditRating.color;
  labelEl.textContent = data.creditRating.label;
  labelEl.style.color = data.creditRating.color;

  netWorthEl.textContent = fmtMoney(data.netWorth);

  const factors = data.creditFactors;
  let html = '';
  for (const [key, f] of Object.entries(factors)) {
    const pct = Math.round((f.score / f.max) * 100);
    const color = pct >= 70 ? 'var(--success-color)' : pct >= 40 ? 'var(--warning-color)' : '#f85149';
    html += `<div class="credit-factor">
      <div class="credit-factor-label">${f.label}</div>
      <div class="credit-factor-bar"><div class="credit-factor-fill" style="width:${pct}%;background:${color};"></div></div>
      <div class="credit-factor-val">${f.score}/${f.max}</div>
    </div>`;
  }
  factorsEl.innerHTML = html;
}

// ── Active Loans Table ──────────────────────────────────────────────────────

function renderActiveLoans(data) {
  const tbody = document.getElementById('loansTableBody');
  const loans = (data.loans || []).filter(l => l.status === 'active');

  if (loans.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="padding: 1.5rem; text-align: center; color: var(--text-secondary);">No active loans. Apply for a loan from the banks below.</td></tr>';
    return;
  }

  let rows = '';
  for (const l of loans) {
    const strategyLabel = l.repaymentStrategy === 'fixed' ? 'Fixed' :
      l.repaymentStrategy === 'reducing' ? 'Reducing' : 'Interest Only';

    let holidayBtn = '';
    if (l.paymentHolidaysRemaining > 0 && !l.isOnHoliday) {
      holidayBtn = `<button class="action-btn holiday-btn" onclick="requestHoliday('${l.id}')" title="${l.paymentHolidaysRemaining} holiday(s) left">Holiday</button>`;
    } else if (l.isOnHoliday) {
      holidayBtn = `<span style="font-size:0.65rem;color:var(--warning-color);">On Holiday</span>`;
    }

    rows += `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
      <td style="padding:0.45rem 0.6rem;">${l.bankName}</td>
      <td style="padding:0.45rem 0.6rem;font-size:0.75rem;">${l.loanTypeLabel}</td>
      <td style="padding:0.45rem 0.6rem;text-align:right;" class="mono">$${fmtNum(l.remainingPrincipal)}</td>
      <td style="padding:0.45rem 0.6rem;text-align:right;" class="mono">${l.interestRate}%</td>
      <td style="padding:0.45rem 0.6rem;text-align:right;" class="mono">$${fmtNum(l.monthlyPayment)}</td>
      <td style="padding:0.45rem 0.6rem;text-align:right;" class="mono">${l.monthsRemaining}mo</td>
      <td style="padding:0.45rem 0.6rem;font-size:0.75rem;">${strategyLabel}</td>
      <td style="padding:0.45rem 0.6rem;white-space:nowrap;">
        <button class="action-btn" onclick="openRepayModal('${l.id}')">Repay</button>
        ${holidayBtn}
      </td>
    </tr>`;
  }

  // Also show paid off / defaulted loans if any
  const others = (data.loans || []).filter(l => l.status !== 'active');
  for (const l of others) {
    const statusColor = l.status === 'paid_off' ? 'var(--success-color)' : '#f85149';
    const statusLabel = l.status === 'paid_off' ? 'Paid Off' : 'Defaulted';
    rows += `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);opacity:0.5;">
      <td style="padding:0.45rem 0.6rem;">${l.bankName}</td>
      <td style="padding:0.45rem 0.6rem;font-size:0.75rem;">${l.loanTypeLabel}</td>
      <td style="padding:0.45rem 0.6rem;text-align:right;" class="mono">$0</td>
      <td style="padding:0.45rem 0.6rem;text-align:right;" class="mono">${l.interestRate}%</td>
      <td style="padding:0.45rem 0.6rem;text-align:right;" class="mono">-</td>
      <td style="padding:0.45rem 0.6rem;text-align:right;" class="mono">-</td>
      <td style="padding:0.45rem 0.6rem;"><span style="color:${statusColor};font-size:0.75rem;font-weight:600;">${statusLabel}</span></td>
      <td style="padding:0.45rem 0.6rem;">-</td>
    </tr>`;
  }

  tbody.innerHTML = rows;
}

// ── Bank Offers Grid ────────────────────────────────────────────────────────

function renderBankOffers(data) {
  const grid = document.getElementById('bankGrid');

  if (!data.offers || data.offers.length === 0) {
    grid.innerHTML = '<div style="text-align:center;color:var(--text-secondary);grid-column:1/-1;padding:1.5rem;">No banks available.</div>';
    return;
  }

  let html = '';
  for (const bank of data.offers) {
    const locked = !bank.meetsRequirement;
    const riskClass = bank.riskAppetite === 'conservative' ? 'risk-conservative' :
      bank.riskAppetite === 'aggressive' ? 'risk-aggressive' : '';

    // Show the fleet expansion rate as the headline rate
    const headlineRate = bank.loanTypes.find(t => t.type === 'fleet_expansion')?.rate || bank.loanTypes[0]?.rate;
    const lowestRate = Math.min(...bank.loanTypes.map(t => t.rate));
    const highestRate = Math.max(...bank.loanTypes.map(t => t.rate));

    html += `<div class="bank-card${locked ? ' locked' : ''}">
      <div class="bank-card-header">
        <div>
          <div class="bank-name">${bank.name}</div>
          <div class="bank-hq">${bank.hq}</div>
        </div>
      </div>
      <div class="bank-tagline">${bank.tagline}</div>
      <div class="bank-tags">
        <span class="bank-tag ${riskClass}">${capitalize(bank.riskAppetite)}</span>
        ${bank.features.map(f => `<span class="bank-tag">${f}</span>`).join('')}
      </div>
      <div class="bank-stats">
        <div>
          <div class="bank-stat-label">Rate Range</div>
          <div class="bank-stat-value">${lowestRate}% – ${highestRate}%</div>
        </div>
        <div>
          <div class="bank-stat-label">Max Loan</div>
          <div class="bank-stat-value">${fmtMoney(bank.maxLoanAmount)}</div>
        </div>
        ${bank.earlyRepaymentFee > 0 ? `<div>
          <div class="bank-stat-label">Early Fee</div>
          <div class="bank-stat-value">${bank.earlyRepaymentFee}%</div>
        </div>` : ''}
      </div>
      ${locked
        ? `<div class="bank-locked-msg">Requires credit score ${bank.minCreditScore}+</div>`
        : `<button class="bank-apply-btn" onclick="openApplyModal('${bank.bankId}')">Apply for Loan</button>`
      }
    </div>`;
  }
  grid.innerHTML = html;
}

// ── Apply Modal ─────────────────────────────────────────────────────────────

function openApplyModal(bankId) {
  selectedBank = currentOffers.find(b => b.bankId === bankId);
  if (!selectedBank) return;

  document.getElementById('applyModalTitle').textContent = `Apply — ${selectedBank.name}`;
  selectedLoanType = 'fleet_expansion';
  selectedStrategy = 'fixed';

  // Loan type radio buttons
  const typeContainer = document.getElementById('loanTypeOptions');
  typeContainer.innerHTML = selectedBank.loanTypes.map(lt => {
    const sel = lt.type === selectedLoanType ? ' selected' : '';
    return `<label class="form-radio-option${sel}" onclick="selectLoanType('${lt.type}')">
      <input type="radio" name="loanType" value="${lt.type}" ${lt.type === selectedLoanType ? 'checked' : ''}>
      ${lt.label}
    </label>`;
  }).join('');

  // Strategy selection
  document.querySelectorAll('#strategyOptions .form-radio-option').forEach(el => {
    el.classList.toggle('selected', el.querySelector('input').value === selectedStrategy);
  });

  // Set up amount slider
  const slider = document.getElementById('loanAmount');
  const max = selectedBank.maxLoanAmount;
  const step = max > 1000000 ? 100000 : max > 100000 ? 50000 : 10000;
  slider.min = step;
  slider.max = max;
  slider.step = step;
  slider.value = Math.min(Math.round(max / 2), max);
  document.getElementById('loanAmountMin').textContent = fmtMoney(step);
  document.getElementById('loanAmountMax').textContent = fmtMoney(max);

  // Populate term dropdown
  updateTermDropdown();
  updateLoanPreview();

  document.getElementById('applyModal').style.display = 'flex';
}

function closeApplyModal() {
  document.getElementById('applyModal').style.display = 'none';
  selectedBank = null;
}

function selectLoanType(type) {
  selectedLoanType = type;
  document.querySelectorAll('#loanTypeOptions .form-radio-option').forEach(el => {
    el.classList.toggle('selected', el.querySelector('input').value === type);
  });
  updateTermDropdown();
  updateLoanPreview();
}

function selectStrategy(strategy) {
  selectedStrategy = strategy;
  document.querySelectorAll('#strategyOptions .form-radio-option').forEach(el => {
    el.classList.toggle('selected', el.querySelector('input').value === strategy);
  });
  updateLoanPreview();
}

function updateTermDropdown() {
  const select = document.getElementById('loanTerm');
  const lt = selectedBank?.loanTypes.find(t => t.type === selectedLoanType);
  if (!lt) return;

  const range = lt.termRange;
  let options = '';
  for (let m = range.min; m <= range.max; m += 6) {
    const sel = m === lt.exampleTerm ? ' selected' : '';
    const years = m >= 12 ? ` (${(m / 12).toFixed(1)}yr)` : '';
    options += `<option value="${m}"${sel}>${m} months${years}</option>`;
  }
  // Add max if not a multiple of 6
  if (range.max % 6 !== 0) {
    const years = range.max >= 12 ? ` (${(range.max / 12).toFixed(1)}yr)` : '';
    options += `<option value="${range.max}">${range.max} months${years}</option>`;
  }
  select.innerHTML = options;
}

function updateLoanPreview() {
  if (!selectedBank) return;

  const lt = selectedBank.loanTypes.find(t => t.type === selectedLoanType);
  if (!lt) return;

  const amount = parseInt(document.getElementById('loanAmount').value) || 0;
  const term = parseInt(document.getElementById('loanTerm').value) || lt.exampleTerm;
  const rate = lt.rate;

  document.getElementById('loanAmountDisplay').textContent = fmtMoney(amount);
  document.getElementById('previewRate').textContent = rate + '% APR';

  let monthly = 0;
  let totalInterest = 0;

  if (selectedStrategy === 'fixed') {
    const mr = rate / 100 / 12;
    if (mr === 0) {
      monthly = amount / term;
    } else {
      monthly = amount * (mr * Math.pow(1 + mr, term)) / (Math.pow(1 + mr, term) - 1);
    }
    totalInterest = (monthly * term) - amount;
  } else if (selectedStrategy === 'reducing') {
    const principalPortion = amount / term;
    // First month's payment (highest)
    const firstInterest = amount * (rate / 100 / 12);
    monthly = principalPortion + firstInterest;
    // Average interest over term
    totalInterest = (amount * (rate / 100 / 12) * (term + 1)) / 2;
  } else {
    // Interest only
    monthly = amount * (rate / 100 / 12);
    totalInterest = monthly * term; // Plus balloon principal at end
  }

  document.getElementById('previewMonthly').textContent = '$' + fmtNum(Math.round(monthly));
  document.getElementById('previewTotalInterest').textContent = '$' + fmtNum(Math.round(totalInterest));
  document.getElementById('previewTotalCost').textContent = '$' + fmtNum(Math.round(amount + totalInterest));
}

async function submitLoanApplication() {
  if (!selectedBank) return;

  const btn = document.getElementById('applySubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  const lt = selectedBank.loanTypes.find(t => t.type === selectedLoanType);
  const amount = parseInt(document.getElementById('loanAmount').value) || 0;
  const termMonths = parseInt(document.getElementById('loanTerm').value) || lt.exampleTerm;

  try {
    const res = await fetch('/api/loans/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankId: selectedBank.bankId,
        loanType: selectedLoanType,
        amount,
        termMonths,
        repaymentStrategy: selectedStrategy
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Application failed');

    closeApplyModal();
    loadLoansPage(); // Refresh everything
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Apply for Loan';
  }
}

// ── Repay Modal ─────────────────────────────────────────────────────────────

function openRepayModal(loanId) {
  const loan = currentLoans.find(l => l.id === loanId);
  if (!loan) return;

  repayLoanId = loanId;
  const input = document.getElementById('repayAmount');
  input.max = Math.ceil(loan.remainingPrincipal);
  input.value = '';

  const feeInfo = document.getElementById('repayFeeInfo');
  if (loan.earlyRepaymentFee > 0) {
    feeInfo.textContent = `${loan.bankName} charges a ${loan.earlyRepaymentFee}% early repayment fee.`;
    feeInfo.style.color = 'var(--warning-color)';
  } else {
    feeInfo.textContent = `${loan.bankName} does not charge early repayment fees.`;
    feeInfo.style.color = 'var(--success-color)';
  }

  document.getElementById('repayPrincipal').textContent = '-';
  document.getElementById('repayFee').textContent = '-';
  document.getElementById('repayTotal').textContent = '-';

  document.getElementById('repayModal').style.display = 'flex';
}

function closeRepayModal() {
  document.getElementById('repayModal').style.display = 'none';
  repayLoanId = null;
}

function updateRepayPreview() {
  const loan = currentLoans.find(l => l.id === repayLoanId);
  if (!loan) return;

  let amount = parseFloat(document.getElementById('repayAmount').value) || 0;
  amount = Math.min(amount, loan.remainingPrincipal);

  const feeRate = loan.earlyRepaymentFee || 0;
  const fee = Math.round(amount * (feeRate / 100));
  const total = amount + fee;

  document.getElementById('repayPrincipal').textContent = '$' + fmtNum(Math.round(amount));
  document.getElementById('repayFee').textContent = '$' + fmtNum(fee);
  document.getElementById('repayTotal').textContent = '$' + fmtNum(Math.round(total));
}

async function submitRepayment() {
  if (!repayLoanId) return;

  const btn = document.getElementById('repaySubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  const amount = parseFloat(document.getElementById('repayAmount').value) || 0;

  try {
    const res = await fetch(`/api/loans/${repayLoanId}/repay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Repayment failed');

    closeRepayModal();
    loadLoansPage();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm Repayment';
  }
}

// ── Holiday Modal ───────────────────────────────────────────────────────────

let holidayLoanId = null;

function requestHoliday(loanId) {
  const loan = currentLoans.find(l => l.id === loanId);
  if (!loan) return;

  holidayLoanId = loanId;

  document.getElementById('holidayBankName').textContent = loan.bankName;
  document.getElementById('holidayOutstanding').textContent = '$' + fmtNum(loan.remainingPrincipal);
  document.getElementById('holidayMonthly').textContent = '$' + fmtNum(loan.monthlyPayment);
  document.getElementById('holidayRate').textContent = loan.interestRate + '% APR';

  const estInterest = Math.round(loan.remainingPrincipal * (loan.interestRate / 100 / 12));
  document.getElementById('holidayInterestEst').textContent = '+$' + fmtNum(estInterest);
  document.getElementById('holidayRemaining').textContent = (loan.paymentHolidaysRemaining - 1) + ' of ' + loan.paymentHolidaysTotal;

  document.getElementById('holidayModal').style.display = 'flex';
}

function closeHolidayModal() {
  document.getElementById('holidayModal').style.display = 'none';
  holidayLoanId = null;
}

async function submitHoliday() {
  if (!holidayLoanId) return;

  const btn = document.getElementById('holidaySubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Activating...';

  try {
    const res = await fetch(`/api/loans/${holidayLoanId}/holiday`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to activate holiday');

    closeHolidayModal();
    loadLoansPage();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Activate Holiday';
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(n) {
  const v = parseFloat(n) || 0;
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(v).toLocaleString();
}

function fmtNum(n) {
  return Math.round(Number(n) || 0).toLocaleString('en-US');
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

document.addEventListener('DOMContentLoaded', loadLoansPage);
