// Recent Changes page — renders the commit table from /api/changelog.

// Discord invite for bug reports / feature requests. Leave empty to hide the CTA.
// TODO: paste the real invite URL (e.g. https://discord.gg/xxxxxxx)
const DISCORD_INVITE_URL = 'https://discord.gg/jQS64S4pUk';

const GITHUB_REPO_URL = 'https://github.com/fcooper94/AMS.ceo';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function loadChangelog() {
  const container = document.getElementById('changelogTable');
  try {
    const res = await fetch('/api/changelog');
    if (!res.ok) throw new Error('Failed to load');
    const data = await res.json();
    const commits = data.commits || [];

    if (commits.length === 0) {
      container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No changes to show yet.</div>';
      return;
    }

    let rows = '';
    let lastDay = '';
    for (const c of commits) {
      const d = c.date ? new Date(c.date) : null;
      const dayLabel = d ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';
      if (dayLabel && dayLabel !== lastDay) {
        lastDay = dayLabel;
        rows += `
          <tr>
            <td colspan="3" style="padding: 0.55rem 0.85rem 0.3rem; color: var(--accent-color); font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--border-color); background: var(--surface-elevated);">${dayLabel}</td>
          </tr>`;
      }
      rows += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 0.45rem 0.85rem; white-space: nowrap; width: 90px;">
            <a href="${esc(c.url)}" target="_blank" rel="noopener" title="View commit on GitHub"
               style="font-family: 'Courier New', monospace; font-size: 0.72rem; font-weight: 700; color: var(--accent-color); text-decoration: none; padding: 0.15rem 0.45rem; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3); border-radius: 4px;"
               onmouseover="this.style.background='rgba(59,130,246,0.2)'" onmouseout="this.style.background='rgba(59,130,246,0.1)'">${esc(c.shortSha)}</a>
          </td>
          <td style="padding: 0.45rem 0.85rem; white-space: nowrap; width: 70px; color: var(--text-muted); font-size: 0.72rem;">${d ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}</td>
          <td style="padding: 0.45rem 0.85rem; color: var(--text-primary); font-size: 0.8rem;">${esc(c.message)}</td>
        </tr>`;
    }

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <th style="padding: 0.5rem 0.85rem; text-align: left; color: var(--text-muted); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em;">Commit</th>
            <th style="padding: 0.5rem 0.85rem; text-align: left; color: var(--text-muted); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em;">Time</th>
            <th style="padding: 0.5rem 0.85rem; text-align: left; color: var(--text-muted); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em;">Change</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch (err) {
    container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Couldn't load the changelog right now — see the <a href="${GITHUB_REPO_URL}/commits/main" target="_blank" rel="noopener" style="color: var(--accent-color);">full history on GitHub</a>.</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const cta = document.getElementById('discordCta');
  if (cta && DISCORD_INVITE_URL) {
    cta.href = DISCORD_INVITE_URL;
    cta.style.display = 'flex';
  }
  loadChangelog();
});
