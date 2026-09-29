const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

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

        // 1. Run base schema if schema.sql exists or create initial tables
        const schemaPath = path.join(__dirname, 'db', 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            console.log('Applying base schema from db/schema.sql...');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            await client.query(schemaSql);
        }

        // 2. Incremental column checks to support migrations on existing DBs
        console.log('Ensuring all columns exist in users...');
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'User',
            ADD COLUMN IF NOT EXISTS selected_department VARCHAR(50),
            ADD COLUMN IF NOT EXISTS plain_password VARCHAR(255);
        `);

        console.log('Ensuring all columns exist in sales_records...');
        await client.query(`
            ALTER TABLE sales_records 
            ADD COLUMN IF NOT EXISTS location VARCHAR(255),
            ADD COLUMN IF NOT EXISTS architect_company VARCHAR(255),
            ADD COLUMN IF NOT EXISTS interior_company VARCHAR(255),
            ADD COLUMN IF NOT EXISTS structural_engineer_company VARCHAR(255),
            ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS another_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS another_contact VARCHAR(255),
            ADD COLUMN IF NOT EXISTS salesman_name VARCHAR(255);
        `);

        console.log('Ensuring all columns exist in quotations...');
        await client.query(`
            ALTER TABLE quotations 
            ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS company_name TEXT,
            ADD COLUMN IF NOT EXISTS include_gst BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS extra_terms TEXT,
            ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Quotation';
        `);

        console.log('Ensuring all columns exist in quotation_items...');
        await client.query(`
            ALTER TABLE quotation_items 
            ADD COLUMN IF NOT EXISTS boxes DECIMAL(15, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS weight VARCHAR(100);
        `);

        console.log('Ensuring all columns exist in master_products...');
        await client.query(`
            ALTER TABLE master_products 
            ADD COLUMN IF NOT EXISTS weight VARCHAR(100);
        `);

        console.log('Ensuring sequences exist...');
        await client.query('CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001');
        await client.query('CREATE SEQUENCE IF NOT EXISTS quotation_number_seq START 1001');
        await client.query('CREATE SEQUENCE IF NOT EXISTS sample_number_seq START 1001');

        console.log('Ensuring performance indexes exist...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_sales_records_dept ON sales_records(dept);
            CREATE INDEX IF NOT EXISTS idx_sales_records_created_by ON sales_records(created_by);
            CREATE INDEX IF NOT EXISTS idx_follow_ups_sales_record_id ON follow_ups(sales_record_id);
            CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
            CREATE INDEX IF NOT EXISTS idx_quotations_type ON quotations(type);
            CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON quotations(created_by);
            CREATE INDEX IF NOT EXISTS idx_quotation_categories_quotation_id ON quotation_categories(quotation_id);
            CREATE INDEX IF NOT EXISTS idx_quotation_items_category_id ON quotation_items(category_id);
            CREATE INDEX IF NOT EXISTS idx_master_products_company_design ON master_products(company, design);
            CREATE INDEX IF NOT EXISTS idx_master_products_created_at ON master_products (created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_master_companies_created_at ON master_companies (created_at DESC);
        `);

        await client.query('COMMIT');
        console.log('✅ Migration completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
