import pool from './src/db';

async function run() {
    try {
        console.log('Adding missing columns to sales_records...');
        await pool.query("ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS another_name VARCHAR(255)");
        await pool.query("ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS another_contact VARCHAR(255)");
        await pool.query("ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS salesman_name VARCHAR(255)");
        
        console.log('Adding extra columns to quotations and items...');
        await pool.query("ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS boxes DECIMAL(15,2) DEFAULT 0");
        await pool.query("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS extra_terms TEXT");
        
        console.log('Successfully updated schema.');
    } catch(e) {
        console.error('Error adding columns:', e);
    }
    process.exit(0);
}
run();
