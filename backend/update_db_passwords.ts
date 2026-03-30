import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, './src/.env') }); // try src too
dotenv.config({ path: path.resolve(__dirname, './.env') });

const config = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'omada_db',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(config);

async function migrate() {
    console.log('Connecting with config:', { ...config, password: '***' });
    const client = await pool.connect();
    try {
        console.log('Adding plain_password column to users table...');
        await client.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password VARCHAR(255);
        `);
        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
