const { Sequelize } = require('sequelize');

// Support both Railway's DATABASE_URL and individual connection parameters
let sequelize;

if (process.env.DATABASE_URL) {
  // Detect Railway private networking (internal URLs use .railway.internal)
  const isPrivateNetwork = process.env.DATABASE_URL.includes('.railway.internal');

  // Use Railway's connection string
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
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
      max: 5,  // Reduced from 10 to prevent exhaustion
      min: 0,
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
        max: 5,
        min: 0,
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