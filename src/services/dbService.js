/**
 * Database Service for PostgreSQL
 * Handles Gmail token persistence in PostgreSQL database
 */

import pg from 'pg';
const { Pool } = pg;

let pool = null;

/**
 * Initialize database connection pool
 */
export function initDatabase() {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.warn('⚠️  DATABASE_URL not configured. Gmail tokens will not persist across restarts.');
    return null;
  }

  try {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' && !databaseUrl.includes('localhost')
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('❌ Unexpected database error:', err);
    });

    console.log('✅ Database connection pool initialized');
    return pool;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    return null;
  }
}

/**
 * Get database pool instance
 */
function getPool() {
  if (!pool) {
    return initDatabase();
  }
  return pool;
}

/**
 * Save Gmail tokens to database
 * @param {Object} tokens - OAuth2 tokens object
 * @param {string} userId - User identifier (default: 'default_user')
 * @returns {Promise<boolean>}
 */
export async function saveGmailTokensToDb(tokens, userId = 'default_user') {
  const dbPool = getPool();
  
  if (!dbPool) {
    console.warn('⚠️  Database not available, tokens not saved');
    return false;
  }

  try {
    const query = `
      INSERT INTO gmail_tokens (
        user_id, 
        access_token, 
        refresh_token, 
        token_type, 
        expiry_date, 
        scope
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, gmail_tokens.refresh_token),
        token_type = EXCLUDED.token_type,
        expiry_date = EXCLUDED.expiry_date,
        scope = EXCLUDED.scope,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      userId,
      tokens.access_token,
      tokens.refresh_token || null,
      tokens.token_type || 'Bearer',
      tokens.expiry_date || null,
      tokens.scope || null,
    ];

    const result = await dbPool.query(query, values);
    
    console.log('💾 Gmail tokens saved to database');
    console.log(`   User: ${userId}`);
    console.log(`   Expiry: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'Not set'}`);
    console.log(`   Has refresh_token: ${!!tokens.refresh_token ? '✅' : '❌'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to save Gmail tokens to database:', error.message);
    return false;
  }
}

/**
 * Load Gmail tokens from database
 * @param {string} userId - User identifier (default: 'default_user')
 * @returns {Promise<Object|null>}
 */
export async function loadGmailTokensFromDb(userId = 'default_user') {
  const dbPool = getPool();
  
  if (!dbPool) {
    console.warn('⚠️  Database not available, cannot load tokens');
    return null;
  }

  try {
    const query = 'SELECT * FROM gmail_tokens WHERE user_id = $1';
    const result = await dbPool.query(query, [userId]);

    if (result.rows.length === 0) {
      console.log('📂 No Gmail tokens found in database');
      return null;
    }

    const row = result.rows[0];
    const tokens = {
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      token_type: row.token_type,
      expiry_date: row.expiry_date,
      scope: row.scope,
    };

    console.log('📂 Gmail tokens loaded from database');
    console.log(`   User: ${userId}`);
    console.log(`   Expiry: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'Not set'}`);
    console.log(`   Has refresh_token: ${!!tokens.refresh_token ? '✅' : '❌'}`);

    return tokens;
  } catch (error) {
    console.error('❌ Failed to load Gmail tokens from database:', error.message);
    return null;
  }
}

/**
 * Delete Gmail tokens from database
 * @param {string} userId - User identifier (default: 'default_user')
 * @returns {Promise<boolean>}
 */
export async function deleteGmailTokensFromDb(userId = 'default_user') {
  const dbPool = getPool();
  
  if (!dbPool) {
    console.warn('⚠️  Database not available');
    return false;
  }

  try {
    const query = 'DELETE FROM gmail_tokens WHERE user_id = $1';
    await dbPool.query(query, [userId]);
    
    console.log('🗑️  Gmail tokens deleted from database');
    console.log(`   User: ${userId}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to delete Gmail tokens from database:', error.message);
    return false;
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
export async function testDatabaseConnection() {
  const dbPool = getPool();
  
  if (!dbPool) {
    return false;
  }

  try {
    const result = await dbPool.query('SELECT NOW()');
    console.log('✅ Database connection test successful');
    console.log(`   Server time: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabaseConnection() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔌 Database connection pool closed');
  }
}
