// AMS onboarding coach-marks — a spotlight tour that dims the screen and
// highlights real sidebar items one step at a time. Self-contained (styles are
// injected on first use). Usage:  window.AMSTutorial.start(steps)
// Each step: { selector, title, text }.  selector null => centred card.
(function () {
  let steps = [];
  let idx = 0;
  let dontShow = false;
  let els = null;

  const CALLOUT_W = 620;

  function injectStyles() {
    if (document.getElementById('tut-styles')) return;
    const css = `
      .tut-catch { position: fixed; inset: 0; z-index: 99998; }
      .tut-catch.tut-dim { background: rgba(0,0,0,0.75); }
      .tut-hole { position: fixed; z-index: 99999; border-radius: 8px; pointer-events: none;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.72);
        border: 2px solid var(--accent-color, #3b82f6);
        transition: left .25s ease, top .25s ease, width .25s ease, height .25s ease; }
      .tut-callout { position: fixed; z-index: 100000; width: ${CALLOUT_W}px; max-width: calc(100vw - 24px);
        background: var(--surface-elevated, #1c2431); color: var(--text-primary, #e6edf3);
        border: 1px solid var(--border-color, #30363d); border-radius: 10px; padding: 1.1rem 1.2rem 1rem;
        box-shadow: 0 12px 44px rgba(0,0,0,0.5); font-family: system-ui, -apple-system, sans-serif;
        transition: left .25s ease, top .25s ease; }
      .tut-x { position: absolute; top: 8px; right: 10px; background: none; border: none; cursor: pointer;
        color: var(--text-muted, #8b949e); font-size: 1.3rem; line-height: 1; padding: 2px 4px; }
      .tut-x:hover { color: var(--text-primary, #e6edf3); }
      .tut-img { width: 100%; height: auto; max-height: 360px; object-fit: cover; object-position: top center;
        border-radius: 6px; border: 1px solid var(--border-color, #30363d); margin-bottom: .8rem; display: block; }
      .tut-step-count { font-size: .68rem; text-transform: uppercase; letter-spacing: 1px;
        color: var(--accent-color, #3b82f6); font-weight: 700; margin-bottom: .35rem; }
      .tut-title { font-size: 1.05rem; font-weight: 700; margin-bottom: .4rem; }
      .tut-text { font-size: .86rem; line-height: 1.55; color: var(--text-secondary, #b8c2cc); }
      .tut-text b { color: var(--text-primary, #e6edf3); }
      .tut-dots { display: flex; gap: 6px; margin: .9rem 0 .6rem; }
      .tut-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border-color, #3a4553); }
      .tut-dot.active { background: var(--accent-color, #3b82f6); }
      .tut-nav { display: flex; align-items: center; gap: .6rem; }
      .tut-nav .tut-spacer { flex: 1; }
      .tut-arrow { width: 34px; height: 34px; border-radius: 6px; border: 1px solid var(--border-color, #30363d);
        background: var(--surface, #131a24); color: var(--text-primary, #e6edf3); cursor: pointer;
        font-size: 1.3rem; line-height: 1; display: flex; align-items: center; justify-content: center; }
      .tut-arrow:hover:not(:disabled) { border-color: var(--accent-color, #3b82f6); }
      .tut-arrow:disabled { opacity: .35; cursor: default; }
      .tut-done { padding: .5rem 1.1rem; border-radius: 6px; border: none; cursor: pointer; font-weight: 700;
        font-size: .8rem; text-transform: uppercase; letter-spacing: .5px;
        background: var(--accent-color, #3b82f6); color: #fff; }
      .tut-dontshow { display: flex; align-items: center; gap: .4rem; font-size: .74rem;
        color: var(--text-muted, #8b949e); cursor: pointer; user-select: none; }
      .tut-dontshow input { cursor: pointer; }
    `;
    const style = document.createElement('style');
    style.id = 'tut-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function build() {
    injectStyles();
    const cat = document.createElement('div'); cat.className = 'tut-catch';
    const hole = document.createElement('div'); hole.className = 'tut-hole';
    const callout = document.createElement('div'); callout.className = 'tut-callout';
    document.body.appendChild(cat);
    document.body.appendChild(hole);
    document.body.appendChild(callout);
    els = { cat, hole, callout };
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
  }

  function render() {
    const s = steps[idx];
    const last = idx === steps.length - 1;
    const dots = steps.map((_, i) => `<span class="tut-dot${i === idx ? ' active' : ''}"></span>`).join('');
    els.callout.innerHTML = `
      <button class="tut-x" aria-label="Skip tutorial">&times;</button>
      ${s.image ? `<img class="tut-img" src="${s.image}" alt="">` : ''}
      <div class="tut-step-count">Step ${idx + 1} of ${steps.length}</div>
      <div class="tut-title">${s.title}</div>
      <div class="tut-text">${s.text}</div>
      <div class="tut-dots">${dots}</div>
      <div class="tut-nav">
        <button class="tut-arrow tut-back" ${idx === 0 ? 'disabled' : ''} aria-label="Back">&lsaquo;</button>
        ${last ? '' : '<button class="tut-arrow tut-next" aria-label="Next">&rsaquo;</button>'}
        <span class="tut-spacer"></span>
        <label class="tut-dontshow"><input type="checkbox" class="tut-cb"> Don't show again</label>
        ${last ? '<button class="tut-done">Get started</button>' : ''}
      </div>`;
    els.callout.querySelector('.tut-cb').checked = dontShow;
    const img = els.callout.querySelector('.tut-img');
    if (img) img.addEventListener('load', position); // reflow once the screenshot loads
    wire();
    applySidebarState(s);
    position();
    // The submenu expands with a CSS transition — reposition once it settles so
    // the spotlight lands on the (now visible) child menu item.
    setTimeout(position, 320);
  }

  // Expand the step's sidebar category (add `active` to the parent, like a click)
  // and collapse the others, so the highlighted child item is visible.
  function applySidebarState(step) {
    document.querySelectorAll('.nav-item.parent.active').forEach(p => p.classList.remove('active'));
    if (step && step.expand) {
      const parent = document.querySelector(step.expand);
      if (parent) parent.classList.add('active');
    }
  }

  function wire() {
    const c = els.callout;
    c.querySelector('.tut-x').onclick = () => finish();
    const back = c.querySelector('.tut-back'); if (back) back.onclick = () => { if (idx > 0) { idx--; render(); } };
    const next = c.querySelector('.tut-next'); if (next) next.onclick = () => { if (idx < steps.length - 1) { idx++; render(); } };
    const done = c.querySelector('.tut-done'); if (done) done.onclick = () => finish();
    c.querySelector('.tut-cb').onchange = (e) => { dontShow = e.target.checked; };
  }

  function position() {
    if (!els) return;
    const s = steps[idx];
    let target = s.selector ? document.querySelector(s.selector) : null;
    const c = els.callout;
    const vw = window.innerWidth, vh = window.innerHeight;
    const ch = c.offsetHeight || 200;
    const cw = c.offsetWidth || CALLOUT_W;

    // Hidden/collapsed target (e.g. narrow screens) → fall back to a centred card.
    if (target) {
      const tr = target.getBoundingClientRect();
      if (tr.width === 0 || tr.height === 0) target = null;
    }

    if (!target) {
      els.hole.style.display = 'none';
      els.cat.classList.add('tut-dim');
      c.style.left = Math.round((vw - cw) / 2) + 'px';
      c.style.top = Math.round((vh - ch) / 2) + 'px';
      return;
    }

    els.cat.classList.remove('tut-dim');
    els.hole.style.display = 'block';
    const r = target.getBoundingClientRect();
    const pad = 6;
    els.hole.style.left = (r.left - pad) + 'px';
    els.hole.style.top = (r.top - pad) + 'px';
    els.hole.style.width = (r.width + pad * 2) + 'px';
    els.hole.style.height = (r.height + pad * 2) + 'px';

    // Prefer to the right of the target (sidebar is on the left); else below.
    let left, top;
    if (r.right + 16 + cw <= vw - 12) {
      left = r.right + 16;
      top = r.top + r.height / 2 - ch / 2;
    } else {
      left = r.left;
      top = r.bottom + 16;
    }
    left = Math.max(12, Math.min(left, vw - cw - 12));
    top = Math.max(12, Math.min(top, vh - ch - 12));
    c.style.left = Math.round(left) + 'px';
    c.style.top = Math.round(top) + 'px';
  }

  function teardown() {
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', position, true);
    // Restore the sidebar to its default (all categories collapsed)
    document.querySelectorAll('.nav-item.parent.active').forEach(p => p.classList.remove('active'));
    if (els) { els.cat.remove(); els.hole.remove(); els.callout.remove(); els = null; }
  }

  function finish() {
    if (dontShow) {
      fetch('/auth/tutorial-dismiss', { method: 'POST' }).catch(() => {});
    }
    teardown();
  }

  function start(_steps) {
    if (!Array.isArray(_steps) || !_steps.length) return;
    if (els) teardown();
    steps = _steps; idx = 0; dontShow = false;
    build();
    render();
  }

  window.AMSTutorial = { start };
})();
