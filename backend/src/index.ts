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
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : [
        'http://localhost:8081',
        'http://localhost:8080',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:8081',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
    ];

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        
        // Allow any localhost or 127.0.0.1 origin or explicitly allowed origins
        if (
            origin.startsWith('http://localhost:') || 
            origin.startsWith('http://127.0.0.1:') || 
            origin.startsWith('https://localhost:') ||
            allowedOrigins.includes(origin)
        ) {
            return callback(null, true);
        }
        
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'x-admin-password',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
    ],
    exposedHeaders: ['Content-Length', 'x-admin-password']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

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

        // Automatic schema migrations & deduplication
        await client.query(`
            ALTER TABLE master_products ADD COLUMN IF NOT EXISTS weight VARCHAR(100);
            ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS weight VARCHAR(100);

            -- Merge data for duplicate master products
            UPDATE master_products a
            SET 
                image = COALESCE(a.image, b.image),
                weight = COALESCE(a.weight, b.weight)
            FROM master_products b
            WHERE a.id > b.id
              AND LOWER(TRIM(a.company)) = LOWER(TRIM(b.company))
              AND LOWER(TRIM(a.design)) = LOWER(TRIM(b.design))
              AND LOWER(TRIM(COALESCE(a.finish, ''))) = LOWER(TRIM(COALESCE(b.finish, '')))
              AND LOWER(TRIM(COALESCE(a.size, ''))) = LOWER(TRIM(COALESCE(b.size, '')));

            -- Remove duplicate master products
            DELETE FROM master_products a
            USING master_products b
            WHERE a.id < b.id
              AND LOWER(TRIM(a.company)) = LOWER(TRIM(b.company))
              AND LOWER(TRIM(a.design)) = LOWER(TRIM(b.design))
              AND LOWER(TRIM(COALESCE(a.finish, ''))) = LOWER(TRIM(COALESCE(b.finish, '')))
              AND LOWER(TRIM(COALESCE(a.size, ''))) = LOWER(TRIM(COALESCE(b.size, '')));

            -- Ensure unique index for master products
            CREATE UNIQUE INDEX IF NOT EXISTS master_products_ci_unique_idx
            ON master_products (
                LOWER(TRIM(company)),
                LOWER(TRIM(design)),
                LOWER(TRIM(COALESCE(finish, ''))),
                LOWER(TRIM(COALESCE(size, '')))
            );

            -- Remove duplicate companies
            DELETE FROM master_companies a
            USING master_companies b
            WHERE a.id < b.id
              AND LOWER(TRIM(a.name)) = LOWER(TRIM(b.name));

            -- Ensure unique index for master companies
            CREATE UNIQUE INDEX IF NOT EXISTS master_companies_ci_name_idx
            ON master_companies (
                LOWER(TRIM(name))
            );

            -- Normalize existing database records to UPPERCASE for consistency
            UPDATE quotations
            SET customer_name = UPPER(TRIM(customer_name)),
                company_name = UPPER(TRIM(company_name)),
                sales_ref = UPPER(TRIM(sales_ref)),
                site_address = UPPER(TRIM(site_address)),
                reference_info = UPPER(TRIM(reference_info)),
                extra_terms = UPPER(TRIM(extra_terms))
            WHERE customer_name IS NOT NULL;

            UPDATE quotation_categories
            SET name = UPPER(TRIM(name))
            WHERE name IS NOT NULL;

            UPDATE quotation_items
            SET company = UPPER(TRIM(company)),
                design = UPPER(TRIM(design)),
                finish = UPPER(TRIM(finish)),
                size = UPPER(TRIM(size)),
                weight = UPPER(TRIM(weight))
            WHERE design IS NOT NULL;

            UPDATE master_companies
            SET name = UPPER(TRIM(name)),
                type = UPPER(TRIM(type))
            WHERE name IS NOT NULL;

            UPDATE master_products
            SET company = UPPER(TRIM(company)),
                design = UPPER(TRIM(design)),
                finish = UPPER(TRIM(finish)),
                size = UPPER(TRIM(size)),
                weight = UPPER(TRIM(weight))
            WHERE design IS NOT NULL;

            UPDATE sales_records
            SET site_name = UPPER(TRIM(site_name)),
                firm_name = UPPER(TRIM(firm_name)),
                contractor_owner_name = UPPER(TRIM(contractor_owner_name)),
                customer_name = UPPER(TRIM(customer_name)),
                authorized_person_name = UPPER(TRIM(authorized_person_name)),
                architect_name = UPPER(TRIM(architect_name)),
                interior_designer_name = UPPER(TRIM(interior_designer_name)),
                structural_engineer_name = UPPER(TRIM(structural_engineer_name)),
                supervisor_name = UPPER(TRIM(supervisor_name)),
                pmc_name = UPPER(TRIM(pmc_name)),
                purchase_person_name = UPPER(TRIM(purchase_person_name)),
                location = UPPER(TRIM(location)),
                address = UPPER(TRIM(address)),
                notes = UPPER(TRIM(notes)),
                salesman_name = UPPER(TRIM(salesman_name))
            WHERE id IS NOT NULL;
        `);
        console.log('Database schema, uniqueness & uppercase normalization verified');

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
 
