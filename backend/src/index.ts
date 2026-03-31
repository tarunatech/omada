import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import salesRoutes from './routes/sales.routes';
import quotationsRoutes from './routes/quotations.routes';
import dashboardRoutes from './routes/dashboard.routes';
import authRoutes from './routes/auth.routes';
import masterRoutes from './routes/master.routes';
import pool from './db';

dotenv.config();

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 5000;

const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images

// Routes
app.use('/api/sales', salesRoutes);
app.use('/api/quotations', quotationsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Initialize database
const initDb = async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to PostgreSQL');
        client.release();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Database connection error', err);
        process.exit(1);
    }
};

initDb();
 
