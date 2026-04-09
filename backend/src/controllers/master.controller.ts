import { Request, Response } from 'express';
import pool from '../db';
import { mapRowsToCamelCase } from '../utils';

// Companies
export const getMasterCompanies = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        const search = (req.query.search as string || '').toLowerCase();

        let countQuery = 'SELECT COUNT(*) FROM master_companies';
        let dataQuery = 'SELECT * FROM master_companies';
        const params: any[] = [];

        if (search) {
            countQuery += ' WHERE LOWER(name) LIKE $1';
            dataQuery += ' WHERE LOWER(name) LIKE $1';
            params.push(`%${search}%`);
        }

        dataQuery += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        const dataParams = [...params, limit, offset];

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, params),
            pool.query(dataQuery, dataParams)
        ]);

        const totalItems = parseInt(countResult.rows[0].count);
        
        res.json({
            data: mapRowsToCamelCase(dataResult.rows),
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (err) {
        console.error('[MASTER COMPANY] Error fetching:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const createMasterCompany = async (req: Request, res: Response) => {
    try {
        const { name, type, contact, status } = req.body;
        if (!name) return res.status(400).json({ error: 'Company name is required' });

        const result = await pool.query(
            'INSERT INTO master_companies (name, type, contact, status) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type, contact = EXCLUDED.contact, status = EXCLUDED.status RETURNING *',
            [name, type, contact, status || 'Active']
        );
        res.status(201).json(mapRowsToCamelCase(result.rows)[0]);
    } catch (err) {
        console.error('[MASTER COMPANY] Error creating:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateMasterCompany = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, type, contact, status } = req.body;
        const result = await pool.query(
            'UPDATE master_companies SET name = $1, type = $2, contact = $3, status = $4 WHERE id = $5 RETURNING *',
            [name, type, contact, status, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Company not found' });
        res.json(mapRowsToCamelCase(result.rows)[0]);
    } catch (err) {
        console.error('[MASTER COMPANY] Error updating:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteMasterCompany = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM master_companies WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Company not found' });
        res.json({ message: 'Company deleted' });
    } catch (err) {
        console.error('[MASTER COMPANY] Error deleting:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Products / Designs
export const getMasterProducts = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        const sortBy = req.query.sortBy as string;
        const search = (req.query.search as string || '').toLowerCase();

        let countQuery = 'SELECT COUNT(*) FROM master_products mp';
        let dataQuery = `
            SELECT mp.id, mp.company, mp.design, mp.finish, mp.size, mp.image, mp.created_at,
                   COALESCE((
                       SELECT SUM(qi.qty::numeric)
                       FROM quotation_items qi
                       JOIN quotation_categories qc ON qi.category_id = qc.id
                       JOIN quotations q ON qc.quotation_id = q.id
                       WHERE LOWER(qi.company) = LOWER(mp.company) 
                         AND LOWER(qi.design) = LOWER(mp.design)
                         AND COALESCE(LOWER(qi.finish), '') = COALESCE(LOWER(mp.finish), '')
                         AND COALESCE(LOWER(qi.size), '') = COALESCE(LOWER(mp.size), '')
                         AND LOWER(q.status) = 'final'
                   ), 0) as total_quantity_used
            FROM master_products mp
        `;
        const params: any[] = [];

        if (search) {
            countQuery += ' WHERE LOWER(mp.design) LIKE $1 OR LOWER(mp.company) LIKE $1';
            dataQuery += ' WHERE LOWER(mp.design) LIKE $1 OR LOWER(mp.company) LIKE $1';
            params.push(`%${search}%`);
        }

        let orderBy = 'mp.design ASC';
        if (sortBy === 'usage') {
            orderBy = 'total_quantity_used DESC, mp.design ASC';
        } else if (sortBy === 'newest') {
            orderBy = 'mp.created_at DESC';
        }

        dataQuery += ` ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        const dataParams = [...params, limit, offset];

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, params),
            pool.query(dataQuery, dataParams)
        ]);

        const totalItems = parseInt(countResult.rows[0].count);

        res.json({
            data: mapRowsToCamelCase(dataResult.rows),
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (err) {
        console.error('[MASTER PRODUCT] Error fetching:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const createMasterProduct = async (req: Request, res: Response) => {
    try {
        const { company, design, finish, size, image } = req.body;
        if (!company || !design) return res.status(400).json({ error: 'Company and design are required' });

        const result = await pool.query(
            'INSERT INTO master_products (company, design, finish, size, image) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (company, design, finish, size) DO UPDATE SET image = COALESCE(EXCLUDED.image, master_products.image) RETURNING *',
            [company, design, finish, size, image]
        );
        res.status(201).json(mapRowsToCamelCase(result.rows)[0]);
    } catch (err) {
        console.error('[MASTER PRODUCT] Error creating:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateMasterProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { company, design, finish, size, image } = req.body;
        const result = await pool.query(
            'UPDATE master_products SET company = $1, design = $2, finish = $3, size = $4, image = $5 WHERE id = $6 RETURNING *',
            [company, design, finish, size, image, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
        res.json(mapRowsToCamelCase(result.rows)[0]);
    } catch (err) {
        console.error('[MASTER PRODUCT] Error updating:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteMasterProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM master_products WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted' });
    } catch (err) {
        console.error('[MASTER PRODUCT] Error deleting:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
