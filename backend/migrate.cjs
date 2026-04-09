
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
        console.log('Updating sales_records table...');
        await client.query(`
            ALTER TABLE sales_records 
            ADD COLUMN IF NOT EXISTS location VARCHAR(255),
            ADD COLUMN IF NOT EXISTS architect_company VARCHAR(255),
            ADD COLUMN IF NOT EXISTS interior_company VARCHAR(255),
            ADD COLUMN IF NOT EXISTS structural_engineer_company VARCHAR(255),
            ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS another_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS another_contact VARCHAR(255),
            ADD COLUMN IF NOT EXISTS salesman_name VARCHAR(255)
        `);

        console.log('Updating quotations table...');
        await client.query(`
            ALTER TABLE quotations 
            ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS company_name TEXT,
            ADD COLUMN IF NOT EXISTS include_gst BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS extra_terms TEXT,
            ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Quotation'
        `);

        console.log('Updating quotation_items table...');
        await client.query('ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS boxes VARCHAR(50)');

        console.log('Updating users table...');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password VARCHAR(255)');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_department VARCHAR(50)');

        console.log('Ensuring order sequences exist...');
        await client.query('CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001');
        await client.query('CREATE SEQUENCE IF NOT EXISTS export_order_number_seq START 1001');

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
