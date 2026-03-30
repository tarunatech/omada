
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'omada_db',
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration...');

        await client.query('BEGIN');

        // Add columns if they don't exist
        await client.query(`
            ALTER TABLE sales_records 
            ADD COLUMN IF NOT EXISTS location VARCHAR(255),
            ADD COLUMN IF NOT EXISTS architect_company VARCHAR(255),
            ADD COLUMN IF NOT EXISTS interior_company VARCHAR(255),
            ADD COLUMN IF NOT EXISTS structural_engineer_company VARCHAR(255)
        `);

        await client.query('COMMIT');
        console.log('Migration successful!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
