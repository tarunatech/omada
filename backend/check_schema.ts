import pool from './src/db';
async function run() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'master_products'");
        console.log(res.rows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
