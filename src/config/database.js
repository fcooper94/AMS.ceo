const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Route verbose Sequelize SQL logging to a file instead of the main console
const logsDir = path.join(__dirname, '..', '..', 'logs');
fs.mkdirSync(logsDir, { recursive: true });
const sqlLogStream = fs.createWriteStream(path.join(logsDir, 'sql.log'), { flags: 'a' });
const sqlLogger = (msg) => sqlLogStream.write(`${new Date().toISOString()} ${msg}\n`);

// Support both Railway's DATABASE_URL and individual connection parameters
// Auto-size pool: query Postgres max_connections at boot, reserve 80% for our
// app (leaving 20% for Railway internal connections, pg_dump, manual psql, etc.)
// Falls back to 15 if the query fails.
let poolMax = parseInt(process.env.DB_POOL_MAX) || 15;
async function autoSizePool(seq) {
  // Explicit per-service budget (Phase 4): with multiple sim workers the
  // 80%-of-max auto-size would let each worker take 80 connections and
  // exhaust Postgres. Set DB_POOL_MAX per service (e.g. web 60, worker 40,
  // total < max_connections) and the auto-size is skipped entirely.
  const envMax = parseInt(process.env.DB_POOL_MAX);
  if (Number.isFinite(envMax) && envMax > 0) {
    seq.config.pool.max = envMax;
    console.log(`✓ DB pool set from DB_POOL_MAX: ${envMax}`);
    return;
  }
  try {
    const [result] = await seq.query("SHOW max_connections", { type: 'SELECT' });
    const maxConn = parseInt(result?.max_connections) || 100;
    const target = Math.min(Math.floor(maxConn * 0.8), maxConn - 10); // 80%, but always leave 10
    const clamped = Math.max(5, Math.min(target, 80)); // floor 5, cap 80 (diminishing returns)
    if (clamped !== seq.config.pool.max) {
      seq.config.pool.max = clamped;
      console.log(`✓ DB pool auto-sized to ${clamped} (Postgres max_connections: ${maxConn})`);
    }
  } catch (err) {
    console.log(`ℹ DB pool auto-size skipped (${err.message}), using ${seq.config.pool.max}`);
  }
}

let sequelize;

if (process.env.DATABASE_URL) {
  // Detect Railway private networking (internal URLs use .railway.internal)
  // Also skip SSL for localhost connections
  const isPrivateNetwork = process.env.DATABASE_URL.includes('.railway.internal') ||
    process.env.DATABASE_URL.includes('localhost') ||
    process.env.DATABASE_URL.includes('127.0.0.1');

  // Use Railway's connection string
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? sqlLogger : false,
    dialectOptions: {
      // Only use SSL for public proxy connections, not private networking
      ...(isPrivateNetwork ? {} : {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }),
      // Keep connection alive
      keepAlive: true,
      statement_timeout: 30000,
      idle_in_transaction_session_timeout: 60000
    },
    pool: {
      max: 15,  // 5 worlds tick processing + API requests need headroom
      min: 2,
      acquire: 60000,
      idle: 10000,
      evict: 1000  // Check for stale connections every second
    },
    retry: {
      max: 3,  // Retry failed queries up to 3 times
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /Connection terminated/,
        /ECONNRESET/
      ]
    }
  });
} else {
  // Use individual connection parameters for local development
  sequelize = new Sequelize(
    process.env.DB_NAME || 'airline_control',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false, // Disable all SQL query logging
      pool: {
        max: 15,
        min: 2,
        acquire: 60000,
        idle: 10000,
        evict: 1000
      },
      retry: {
        max: 3,
        match: [
          /SequelizeConnectionError/,
          /SequelizeConnectionRefusedError/,
          /Connection terminated/,
          /ECONNRESET/
        ]
      }
    }
  );
}

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');
    await autoSizePool(sequelize);
  } catch (error) {
    console.error('✗ Unable to connect to database:', error.message);
  }
};

testConnection();

module.exports = sequelize;