const { Pool } = require('pg');
const { databaseUrl, production } = require('../config');
const pool = new Pool({ connectionString: databaseUrl, ssl: production ? { rejectUnauthorized: true } : undefined, max: 12, idleTimeoutMillis: 30000 });
pool.on('error', err => console.error('Unexpected PostgreSQL pool error', err));
module.exports = pool;
