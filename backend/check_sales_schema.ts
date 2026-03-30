import pool from './src/db';
import fs from 'fs';
async function run() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sales_records'");
        const columns = res.rows.map(r => r.column_name);
        fs.writeFileSync('schema_log.json', JSON.stringify(res.rows, null, 2));
        console.log('Columns in sales_records:', columns);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
