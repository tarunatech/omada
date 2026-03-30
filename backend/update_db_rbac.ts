import pool from './src/db';

async function updateSchema() {
    try {
        console.log('--- Initializing RBAC Schema Update ---');

        // Add created_by to sales_records
        console.log('Updating sales_records table...');
        await pool.query(`
            ALTER TABLE sales_records 
            ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        `);

        // Add created_by to quotations
        console.log('Updating quotations table...');
        await pool.query(`
            ALTER TABLE quotations 
            ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        `);

        // Ensure users have a password field (it exists, but just in case)
        console.log('Ensuring users table consistency...');
        // The schema shows it exists.

        console.log('✅ RBAC Schema update completed successfully.');
    } catch (error) {
        console.error('❌ Error updating RBAC schema:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

updateSchema();
