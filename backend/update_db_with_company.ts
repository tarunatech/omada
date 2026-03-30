import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432')
});

async function updateDb() {
  try {
    console.log('Adding company_name column to quotations table...');
    await pool.query("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS company_name TEXT");
    console.log('Column added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error updating database:', err);
    process.exit(1);
  }
}

updateDb();
