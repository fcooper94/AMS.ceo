require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const passport = require('./config/passport');
const path = require('path');
const sequelize = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true, // Allow Socket.IO v3 clients (backwards compatibility)
  path: '/socket.io/',
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 3000;

// --- Database sync gate ---
// Server starts listening immediately so Railway sees a healthy container.
// All requests are held at the gate until the DB sync finishes, then through
// a short "warming" phase while the game worlds start and their first
// processing burst settles (otherwise the first users hit 5-8s responses).
let dbReady = false;          // DB synced (health endpoint reports healthy from here)
let appPhase = 'syncing';     // 'syncing' → 'warming' → 'ready' (gate opens at 'ready')

// Sync status endpoint (always available, even during sync)
app.get('/api/sync-status', (req, res) => {
  res.json({ ready: appPhase === 'ready', phase: appPhase });
});

// Health check (always available for Railway)
app.get('/api/health', (req, res) => {
  res.json({
    status: dbReady ? 'healthy' : 'syncing',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Gate middleware — serves maintenance page until the app is fully ready
app.use((req, res, next) => {
  if (appPhase === 'ready') return next();

  // Let sync-status and health through (already handled above)
  if (req.path === '/api/sync-status' || req.path === '/api/health') return next();

  // API requests get a 503 with retry hint
  if (req.path.startsWith('/api/')) {
    return res.status(503).json({ error: 'Server starting up', syncing: true, phase: appPhase });
  }

  // All page requests get the maintenance page
  return res.sendFile(path.join(__dirname, '../public/db-updating.html'));
});

// Middleware
app.use(cors());
// Gzip responses (JSON + static). The route-picker payloads are hundreds of
// airports of indicator data — typically 5-10x smaller compressed. Response-
// side only, so the raw-body Stripe webhook below is unaffected.
app.use(require('compression')());
// Stripe webhook needs the RAW request body for signature verification, so it
// must be registered before the JSON body parser below.
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), require('./routes/billingWebhook'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Event-loop stall monitor: when SLOW request warnings hit static files and
// trivial endpoints simultaneously, the process itself is stalling (blocked
// event loop / CPU starvation), not the endpoints. This logs the stalls with
// their magnitude so the culprit window is visible in Railway logs.
// During the demand-cache load the JSON.parse of a 172MB string blocks the
// loop for several seconds ONCE PER BOOT — expected, not broken. Both
// monitors below label that window as boot work instead of warning, so a ⚠
// in the logs always means something genuinely unexpected.
const _demandCacheLoading = () => {
  try { return require('./services/demandCacheService').isLoading(); } catch (_) { return false; }
};
{
  const CHECK_MS = 500;
  let last = Date.now();
  let lastLogged = 0;
  setInterval(() => {
    const now = Date.now();
    const lag = now - last - CHECK_MS;
    last = now;
    if (lag > 1000 && now - lastLogged > 10000) {
      lastLogged = now;
      if (_demandCacheLoading()) {
        console.log(`[BOOT] event loop busy ~${Math.round(lag)}ms (demand-cache decompress/parse — expected once per boot)`);
      } else {
        console.warn(`⚠ EVENT-LOOP STALL ~${Math.round(lag)}ms (process blocked — check tick/refresh work around this timestamp)`);
      }
    }
  }, CHECK_MS);
}

// Request logging: only log slow requests (>3s) as warnings.
// Set HTTP_LOG=1 to see all requests (morgan 'dev' format).
if (process.env.HTTP_LOG === '1') {
  app.use(morgan('dev'));
} else {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      if (ms > 3000) {
        if (_demandCacheLoading()) {
          console.log(`[BOOT] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms (queued behind demand-cache load — expected once per boot)`);
        } else {
          console.warn(`⚠ SLOW ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
        }
      }
    });
    next();
  });
}

// Behind Railway's TLS proxy: trust X-Forwarded-* so secure cookies and
// req.ip work correctly if/when NODE_ENV=production turns cookie.secure on
app.set('trust proxy', 1);

// Session configuration — Redis-backed when REDIS_URL is set: sessions
// survive deploys (no more everyone-logged-out on restart) and are shared
// across web replicas. Local dev without Redis keeps MemoryStore. The
// client reconnects automatically; requests during a brief Redis blip
// queue in the client's offline queue.
let sessionStore; // undefined → express-session default MemoryStore
if (process.env.REDIS_URL) {
  try {
    const { createClient } = require('redis');
    const { RedisStore } = require('connect-redis');
    const sessionRedis = createClient({ url: process.env.REDIS_URL });
    sessionRedis.on('error', (e) => console.error('[Redis] session client error:', e.message));
    sessionRedis.connect().catch((e) => console.error('[Redis] session client connect failed:', e.message));
    sessionStore = new RedisStore({ client: sessionRedis, prefix: 'ams:sess:' });
    console.log('[Redis] Session store: Redis (sessions survive restarts/replicas)');
  } catch (e) {
    console.error('[Redis] Session store setup failed — falling back to MemoryStore:', e.message);
  }
}
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'airline-control-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Track online users — lightweight in-memory map (userId → lastSeen timestamp).
// Updated on every authenticated request; admin endpoint reads it.
const onlineUsers = new Map();
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
app.use((req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.id) {
    onlineUsers.set(req.user.id, Date.now());
  }
  next();
});
// Prune stale entries every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - ONLINE_THRESHOLD_MS;
  for (const [uid, ts] of onlineUsers) {
    if (ts < cutoff) onlineUsers.delete(uid);
  }
}, 10 * 60 * 1000);
app.set('onlineUsers', onlineUsers);

// Under construction check - must be before static middleware (which serves index.html for /)
app.use(async (req, res, next) => {
  if (req.path !== '/') return next();
  try {
    const underConstruction = await SystemSettings.get('underConstruction', false);
    if (underConstruction === true || underConstruction === 'true') {
      return res.sendFile(path.join(__dirname, '../public/coming-soon.html'));
    }
  } catch (e) {
    // If DB fails, fall through to normal flow
  }
  next();
});

// Serve static files with cache control
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, path) => {
    // Disable caching for JS files to prevent stale code issues
    if (path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Socket.IO connection handling with verbose logging
io.on('connection', (socket) => {
  // Socket connect/disconnect logged only with DEBUG_SIM
  socket.on('disconnect', () => {});

  // World rooms: world:tick / notifications:refresh are emitted per-world
  // room so clients only receive their own world's events. A client joins
  // when it learns its active world (and re-joins on reconnect).
  socket.on('world:join', (worldId) => {
    if (typeof worldId !== 'string' || !/^[0-9a-f-]{10,64}$/i.test(worldId)) return;
    for (const room of socket.rooms) {
      if (room.startsWith('world:')) socket.leave(room);
    }
    socket.join(`world:${worldId}`);
  });

  socket.on('error', (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Socket.IO] Socket error:', error);
    }
  });
});

// Make io accessible to routes and globally for services
app.set('io', io);
global.io = io;

// Import middleware
const { requireAuth, redirectIfAuth, requireAdmin, requireWorld } = require('./middleware/auth');
const { SystemSettings } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const worldRoutes = require('./routes/world');
const worldSelectionRoutes = require('./routes/worldSelection');
const adminRoutes = require('./routes/admin');
const aircraftRoutes = require('./routes/aircraft');
const fleetRoutes = require('./routes/fleet');
const financesRoutes = require('./routes/finances');
const routesRoutes = require('./routes/routes');
const schedulingRoutes = require('./routes/scheduling');
const pricingRoutes = require('./routes/pricing');
const contactRoutes = require('./routes/contact');
const dashboardRoutes = require('./routes/dashboard');
const staffRoutes = require('./routes/staff');
const loansRoutes = require('./routes/loans');
const airspaceRoutes = require('./routes/airspace');
const marketingRoutes = require('./routes/marketing');
const sightseeingRoutes = require('./routes/sightseeing');

// Import services
const worldTimeService = require('./services/worldTimeService');
const airwayService = require('./services/airwayService');
const airportCacheService = require('./services/airportCacheService');

// Helper function to render pages with base layout
async function renderPage(pagePath, requestPath) {
  const fs = require('fs').promises;

  try {
    // Determine which sidebar to use based on the request path
    // Use simplified sidebar for admin, world selection, and public pages
    const simplifiedSidebarPages = ['/admin', '/world-selection', '/contact', '/credits', '/wiki', '/faqs', '/privacy', '/data-handling', '/changelog'];
    const sidebarPath = simplifiedSidebarPages.includes(requestPath)
      ? path.join(__dirname, '../public/partials/sidebar-admin.html')
      : path.join(__dirname, '../public/partials/sidebar.html');

    const [layoutHtml, pageHtml, sidebarHtml] = await Promise.all([
      fs.readFile(path.join(__dirname, '../public/base-layout.html'), 'utf8'),
      fs.readFile(pagePath, 'utf8'),
      fs.readFile(sidebarPath, 'utf8')
    ]);

    // Extract metadata from HTML comments
    const titleMatch = pageHtml.match(/<!--\s*TITLE:\s*(.+?)\s*-->/);
    const subtitleMatch = pageHtml.match(/<!--\s*SUBTITLE:\s*(.+?)\s*-->/);
    const scriptsMatch = pageHtml.match(/<!--\s*SCRIPTS:\s*(.+?)\s*-->/);
    const stylesMatch = pageHtml.match(/<!--\s*STYLES:\s*(.+?)\s*-->/);

    // Set active class on the correct nav item based on current path
    let processedSidebar = sidebarHtml;

    // Add active class to nav items - check exact path first, then parent for submenu expansion
    const addActiveClass = (sidebar, checkPath) => {
      // Match data-path that exactly matches or is in a comma-separated list
      // This regex ensures we match exact paths, not substrings (e.g., /routes shouldn't match /routes/create)
      const escapedPath = checkPath.replace(/\//g, '\\/');
      // Match: data-path="/path" OR data-path="/path,..." OR data-path="...,/path" OR data-path="...,/path,..."
      const dataPathRegex = new RegExp(`(<li class="nav-item[^"]*"[^>]*data-path="(?:${escapedPath}|${escapedPath},[^"]*|[^"]*,${escapedPath}|[^"]*,${escapedPath},[^"]*)")`, 'g');

      return sidebar.replace(dataPathRegex, (match) => {
        // Skip if already active
        if (match.includes('active')) return match;

        // Add active class
        if (match.includes('class="nav-item"')) {
          return match.replace('class="nav-item"', 'class="nav-item active"');
        } else if (match.includes('class="nav-item parent"')) {
          return match.replace('class="nav-item parent"', 'class="nav-item parent active"');
        }
        return match;
      });
    };

    // First, activate the exact path match
    processedSidebar = addActiveClass(processedSidebar, requestPath);

    // Then, activate parent menu for nested routes (e.g., /routes/create -> activate /routes parent)
    if (requestPath.includes('/')) {
      const parentPath = '/' + requestPath.split('/')[1];
      if (parentPath !== requestPath) {
        // Only activate parent items (for submenu expansion), not child items
        const escapedParent = parentPath.replace(/\//g, '\\/');
        const parentRegex = new RegExp(`(<li class="nav-item parent"[^>]*data-path="[^"]*${escapedParent}[^"]*")`, 'g');
        processedSidebar = processedSidebar.replace(parentRegex, (match) => {
          if (match.includes('active')) return match;
          return match.replace('class="nav-item parent"', 'class="nav-item parent active"');
        });
      }
    }

    let result = layoutHtml;

    // Replace title if specified
    if (titleMatch) {
      result = result.replace(/<title[^>]*>.*?<\/title>/, `<title>${titleMatch[1]}</title>`);
    }

    // Per-page SEO overrides. Public content pages opt IN to indexing via
    // comment directives; without them a page keeps base-layout's safe
    // `noindex` default (correct for the auth-gated app pages).
    const descriptionMatch = pageHtml.match(/<!--\s*DESCRIPTION:\s*([\s\S]+?)\s*-->/);
    const robotsMatch = pageHtml.match(/<!--\s*ROBOTS:\s*(.+?)\s*-->/);
    const canonicalMatch = pageHtml.match(/<!--\s*CANONICAL:\s*(.+?)\s*-->/);
    if (descriptionMatch) {
      // Function replacement avoids `$` in the description being treated as a backreference.
      result = result.replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${descriptionMatch[1]}">`);
    }
    if (robotsMatch) {
      result = result.replace(/<meta name="robots"[^>]*>/, () => `<meta name="robots" content="${robotsMatch[1]}">`);
    }
    if (canonicalMatch) {
      result = result.replace('</head>', () => `  <link rel="canonical" href="${canonicalMatch[1]}">\n</head>`);
    }

    // Add additional stylesheets in head if specified
    if (stylesMatch) {
      const styles = stylesMatch[1].split(',').map(s => s.trim());
      const styleTags = styles.map(href => `  <link rel="stylesheet" href="${href}">`).join('\n');
      result = result.replace('</head>', `${styleTags}\n</head>`);
    }

    // Replace subtitle if specified
    if (subtitleMatch) {
      result = result.replace(
        /<span class="brand-subtitle"[^>]*>.*?<\/span>/,
        `<span class="brand-subtitle" id="pageSubtitle">${subtitleMatch[1]}</span>`
      );
    }

    // Hide world info container for simplified sidebar pages (prevents flash)
    if (simplifiedSidebarPages.includes(requestPath)) {
      result = result.replace(
        '<div class="nav-world-info" id="worldInfoContainer">',
        '<div class="nav-world-info" id="worldInfoContainer" style="display: none;">'
      );
    }

    // Process page content - inject sidebar into dashboard-container
    let processedPageHtml = pageHtml;

    // If the page has a dashboard-container, inject the sidebar after it opens
    if (pageHtml.includes('<div class="dashboard-container">')) {
      processedPageHtml = pageHtml.replace(
        '<div class="dashboard-container">',
        `<div class="dashboard-container">\n  ${processedSidebar}`
      );
    }

    // Inject page content
    result = result.replace(
      /<div id="pageContent">[\s\S]*?<\/div>\s*<script/,
      `<div id="pageContent">\n${processedPageHtml}\n  </div>\n\n  <script`
    );

    // Add additional scripts before closing body tag if specified
    if (scriptsMatch) {
      const scripts = scriptsMatch[1].split(',').map(s => s.trim());
      const cacheBust = Date.now();
      const scriptTags = scripts.map(src => `  <script src="${src}?v=${cacheBust}"></script>`).join('\n');
      // Replace the LAST occurrence of </body> to ensure we add scripts to the actual body closing tag
      const lastBodyIndex = result.lastIndexOf('</body>');
      if (lastBodyIndex !== -1) {
        result = result.substring(0, lastBodyIndex) + scriptTags + '\n' + result.substring(lastBodyIndex);
      }
    }

    return result;
  } catch (error) {
    console.error('Error rendering page:', error);
    throw error;
  }
}

// Auth routes
app.use('/auth', authRoutes);

// API routes
app.use('/api/world', worldRoutes);
app.use('/api/worlds', worldSelectionRoutes);
app.use('/api/aircraft', aircraftRoutes);
app.use('/api/fleet', requireWorld, fleetRoutes);
app.use('/api/finances', requireWorld, financesRoutes);
app.use('/api/routes', requireWorld, routesRoutes);
app.use('/api/schedule', requireWorld, schedulingRoutes);
app.use('/api/pricing', requireWorld, pricingRoutes);
app.use('/api/admin/2fa', requireAdmin, require('./routes/admin2fa'));
app.use('/api/admin', requireAdmin, adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/dashboard', requireWorld, dashboardRoutes);
app.use('/api/staff', requireWorld, staffRoutes);
app.use('/api/loans', requireWorld, loansRoutes);
app.use('/api/airspace', requireWorld, airspaceRoutes);
app.use('/api/marketing', requireWorld, marketingRoutes);
app.use('/api/sightseeing-tours', requireWorld, sightseeingRoutes);
app.use('/api/billing', requireAuth, require('./routes/billing'));
app.use('/api/changelog', require('./routes/changelog')); // public

// Page routes
app.get('/', redirectIfAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Standalone Login / Register pages — gated behind a dev-bypass unlock while the
// app is in closed testing. Already-authenticated users skip to world selection.
app.get('/login', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) return res.redirect('/world-selection');
  if (!req.session || !req.session.devBypassUnlocked) return res.redirect('/');
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/register', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) return res.redirect('/world-selection');
  if (!req.session || !req.session.devBypassUnlocked) return res.redirect('/');
  res.sendFile(path.join(__dirname, '../public/register.html'));
});

app.get('/world-selection', requireAuth, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/world-selection.html'), '/world-selection');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/dashboard', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/dashboard.html'), '/dashboard');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/admin', requireAuth, async (req, res) => {
  try {
    // 2FA step-up gate: an admin with TOTP enabled gets the verify page —
    // the panel itself is never served until the session has passed 2FA.
    try {
      const { User } = require('./models');
      const me = await User.findOne({
        where: req.user.id ? { id: req.user.id } : { vatsimId: req.user.vatsimId },
        attributes: ['totpEnabled']
      });
      if (me && me.totpEnabled && !(req.session && req.session.adminTwoFA)) {
        return res.sendFile(path.join(__dirname, '../public/admin-2fa.html'));
      }
    } catch (_) { /* fall through — the API layer still enforces 2FA */ }
    const html = await renderPage(path.join(__dirname, '../public/admin.html'), '/admin');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/credits', requireAuth, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/credits.html'), '/credits');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/aircraft-marketplace', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/aircraft-marketplace.html'), '/aircraft-marketplace');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/fleet', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/fleet.html'), '/fleet');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/maintenance', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/maintenance.html'), '/maintenance');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/finances', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/finances.html'), '/finances');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/marketing', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/marketing.html'), '/marketing');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/staff', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/staff.html'), '/staff');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/loans', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/loans.html'), '/loans');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/world-map', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/world-map.html'), '/world-map');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/routes', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/routes.html'), '/routes');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/routes/create', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/routes-create.html'), '/routes/create');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/sightseeing/create', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/sightseeing-create.html'), '/sightseeing/create');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/scheduling', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/scheduling.html'), '/scheduling');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/airspace-config', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/airspace-config.html'), '/airspace-config');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/pricing', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/pricing.html'), '/pricing');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/routes/edit', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/routes-edit.html'), '/routes/edit');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/competition', requireWorld, async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/competition.html'), '/competition');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/contact', async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/contact.html'), '/contact');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/wiki', async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/wiki.html'), '/wiki');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/faqs', async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/faqs.html'), '/faqs');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/changelog', async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/changelog.html'), '/changelog');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/privacy', async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/privacy.html'), '/privacy');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/data-handling', async (req, res) => {
  try {
    const html = await renderPage(path.join(__dirname, '../public/data-handling.html'), '/data-handling');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/reset-password.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  } else {
    // In production, only log to file or external service if needed
    console.error('Server Error:', err.message);
  }
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// --- Start server immediately, then sync DB in background ---
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} (syncing database...)`);
});

// Run DB sync, then initialize services
(async () => {
  try {
    // Ensure all models and associations are loaded
    require('./models');

    // Verify the DB connection up front — fail fast and explicit, instead of
    // relying on the first ALTER/sync to surface a bad connection.
    await sequelize.authenticate();
    console.log('✓ Database connection verified');

    // Pre-add any new enum values before sync (Sequelize can't ALTER TYPE ADD VALUE)
    const enumUpdates = [
      { type: 'enum_user_aircraft_status', value: 'on_order' },
      { type: 'enum_user_aircraft_acquisition_type', value: 'lease' },
    ];
    for (const { type, value } of enumUpdates) {
      try {
        await sequelize.query(`ALTER TYPE "public"."${type}" ADD VALUE IF NOT EXISTS '${value}'`);
      } catch (_) { /* type may not exist yet — sync will create it */ }
    }

    // Pre-add columns that Sequelize alter may miss
    try {
      await sequelize.query(`
        ALTER TABLE weekly_financials
          ADD COLUMN IF NOT EXISTS passenger_revenue_breakdown JSONB DEFAULT '{}'::jsonb,
          ADD COLUMN IF NOT EXISTS cargo_revenue_breakdown JSONB DEFAULT '{}'::jsonb,
          ADD COLUMN IF NOT EXISTS marketing_costs DECIMAL(15,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS ground_handling_costs DECIMAL(15,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS pax_service_costs DECIMAL(15,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS insurance_costs DECIMAL(15,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS corporate_admin_costs DECIMAL(15,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS fleet_capital_costs DECIMAL(15,2) DEFAULT 0
      `);
    } catch (_) { /* table may not exist yet — sync will create it */ }
    try {
      await sequelize.query(`
        ALTER TABLE marketing_campaigns
          ADD COLUMN IF NOT EXISTS audience_levels JSONB DEFAULT '{}'::jsonb
      `);
    } catch (_) { /* table may not exist yet — sync will create it */ }
    try {
      await sequelize.query(`
        ALTER TABLE aircraft ADD COLUMN IF NOT EXISTS is_combi BOOLEAN NOT NULL DEFAULT FALSE
      `);
      // Ensure known combi aircraft have the flag set correctly
      await sequelize.query(`
        UPDATE aircraft SET is_combi = TRUE
        WHERE manufacturer = 'Bristol' AND model = '170' AND variant IN ('Car Ferry', 'Combi')
      `);
    } catch (_) { /* aircraft table may not exist yet */ }
    try {
      await sequelize.query(`
        ALTER TABLE routes ADD COLUMN IF NOT EXISTS custom_route_string TEXT
      `);
    } catch (_) { /* routes table may not exist yet — sync will create it */ }
    try {
      await sequelize.query(`ALTER TABLE user_aircraft ADD COLUMN IF NOT EXISTS financing_repayment_strategy VARCHAR(20)`);
    } catch (_) { /* user_aircraft table may not exist yet — sync will create it */ }
    try {
      // processMaintenance filters on (status, day_of_week) every cycle — without
      // this index it seq-scans ~460K active rows per world per cycle
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_recurring_maintenance_status_dow ON recurring_maintenance (status, day_of_week)`);
    } catch (_) { /* table may not exist yet — sync will create it */ }
    try {
      // Loan reference — labels aircraft-delivery loans with reg + order date
      await sequelize.query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS reference VARCHAR(255)`);
    } catch (_) { /* loans table may not exist yet — sync will create it */ }
    try {
      await sequelize.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS tutorial_dismissed BOOLEAN NOT NULL DEFAULT FALSE
      `);
      await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255)`);
      await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
      await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes JSONB`);
    } catch (_) { /* users table may not exist yet — sync will create it */ }
    try {
      // Create the payments table if it doesn't exist (non-destructive CREATE).
      await require('./models/Payment').sync();
      // Additive column for admin refunds (sync() won't alter an existing table).
      await sequelize.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE`);
      await sequelize.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS credit_note_url TEXT`);
    } catch (e) { console.warn('[boot] payments table sync skipped:', e.message); }
    try {
      await sequelize.query(`
        ALTER TABLE worlds
          ADD COLUMN IF NOT EXISTS pause_on_session_end BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS ai_maturity VARCHAR(20) NOT NULL DEFAULT 'brand_new',
          ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD',
          ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS assigned_worker VARCHAR(64),
          ADD COLUMN IF NOT EXISTS worker_heartbeat_at TIMESTAMP WITH TIME ZONE
      `);
    } catch (_) { /* worlds table may not exist yet — sync will create it */ }
    try {
      await sequelize.query(`ALTER TYPE enum_user_aircraft_status ADD VALUE IF NOT EXISTS 'scrapping'`);
    } catch (_) { /* enum may not exist yet */ }
    try {
      // Allow airships as an aircraft type (seeded via seedHistoricalAircraft)
      await sequelize.query(`ALTER TYPE enum_aircraft_type ADD VALUE IF NOT EXISTS 'Airship'`);
    } catch (_) { /* enum may not exist yet */ }
    try {
      await sequelize.query(`
        ALTER TABLE user_aircraft
          ADD COLUMN IF NOT EXISTS scrap_price DECIMAL(15,2),
          ADD COLUMN IF NOT EXISTS scrap_airport_code VARCHAR(4),
          ADD COLUMN IF NOT EXISTS scrap_company_name VARCHAR(255),
          ADD COLUMN IF NOT EXISTS scrap_available_at TIMESTAMP WITH TIME ZONE
      `);
    } catch (_) { /* user_aircraft table may not exist yet */ }
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_recurring_maintenance_status_sched
          ON recurring_maintenance (status, scheduled_date)
      `);
    } catch (_) { /* table may not exist yet — sync will create it */ }

    // Full schema reconciliation is opt-in. sequelize.sync({ alter: true }) is
    // slow, used to run on every boot (hence the maintenance screen each
    // restart) and re-attempts the known airports.operational_from DATE-cast
    // abort. Code-only deploys need none of it — the idempotent
    // ADD COLUMN IF NOT EXISTS guards above keep required columns present.
    // Run it deliberately when a MODEL changes (or to create tables on a fresh
    // DB): set DB_AUTO_SYNC=true for one boot, or use `npm run db:sync`.
    if (process.env.DB_AUTO_SYNC === 'true') {
      console.log('DB_AUTO_SYNC=true — running sequelize.sync({ alter: true })...');
      await sequelize.sync({ alter: true });
      console.log('✓ Database schema synced');
    } else {
      console.log('• Schema sync skipped (set DB_AUTO_SYNC=true to run sequelize.sync({ alter: true }))');
    }
  } catch (err) {
    console.error('✗ Database startup warning:', err.message);
    console.error('  Server will continue — run "npm run db:sync" manually if needed');
  }

  // Load demand cache (from static file).
  // Only prompt when running in an interactive terminal (local dev) — a headless
  // server (Railway, CI) has no TTY to answer, so it must never block on input.
  const demandCacheService = require('./services/demandCacheService');
  if (process.stdin.isTTY) {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => {
      rl.question('Load demand data? (y/N): ', ans => { rl.close(); resolve(ans); });
    });
    if (answer.toLowerCase() === 'y') {
      await demandCacheService.initialize();
    } else {
      console.log('[DemandCache] Skipped');
    }
  } else if (process.env.SIM_AUTOSTART === '0') {
    // Web role: load in the background — this service never settles revenue,
    // so it doesn't need the cache before serving. Pages come up immediately
    // after boot; the route picker shows demand as soon as the cache is
    // ready (~30-50s). The sim role still awaits below: settling flights
    // with a half-loaded cache would floor their revenue.
    console.log('[DemandCache] Web role — loading in background (pages serve immediately)');
    demandCacheService.initialize().catch(err =>
      console.error('[DemandCache] Background load failed:', err.message));
  } else {
    await demandCacheService.initialize();
  }

  // Redis bridge (service split): with REDIS_URL set, the web service's
  // Socket.IO attaches a Redis adapter so events published by the sim service
  // reach connected players; a sim-role process swaps global.io for a Redis
  // emitter. Without REDIS_URL everything behaves exactly as before (single
  // combined process, local emits).
  const SERVICE_ROLE = process.env.SIM_AUTOSTART === '1' ? 'sim'
    : process.env.SIM_AUTOSTART === '0' ? 'web' : 'combined';
  if (process.env.REDIS_URL) {
    try {
      const { createClient } = require('redis');
      const { createAdapter } = require('@socket.io/redis-adapter');
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      pubClient.on('error', (e) => console.error('[Redis] pub error:', e.message));
      subClient.on('error', (e) => console.error('[Redis] sub error:', e.message));
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      if (SERVICE_ROLE === 'sim') {
        const { Emitter } = require('@socket.io/redis-emitter');
        global.io = new Emitter(pubClient);
        console.log('[Redis] Sim role — global.io is a Redis emitter (events fan out via web service)');
      } else {
        console.log('[Redis] Socket.IO Redis adapter attached');
      }
    } catch (e) {
      console.error('[Redis] Setup failed — continuing with local Socket.IO only:', e.message);
    }
  } else if (SERVICE_ROLE !== 'combined') {
    console.warn(`[Redis] REDIS_URL not set on a ${SERVICE_ROLE}-role service — sim-emitted events will NOT reach players`);
  }

  // DB is ready (health endpoint goes healthy); the request gate stays closed
  // through the warming phase until the worlds have started and settled
  dbReady = true;
  appPhase = 'warming';
  console.log('✓ Server ready (warming up)');

  // Only show detailed startup message in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`
╔════════════════════════════════════════╗
║     Airline Control Server v1.0.0      ║
╠════════════════════════════════════════╣
║  Server running on port ${PORT}           ║
║  Environment: ${process.env.NODE_ENV || 'development'}              ║
║  WebSocket: enabled                    ║
╚════════════════════════════════════════╝
    `);
  }

  // Initialize airway routing graph (non-blocking, loads in background)
  airwayService.initialize();

  // Start world time service for all active worlds.
  // TTY-gated prompt (like the demand-data one): on local dev the simulation is
  // usually already running on the production server — running it here too
  // floods the remote DB (every request queues 5-8s behind tick queries) and
  // double-ticks the same worlds. Headless (Railway/CI) always starts it.
  // `npm run go` answers this via SIM_AUTOSTART (Test data → 1, Real data → 0);
  // a bare `npm run dev` in a terminal still gets the prompt.
  let runSimulation = true;
  if (process.env.SIM_AUTOSTART === '1') {
    runSimulation = true;
  } else if (process.env.SIM_AUTOSTART === '0') {
    runSimulation = false;
  } else if (process.stdin.isTTY) {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const simAnswer = await new Promise(resolve => {
      rl.question('Start world simulation? Skip when the production server is already ticking these worlds. (y/N): ', ans => { rl.close(); resolve(ans); });
    });
    runSimulation = simAnswer.toLowerCase() === 'y';
  }

  let worldStarted = false;
  if (runSimulation) {
    worldStarted = await worldTimeService.startAll();
    if (!worldStarted && process.env.NODE_ENV === 'development') {
      console.log('\n💡 Tip: Create a world with "npm run world:create"\n');
    }
    // Phase 5 data discipline: daily bounded-batch pruning (sim role only)
    require('./services/pruneService').start();
  } else {
    console.log('[WorldTime] Simulation skipped — this server is UI/API only (worlds tick elsewhere)');
    // Web role: serve game time from the DB mirror (sim persists clocks every
    // ~10s). Loaded before the gate opens so no request ever sees a null
    // clock and falls into a real-date fallback.
    await worldTimeService.startTimeMirror();
  }

  // Open the request gate. When the simulation is running headless (Railway),
  // hold a short warm-up after the worlds start so the first users don't land
  // in the initial processing burst (5-8s responses). Interactive local dev
  // (TTY) skips the wait, as does a sim-role service (no users to protect);
  // WARMUP_SECONDS overrides either way.
  const warmupSeconds = process.env.WARMUP_SECONDS !== undefined
    ? Math.max(0, parseInt(process.env.WARMUP_SECONDS) || 0)
    : (worldStarted && SERVICE_ROLE === 'combined' && !process.stdin.isTTY ? 30 : 0);
  if (warmupSeconds > 0) {
    console.log(`⏳ Warming up for ${warmupSeconds}s before opening to traffic...`);
    setTimeout(() => {
      appPhase = 'ready';
      console.log('✓ Warm-up complete — now serving traffic');
    }, warmupSeconds * 1000);
  } else {
    appPhase = 'ready';
  }

  // Pre-warm airport cache for all active worlds (non-blocking)
  if (worldStarted) {
    const { World } = require('./models');
    World.findAll({ where: { status: 'active' }, attributes: ['id'] }).then(worlds => {
      for (const world of worlds) {
        airportCacheService.fetchAndCacheAirports(world.id).then(airports => {
          // Airport cache warmed silently
        }).catch(err => {
          console.error(`[Airport Cache] Pre-warm failed for world ${world.id}:`, err.message);
        });
      }
    }).catch(() => {});
  }

  // Auto-delete completed worlds after 48 hours
  async function cleanupCompletedWorlds() {
    try {
      const { World } = require('./models');
      const { Op } = require('sequelize');

      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const expiredWorlds = await World.findAll({
        where: {
          status: 'completed',
          updatedAt: { [Op.lt]: cutoff }
        },
        attributes: ['id', 'name']
      });

      if (expiredWorlds.length === 0) return;

      for (const world of expiredWorlds) {
        try {
          // Stop the world time service if running
          worldTimeService.stopWorld(world.id);

          const worldId = world.id;

          await sequelize.transaction(async (t) => {
            await sequelize.query(`SET session_replication_role = 'replica'`, { transaction: t });

            const [mRows] = await sequelize.query(
              `SELECT id FROM world_memberships WHERE world_id = :worldId`,
              { replacements: { worldId }, transaction: t }
            );

            if (mRows.length > 0) {
              const mIds = mRows.map(r => r.id);

              const [rRows] = await sequelize.query(
                `SELECT id FROM routes WHERE world_membership_id IN (:mIds)`,
                { replacements: { mIds }, transaction: t }
              );
              const rIds = rRows.map(r => r.id);

              const [aRows] = await sequelize.query(
                `SELECT id FROM user_aircraft WHERE world_membership_id IN (:mIds)`,
                { replacements: { mIds }, transaction: t }
              );
              const aIds = aRows.map(r => r.id);

              if (rIds.length > 0) {
                await sequelize.query(`DELETE FROM scheduled_flights WHERE route_id IN (:rIds)`, { replacements: { rIds }, transaction: t });
              }
              if (aIds.length > 0) {
                await sequelize.query(`DELETE FROM scheduled_flights WHERE aircraft_id IN (:aIds)`, { replacements: { aIds }, transaction: t });
                await sequelize.query(`DELETE FROM recurring_maintenance WHERE aircraft_id IN (:aIds)`, { replacements: { aIds }, transaction: t });
              }
              await sequelize.query(`DELETE FROM routes WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
              await sequelize.query(`DELETE FROM user_aircraft WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
              await sequelize.query(`DELETE FROM pricing_defaults WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
              await sequelize.query(`DELETE FROM weekly_financials WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
              await sequelize.query(`DELETE FROM loans WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
              await sequelize.query(`DELETE FROM notifications WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
              await sequelize.query(`DELETE FROM airspace_restrictions WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
              await sequelize.query(`DELETE FROM marketing_campaigns WHERE world_membership_id IN (:mIds)`, { replacements: { mIds }, transaction: t });
              await sequelize.query(`DELETE FROM world_memberships WHERE world_id = :worldId`, { replacements: { worldId }, transaction: t });
            }

            await sequelize.query(`DELETE FROM used_aircraft_for_sale WHERE world_id = :worldId`, { replacements: { worldId }, transaction: t });
            await sequelize.query(`DELETE FROM worlds WHERE id = :worldId`, { replacements: { worldId }, transaction: t });

            await sequelize.query(`SET session_replication_role = 'origin'`, { transaction: t });
          });

          console.log(`[Cleanup] Deleted completed world "${world.name}" (${world.id}) — expired 48h after completion`);
        } catch (err) {
          console.error(`[Cleanup] Failed to delete world ${world.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[Cleanup] Error checking for expired worlds:', err.message);
    }
  }

  // Run cleanup once on startup, then every hour
  cleanupCompletedWorlds();
  setInterval(cleanupCompletedWorlds, 60 * 60 * 1000);
})();

// Graceful shutdown
let shuttingDown = false;
async function gracefulShutdown(signal) {
  if (shuttingDown) return; // ignore repeated signals
  shuttingDown = true;
  console.log(`\n\nReceived ${signal}, shutting down gracefully...`);

  // Backstop: force-exit if something hangs, so the port is always released and
  // nodemon can restart cleanly instead of hitting EADDRINUSE.
  const forceExit = setTimeout(() => {
    console.warn('Shutdown timed out — forcing exit');
    process.exit(1);
  }, 3000);
  forceExit.unref();

  try {
    await worldTimeService.stopAll();
  } catch (err) {
    console.error('Error during shutdown cleanup:', err.message);
  }

  // Close Socket.IO first so its persistent connections don't block server.close()
  io.close();

  server.close(() => {
    clearTimeout(forceExit);
    console.log('Server closed');
    process.exit(0);
  });

  // server.close() waits for existing keep-alive / Socket.IO connections to end,
  // which they won't on their own — so actively destroy them (Node 18.2+) to let
  // the close callback fire immediately and free port 3000 right away.
  if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = { app, server, io };
