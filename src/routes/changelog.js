/**
 * Public changelog API — recent commits from the GitHub repo, served with a
 * server-side cache (GitHub's unauthenticated API allows 60 req/hr per IP,
 * so every page view must NOT hit GitHub directly).
 */
const express = require('express');
const router = express.Router();

const REPO = 'fcooper94/AMS.ceo';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const COMMIT_COUNT = 50;

let cache = { at: 0, commits: null };

router.get('/', async (req, res) => {
  try {
    if (cache.commits && Date.now() - cache.at < CACHE_TTL_MS) {
      return res.json({ commits: cache.commits, cached: true });
    }

    // GITHUB_TOKEN is optional (public repo) but recommended on Railway:
    // unauthenticated rate limits are per egress IP, which is shared there.
    const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'AMS.ceo-changelog' };
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    const ghRes = await fetch(`https://api.github.com/repos/${REPO}/commits?per_page=${COMMIT_COUNT}`, { headers });
    if (!ghRes.ok) {
      // Rate-limited or GitHub down: serve stale cache if we have one
      if (cache.commits) return res.json({ commits: cache.commits, cached: true, stale: true });
      return res.status(502).json({ error: 'Could not fetch changelog from GitHub' });
    }

    const raw = await ghRes.json();
    const commits = raw.map(c => ({
      sha: c.sha,
      shortSha: c.sha.substring(0, 7),
      message: (c.commit.message || '').split('\n')[0],
      date: c.commit.committer?.date || c.commit.author?.date,
      url: c.html_url
    }));

    cache = { at: Date.now(), commits };
    res.json({ commits });
  } catch (error) {
    console.error('Error fetching changelog:', error.message);
    if (cache.commits) return res.json({ commits: cache.commits, cached: true, stale: true });
    res.status(500).json({ error: 'Failed to fetch changelog' });
  }
});

module.exports = router;
