const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Route verbose Sequelize SQL logging to a file instead of the main console
const logsDir = path.join(__dirname, '..', '..', 'logs');
fs.mkdirSync(logsDir, { recursive: true });
const sqlLogStream = fs.createWriteStream(path.join(logsDir, 'sql.log'), { flags: 'a' });
const sqlLogger = (msg) => sqlLogStream.write(`${new Date().toISOString()} ${msg}\n`);

// Support both Railway's DATABASE_URL and individual connection parameters
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
  } catch (error) {
    console.error('✗ Unable to connect to database:', error.message);
  }
};

testConnection();

module.exports = sequelize;