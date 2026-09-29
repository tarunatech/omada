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
            data: dataResult.rows.map(r => ({
                id: r.id,
                name: (r.name || '').toUpperCase(),
                type: (r.type || '').toUpperCase(),
                contact: (r.contact || '').toUpperCase(),
                status: r.status,
                createdAt: r.created_at
            })),
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
        if (!name || !name.trim()) return res.status(400).json({ error: 'Company name is required' });

        const cleanName = name.trim().toUpperCase();
        const cleanType = (type || '').trim().toUpperCase();
        const cleanContact = (contact || '').trim().toUpperCase();

        // Check if company already exists
        const existing = await pool.query(
            'SELECT id FROM master_companies WHERE LOWER(TRIM(name)) = LOWER($1)',
            [cleanName]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: `Company "${cleanName}" already exists in Master Data.` });
        }

        const result = await pool.query(
            'INSERT INTO master_companies (name, type, contact, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [cleanName, cleanType, cleanContact, status || 'Active']
        );
        res.status(201).json(mapRowsToCamelCase(result.rows)[0]);
    } catch (err: any) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Company with this name already exists in Master Data.' });
        }
        console.error('[MASTER COMPANY] Error creating:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateMasterCompany = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, type, contact, status } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Company name is required' });

        const cleanName = name.trim().toUpperCase();
        const cleanType = (type || '').trim().toUpperCase();
        const cleanContact = (contact || '').trim().toUpperCase();

        // Check if company already exists under different id
        const existing = await pool.query(
            'SELECT id FROM master_companies WHERE LOWER(TRIM(name)) = LOWER($1) AND id != $2',
            [cleanName, id]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: `Company "${cleanName}" already exists in Master Data.` });
        }

        const result = await pool.query(
            'UPDATE master_companies SET name = $1, type = $2, contact = $3, status = $4 WHERE id = $5 RETURNING *',
            [cleanName, cleanType, cleanContact, status || 'Active', id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Company not found' });
        res.json(mapRowsToCamelCase(result.rows)[0]);
    } catch (err: any) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Company with this name already exists in Master Data.' });
        }
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
        const search = (req.query.search as string || '').toLowerCase().trim();
        const company = (req.query.company as string || '').toLowerCase().trim();

        const conditions: string[] = [];
        const params: any[] = [];

        if (company && company !== 'all') {
            params.push(company);
            conditions.push(`LOWER(mp.company) = $${params.length}`);
        }

        if (search) {
            params.push(`%${search}%`);
            const pIdx = params.length;
            conditions.push(`(
                LOWER(mp.design) LIKE $${pIdx} OR 
                LOWER(mp.company) LIKE $${pIdx} OR 
                LOWER(COALESCE(mp.finish, '')) LIKE $${pIdx} OR 
                LOWER(COALESCE(mp.size, '')) LIKE $${pIdx} OR
                LOWER(COALESCE(mp.weight, '')) LIKE $${pIdx}
            )`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*) FROM master_products mp ${whereClause}`;
        let dataQuery = `
            SELECT mp.id, mp.company, mp.design, mp.finish, mp.size, mp.weight, mp.image, mp.created_at,
                   COALESCE(mp.total_quantity_used, 0) + COALESCE((
                       SELECT SUM(qi.qty::numeric)
                       FROM quotation_items qi
                       JOIN quotation_categories qc ON qi.category_id = qc.id
                       JOIN quotations q ON qc.quotation_id = q.id
                       WHERE LOWER(qi.company) = LOWER(mp.company) 
                         AND LOWER(qi.design) = LOWER(mp.design)
                         AND COALESCE(LOWER(qi.finish), '') = COALESCE(LOWER(mp.finish), '')
                         AND COALESCE(LOWER(qi.size), '') = COALESCE(LOWER(mp.size), '')
                         AND LOWER(q.status) = 'final'
                         AND q.type = 'OrderExport'
                   ), 0) as total_quantity_used
            FROM master_products mp
            ${whereClause}
        `;

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
            data: dataResult.rows.map(r => ({
                id: r.id,
                company: (r.company || '').toUpperCase(),
                design: (r.design || '').toUpperCase(),
                finish: (r.finish || '').toUpperCase(),
                size: (r.size || '').toUpperCase(),
                weight: (r.weight || '').toUpperCase(),
                image: r.image,
                createdAt: r.created_at,
                totalQuantityUsed: parseFloat(r.total_quantity_used || 0)
            })),
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
        const { company, design, finish, size, weight, image } = req.body;
        if (!company || !company.trim() || !design || !design.trim()) {
            return res.status(400).json({ error: 'Company and design are required' });
        }

        const cleanCompany = company.trim().toUpperCase();
        const cleanDesign = design.trim().toUpperCase();
        const cleanFinish = (finish || '').trim().toUpperCase();
        const cleanSize = (size || '').trim().toUpperCase();
        const cleanWeight = (weight || '').trim().toUpperCase() || null;

        // Check if specification already exists
        const existing = await pool.query(`
            SELECT id FROM master_products
            WHERE LOWER(TRIM(company)) = LOWER($1)
              AND LOWER(TRIM(design)) = LOWER($2)
              AND LOWER(TRIM(COALESCE(finish, ''))) = LOWER($3)
              AND LOWER(TRIM(COALESCE(size, ''))) = LOWER($4)
        `, [cleanCompany, cleanDesign, cleanFinish, cleanSize]);

        if (existing.rows.length > 0) {
            return res.status(409).json({ 
                error: `This specification (${cleanCompany} - ${cleanDesign}${cleanSize ? ` • ${cleanSize}` : ''}${cleanFinish ? ` • ${cleanFinish}` : ''}) already exists in Master Data.` 
            });
        }

        const result = await pool.query(
            'INSERT INTO master_products (company, design, finish, size, weight, image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [cleanCompany, cleanDesign, cleanFinish, cleanSize, cleanWeight, image]
        );
        res.status(201).json(mapRowsToCamelCase(result.rows)[0]);
    } catch (err: any) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'This specification already exists in Master Data.' });
        }
        console.error('[MASTER PRODUCT] Error creating:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateMasterProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { company, design, finish, size, weight, image } = req.body;
        if (!company || !company.trim() || !design || !design.trim()) {
            return res.status(400).json({ error: 'Company and design are required' });
        }

        const cleanCompany = company.trim().toUpperCase();
        const cleanDesign = design.trim().toUpperCase();
        const cleanFinish = (finish || '').trim().toUpperCase();
        const cleanSize = (size || '').trim().toUpperCase();
        const cleanWeight = (weight || '').trim().toUpperCase() || null;

        // Check if specification already exists under different id
        const existing = await pool.query(`
            SELECT id FROM master_products
            WHERE LOWER(TRIM(company)) = LOWER($1)
              AND LOWER(TRIM(design)) = LOWER($2)
              AND LOWER(TRIM(COALESCE(finish, ''))) = LOWER($3)
              AND LOWER(TRIM(COALESCE(size, ''))) = LOWER($4)
              AND id != $5
        `, [cleanCompany, cleanDesign, cleanFinish, cleanSize, id]);

        if (existing.rows.length > 0) {
            return res.status(409).json({ 
                error: `This specification (${cleanCompany} - ${cleanDesign}${cleanSize ? ` • ${cleanSize}` : ''}${cleanFinish ? ` • ${cleanFinish}` : ''}) already exists in Master Data.` 
            });
        }

        const result = await pool.query(
            'UPDATE master_products SET company = $1, design = $2, finish = $3, size = $4, weight = $5, image = $6 WHERE id = $7 RETURNING *',
            [cleanCompany, cleanDesign, cleanFinish, cleanSize, cleanWeight, image, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
        res.json(mapRowsToCamelCase(result.rows)[0]);
    } catch (err: any) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'This specification already exists in Master Data.' });
        }
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
