(function () {
  'use strict';

  var _2faEnabled = false; // set by load2faStatus, used by email/password modals

  // ── Helpers ──────────────────────────────────────────────
  function showMsg(id, text, isError) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.color = isError ? 'var(--warning-color)' : 'var(--success-color)';
    el.textContent = text;
    if (!isError) setTimeout(() => { el.textContent = ''; }, 4000);
  }

  async function api(method, path, body) {
    const opts = { method, headers: {} };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function openModal(id) { document.getElementById(id).classList.add('open'); }
  function closeModal(id) {
    const m = document.getElementById(id);
    m.classList.remove('open');
    // Clear inputs
    m.querySelectorAll('input').forEach(i => { i.value = ''; });
    m.querySelectorAll('.acct-modal-msg').forEach(el => { el.textContent = ''; });
  }

  // ── Load profile ────────────────────────────────────────
  async function loadProfile() {
    try {
      const p = await api('GET', '/api/account');
      document.getElementById('acctNameDisplay').textContent = (p.firstName + ' ' + p.lastName).trim() || 'Not set';
      document.getElementById('acctEmailDisplay').textContent = p.email || 'Not set';
      document.getElementById('acctFirstName').value = p.firstName || '';
      document.getElementById('acctLastName').value = p.lastName || '';
      if (p.memberSince) {
        document.getElementById('acctMemberSince').textContent =
          new Date(p.memberSince).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch (err) {
      console.error('[Account] Load failed:', err);
    }
  }

  // ── Load 2FA status ─────────────────────────────────────
  async function load2faStatus() {
    try {
      var s = await api('GET', '/api/account/2fa/status');
      var statusEl = document.getElementById('acct2faStatus');
      var btn = document.getElementById('toggle2faBtn');
      var noteEl = document.getElementById('acct2faNote');
      var loginRow = document.getElementById('acct2faLoginRow');
      var loginToggle = document.getElementById('acct2faLoginToggle');
      var loginLabel = document.getElementById('acct2faLoginLabel');

      _2faEnabled = !!s.enabled;

      // Show/hide 2FA code fields in email & password modals
      var emailTotpRow = document.getElementById('emailTotpRow');
      var passwordTotpRow = document.getElementById('passwordTotpRow');
      if (emailTotpRow) emailTotpRow.style.display = _2faEnabled ? 'block' : 'none';
      if (passwordTotpRow) passwordTotpRow.style.display = _2faEnabled ? 'block' : 'none';

      if (s.enabled) {
        statusEl.innerHTML = '<span class="acct-badge acct-badge-on">ENABLED</span>';
        btn.textContent = 'Disable';
        btn.onclick = function () { openModal('tfaDisableModal'); };
      } else {
        statusEl.innerHTML = '<span class="acct-badge acct-badge-off">OFF</span>';
        btn.textContent = 'Enable';
        btn.onclick = start2faSetup;
      }

      // "Require at Login" toggle — any user with 2FA enabled
      if (s.enabled && loginRow) {
        loginRow.style.display = 'flex';
        loginToggle.checked = !!s.loginRequired;
        loginLabel.textContent = s.loginRequired ? 'Required every sign-in' : (s.isAdmin ? 'Admin panel only' : 'Off');
        loginToggle.onchange = async function () {
          try {
            var result = await api('PUT', '/api/account/2fa/login-required', { enabled: loginToggle.checked });
            loginLabel.textContent = result.loginRequired ? 'Required every sign-in' : (s.isAdmin ? 'Admin panel only' : 'Off');
          } catch (err) {
            loginToggle.checked = !loginToggle.checked;
          }
        };
      } else if (loginRow) {
        loginRow.style.display = 'none';
      }

      // Admin note
      if (s.isAdmin && noteEl) {
        noteEl.style.display = 'block';
        noteEl.textContent = s.enabled
          ? '2FA is required to access the admin panel.'
          : 'Once enabled, a code will be required to access the admin panel.';
      }
    } catch (err) {
      console.error('[Account] 2FA status failed:', err);
    }
  }

  // ── 2FA Setup flow ──────────────────────────────────────
  async function start2faSetup() {
    openModal('tfaSetupModal');
    const body = document.getElementById('tfaSetupBody');
    body.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:1rem;">Setting up...</div>';
    try {
      const data = await api('POST', '/api/account/2fa/setup');
      body.innerHTML = '' +
        '<p style="font-size:0.82rem; color:var(--text-secondary); margin:0 0 0.75rem;">Scan this QR code with your authenticator app (Authy, Google Authenticator, etc.):</p>' +
        '<div style="text-align:center; margin-bottom:0.75rem;"><img src="' + data.qrDataUrl + '" alt="QR" style="width:180px; height:180px; border-radius:8px; image-rendering:pixelated;" /></div>' +
        '<div style="margin-bottom:0.75rem;">' +
          '<label class="acct-label">Or enter this key manually</label>' +
          '<div style="background:var(--surface); border:1px solid var(--border-color); border-radius:5px; padding:0.45rem 0.6rem; font-family:\'Courier New\',monospace; font-size:0.8rem; color:var(--text-primary); word-break:break-all; user-select:all;">' + data.secret + '</div>' +
        '</div>' +
        '<div style="margin-bottom:0.75rem;">' +
          '<label class="acct-label">Backup codes (save these somewhere safe)</label>' +
          '<div style="background:var(--surface); border:1px solid var(--border-color); border-radius:5px; padding:0.45rem 0.6rem; font-family:\'Courier New\',monospace; font-size:0.75rem; color:var(--text-secondary); display:grid; grid-template-columns:1fr 1fr; gap:0.2rem 1rem;">' +
            data.backupCodes.map(function (c) { return '<span>' + c + '</span>'; }).join('') +
          '</div>' +
        '</div>' +
        '<label class="acct-label">Enter a code from the app to confirm</label>' +
        '<input type="text" id="tfaSetupCode" class="acct-input" placeholder="6-digit code" maxlength="6" autocomplete="off" inputmode="numeric" style="letter-spacing:4px; text-align:center; font-family:\'Courier New\',monospace; font-size:1.1rem;" />' +
        '<div class="acct-modal-msg" id="tfaSetupMsg"></div>' +
        '<div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.75rem;">' +
          '<button class="acct-btn-secondary" data-close="tfaSetupModal">Cancel</button>' +
          '<button class="acct-btn-primary" id="tfaConfirmBtn">Enable 2FA</button>' +
        '</div>';

      // Wire buttons inside the dynamic content
      body.querySelector('[data-close]').addEventListener('click', function () { closeModal('tfaSetupModal'); });
      body.querySelector('#tfaConfirmBtn').addEventListener('click', confirm2faSetup);
    } catch (err) {
      body.innerHTML = '<div style="text-align:center; color:var(--warning-color); padding:1rem;">' + err.message + '</div>';
    }
  }

  async function confirm2faSetup() {
    var btn = document.getElementById('tfaConfirmBtn');
    var code = (document.getElementById('tfaSetupCode').value || '').trim();
    if (!code) return showMsg('tfaSetupMsg', 'Enter a 6-digit code', true);
    btn.disabled = true;
    try {
      await api('POST', '/api/account/2fa/enable', { code: code });
      closeModal('tfaSetupModal');
      load2faStatus();
    } catch (err) {
      showMsg('tfaSetupMsg', err.message, true);
    } finally { btn.disabled = false; }
  }

  // ── Load billing history ────────────────────────────────
  async function loadHistory() {
    var body = document.getElementById('invoicesBody');
    try {
      var res = await fetch('/api/billing/history');
      if (!res.ok) { body.textContent = 'No payment history.'; return; }
      var rows = await res.json();
      if (!rows || rows.length === 0) { body.textContent = 'No payments yet.'; return; }
      body.innerHTML = '';
      var html = rows.map(function (r) {
        var d = new Date(r.date).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        var refunded = !!r.refundedAt;
        var statusLabel = refunded ? 'Refunded' : r.status;
        var statusColor = refunded ? 'var(--text-muted)' : r.status === 'paid' ? 'var(--success-color)' : r.status === 'pending' ? 'var(--warning-color)' : '#f85149';
        var sym = (r.currency || 'gbp').toLowerCase() === 'gbp' ? '\u00A3' : (r.currency || '').toUpperCase() + ' ';
        var amt = (r.amount / 100).toFixed(2);
        var links = [
          refunded && r.creditNoteUrl ? '<a class="acct-hist-link" href="' + r.creditNoteUrl + '" target="_blank" rel="noopener">Refund invoice</a>' : '',
          !refunded && r.invoiceUrl ? '<a class="acct-hist-link" href="' + r.invoiceUrl + '" target="_blank" rel="noopener">Invoice</a>' : '',
          r.receiptUrl ? '<a class="acct-hist-link" href="' + r.receiptUrl + '" target="_blank" rel="noopener">Receipt</a>' : ''
        ].filter(Boolean).join(' \u00B7 ') || '<span style="color:var(--text-muted); font-size:0.75rem;">\u2014</span>';
        return '<div class="acct-hist-row">' +
          '<span style="color:var(--text-secondary);">' + d + '</span>' +
          '<span style="color:var(--text-primary);">+' + r.credits + ' credits</span>' +
          '<span style="font-family:\'Courier New\',monospace;">' + sym + amt + '</span>' +
          '<span style="color:' + statusColor + '; text-transform:capitalize; font-weight:600;">' + statusLabel + '</span>' +
          '<span style="text-align:right;">' + links + '</span>' +
          '</div>';
      }).join('');
      body.innerHTML = html;
    } catch (err) {
      body.textContent = 'No payment history.';
      console.error('[Account] History failed:', err);
    }
  }

  // ── Password strength ────────────────────────────────────
  function checkPwStrength(pw) {
    return { len: pw.length >= 6, letter: /[a-zA-Z]/.test(pw), number: /[0-9]/.test(pw), symbol: /[^a-zA-Z0-9]/.test(pw) };
  }
  function pwValid(pw) { var s = checkPwStrength(pw); return s.len && s.letter && s.number && s.symbol; }
  function pwStrengthLevel(pw) {
    var s = checkPwStrength(pw);
    var reqs = [s.len, s.letter, s.number, s.symbol].filter(Boolean).length;
    if (reqs < 4) return { pct: reqs * 15, color: '#f85149', label: 'Very weak', s: s };
    if (pw.length < 8)  return { pct: 60,  color: '#d29922', label: 'Weak', s: s };
    if (pw.length < 10) return { pct: 75,  color: '#d29922', label: 'Good', s: s };
    if (pw.length < 14) return { pct: 90,  color: '#3fb950', label: 'Strong', s: s };
    return { pct: 100, color: '#3fb950', label: 'Very strong', s: s };
  }
  function updatePwStrengthUI(pw, fillId, labelId, lenId, letterId, numberId, symbolId, boxId) {
    var box = document.getElementById(boxId);
    box.style.display = pw.length > 0 ? 'block' : 'none';
    var r = pwStrengthLevel(pw);
    document.getElementById(fillId).style.width = r.pct + '%';
    document.getElementById(fillId).style.background = r.color;
    var lbl = document.getElementById(labelId);
    lbl.textContent = r.label; lbl.style.color = r.color;
    document.getElementById(lenId).className = r.s.len ? 'met' : '';
    document.getElementById(letterId).className = r.s.letter ? 'met' : '';
    document.getElementById(numberId).className = r.s.number ? 'met' : '';
    document.getElementById(symbolId).className = r.s.symbol ? 'met' : '';
  }

  // ── Init ────────────────────────────────────────────────
  function init() {
    // Modal close buttons (static ones — dynamic ones are wired in their builders)
    document.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeModal(btn.getAttribute('data-close')); });
    });
    // Close on overlay click
    document.querySelectorAll('.acct-modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal(overlay.id);
      });
    });

    // Basic Info — Edit Name
    document.getElementById('editNameBtn').addEventListener('click', function () { openModal('nameModal'); });
    document.getElementById('saveNameBtn').addEventListener('click', async function () {
      var btn = this;
      var first = document.getElementById('acctFirstName').value.trim();
      var last = document.getElementById('acctLastName').value.trim();
      if (!first || !last) return showMsg('nameMsg', 'Both names are required', true);
      btn.disabled = true;
      try {
        await api('PUT', '/api/account/name', { firstName: first, lastName: last });
        document.getElementById('acctNameDisplay').textContent = first + ' ' + last;
        var navName = document.getElementById('userName');
        if (navName) navName.textContent = first + ' ' + last;
        closeModal('nameModal');
      } catch (err) {
        showMsg('nameMsg', err.message, true);
      } finally { btn.disabled = false; }
    });

    // Basic Info — Change Email
    document.getElementById('changeEmailBtn').addEventListener('click', function () { openModal('emailModal'); });
    document.getElementById('saveEmailBtn').addEventListener('click', async function () {
      var btn = this;
      var pw = document.getElementById('acctEmailPassword').value;
      var email = document.getElementById('acctNewEmail').value.trim();
      var totpCode = _2faEnabled ? (document.getElementById('acctEmailTotp').value || '').trim() : '';
      if (!pw) return showMsg('emailMsg', 'Password is required', true);
      if (!email) return showMsg('emailMsg', 'Email is required', true);
      if (_2faEnabled && !totpCode) return showMsg('emailMsg', '2FA code is required', true);
      btn.disabled = true;
      try {
        await api('PUT', '/api/account/email', { email: email, password: pw, totpCode: totpCode });
        document.getElementById('acctEmailDisplay').textContent = email;
        closeModal('emailModal');
      } catch (err) {
        showMsg('emailMsg', err.message, true);
      } finally { btn.disabled = false; }
    });

    // Security — Change Password
    document.getElementById('changePasswordBtn').addEventListener('click', function () { openModal('passwordModal'); });
    document.getElementById('acctNewPassword').addEventListener('input', function () {
      updatePwStrengthUI(this.value, 'acctPwFill', 'acctPwLabel', 'acctReqLen', 'acctReqLetter', 'acctReqNumber', 'acctReqSymbol', 'acctPwStrength');
    });
    document.getElementById('savePasswordBtn').addEventListener('click', async function () {
      var btn = this;
      var cur = document.getElementById('acctCurrentPassword').value;
      var np = document.getElementById('acctNewPassword').value;
      var cp = document.getElementById('acctConfirmPassword').value;
      var totpCode = _2faEnabled ? (document.getElementById('acctPasswordTotp').value || '').trim() : '';
      if (!cur) return showMsg('passwordMsg', 'Current password is required', true);
      if (!pwValid(np)) return showMsg('passwordMsg', 'Password needs a letter, number and symbol (6+ chars)', true);
      if (np !== cp) return showMsg('passwordMsg', 'Passwords do not match', true);
      if (_2faEnabled && !totpCode) return showMsg('passwordMsg', '2FA code is required', true);
      btn.disabled = true;
      try {
        await api('PUT', '/api/account/password', { currentPassword: cur, newPassword: np, totpCode: totpCode });
        closeModal('passwordModal');
      } catch (err) {
        showMsg('passwordMsg', err.message, true);
      } finally { btn.disabled = false; }
    });

    // Security — Disable 2FA
    document.getElementById('tfaDisableBtn').addEventListener('click', async function () {
      var btn = this;
      var code = (document.getElementById('tfaDisableCode').value || '').trim();
      if (!code) return showMsg('tfaDisableMsg', 'Enter a code', true);
      btn.disabled = true;
      try {
        await api('POST', '/api/account/2fa/disable', { code: code });
        closeModal('tfaDisableModal');
        load2faStatus();
      } catch (err) {
        showMsg('tfaDisableMsg', err.message, true);
      } finally { btn.disabled = false; }
    });

    // Load data
    loadProfile();
    load2faStatus();
    loadHistory();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
