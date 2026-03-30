/**
 * Database Migration Script for Railway
 * Runs the init.sql schema on Railway PostgreSQL
 */

import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to Railway PostgreSQL...');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false
  });

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Running migration script...');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Database schema initialized');
    
    // Verify the table was created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'gmail_tokens'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ gmail_tokens table verified');
    } else {
      console.log('⚠️  gmail_tokens table not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
