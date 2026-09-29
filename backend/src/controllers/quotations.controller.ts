import { Request, Response } from 'express';
import pool from '../db';
import { syncProductToMaster, updateProductUsage } from '../utils';

export const getQuotations = async (req: Request, res: Response) => {
    try {
        const { type, status } = req.query;
        const search = (req.query.search as string || '').toLowerCase();
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const user = (req as any).user;
        const rawCreatedBy = req.query.createdBy as string;
        const targetUserId = (rawCreatedBy === 'undefined' || isNaN(parseInt(rawCreatedBy))) ? null : parseInt(rawCreatedBy);

        const conditions: string[] = [];
        const params: any[] = [];

        if (type) {
            conditions.push(`q.type = $${params.length + 1}`);
            params.push(type);
        }

        if (status && status !== 'All' && status !== 'all') {
            conditions.push(`LOWER(TRIM(q.status)) = LOWER(TRIM($${params.length + 1}))`);
            params.push(status);
        }

        if (user.role === 'Admin' && targetUserId) {
            conditions.push(`q.created_by = $${params.length + 1}`);
            params.push(targetUserId);
        } else if (user.role !== 'Admin') {
            conditions.push(`q.created_by = $${params.length + 1}`);
            params.push(user.id);
        }

        if (search) {
            const pIndex = params.length + 1;
            conditions.push(`(
                LOWER(q.customer_name) LIKE $${pIndex} OR 
                LOWER(q.id) LIKE $${pIndex} OR 
                LOWER(COALESCE(q.company_name, '')) LIKE $${pIndex} OR 
                LOWER(q.mobile) LIKE $${pIndex} OR
                LOWER(COALESCE(q.sales_ref, '')) LIKE $${pIndex} OR
                LOWER(COALESCE(q.site_address, '')) LIKE $${pIndex} OR
                LOWER(COALESCE(q.reference_info, '')) LIKE $${pIndex} OR
                EXISTS (
                    SELECT 1 FROM quotation_items qi
                    JOIN quotation_categories qc ON qi.category_id = qc.id
                    WHERE qc.quotation_id = q.id AND (
                        LOWER(qi.design) LIKE $${pIndex} OR
                        LOWER(qi.company) LIKE $${pIndex} OR
                        LOWER(qi.finish) LIKE $${pIndex} OR
                        LOWER(COALESCE(qi.size, '')) LIKE $${pIndex}
                    )
                )
            )`);
            params.push(`%${search}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*) FROM quotations q ${whereClause}`;

        const queryStr = `
            SELECT q.*, 
            COALESCE(
              (SELECT json_agg(json_build_object(
                'id', c.id,
                'name', c.name,
                'items', COALESCE(
                  (SELECT json_agg(i) FROM quotation_items i WHERE i.category_id = c.id),
                  '[]'
                )
              )) FROM quotation_categories c WHERE c.quotation_id = q.id),
              '[]'
            ) as categories
            FROM quotations q
            ${whereClause}
            ORDER BY (CASE WHEN LOWER(TRIM(q.status)) = 'final' THEN 0 ELSE 1 END) ASC, q.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        const dataParams = [...params, limit, offset];

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, params),
            pool.query(queryStr, dataParams)
        ]);

        const totalItems = parseInt(countResult.rows[0].count);

        const records = dataResult.rows.map(row => ({
            id: row.id,
            customerName: (row.customer_name || '').toUpperCase(),
            companyName: (row.company_name || '').toUpperCase(),
            mobile: row.mobile,
            salesRef: (row.sales_ref || '').toUpperCase(),
            date: row.date,
            grandTotal: parseFloat(row.grand_total || 0),
            siteAddress: (row.site_address || '').toUpperCase(),
            referenceInfo: (row.reference_info || '').toUpperCase(),
            customerLogo: row.customer_logo,
            status: row.status,
            type: row.type || 'Quotation',
            includeGst: row.include_gst || false,
            extraTerms: (row.extra_terms || '').toUpperCase(),
            categories: row.categories.map((cat: any) => ({
                id: cat.id,
                name: (cat.name || '').toUpperCase(),
                items: (cat.items || []).map((it: any) => ({
                    id: it.id,
                    company: (it.company || '').toUpperCase(),
                    design: (it.design || '').toUpperCase(),
                    finish: (it.finish || '').toUpperCase(),
                    size: (it.size || '').toUpperCase(),
                    weight: (it.weight || '').toUpperCase(),
                    multiplier: parseFloat(it.multiplier || 16),
                    qty: parseFloat(it.qty || 0),
                    unitPrice: parseFloat(it.unit_price || 0),
                    total: parseFloat(it.total || 0),
                    image: it.image,
                    boxes: parseFloat(it.boxes || 0)
                }))
            }))
        }));

        res.json({
            data: records,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (err) {
        console.error('[QUOTATION] Error fetching:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const createQuotation = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const {
            id, customerName, companyName, mobile, salesRef, date, grandTotal,
            categories, siteAddress, referenceInfo, customerLogo, status, includeGst, type, extraTerms
        } = req.body;

        if (!id || !customerName) {
            return res.status(400).json({ error: 'Quotation ID and Customer Name are required' });
        }

        await client.query('BEGIN');

        const user = (req as any).user;
        // Server-side ID generation to prevent collisions
        let finalId = id;
        
        // Check if we should generate a new server-side ID
        const shouldGenerateId = !id || 
            (id.startsWith('Q-') && !id.startsWith('Quotation-')) || // Only Q- (quotations), not Quotation- (exported orders)
            id.startsWith('S-') || 
            id.startsWith('ORD-') || 
            (type === 'OrderExport' && !id.startsWith('Quotation-'));

        if (shouldGenerateId) {
            if (type === 'Sample') {
                const seqResult = await client.query("SELECT nextval('sample_number_seq') as num");
                finalId = `S-${seqResult.rows[0].num}`;
            } else if (type === 'OrderExport') {
                const seqResult = await client.query("SELECT nextval('order_number_seq') as num"); 
                finalId = `ORD-${seqResult.rows[0].num}`;
            } else {
                const seqResult = await client.query("SELECT nextval('quotation_number_seq') as num");
                finalId = `Q-${seqResult.rows[0].num}`;
            }
        }

        const insertQuotationQuery = `
          INSERT INTO quotations (
            id, customer_name, company_name, mobile, sales_ref, date, grand_total, 
            site_address, reference_info, customer_logo, status, include_gst, type, extra_terms,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `;

        await client.query(insertQuotationQuery, [
            finalId, 
            customerName?.trim().toUpperCase() || '', 
            companyName?.trim().toUpperCase() || '', 
            mobile?.trim() || '', 
            salesRef?.trim().toUpperCase() || '', 
            date, 
            grandTotal,
            siteAddress?.trim().toUpperCase() || '', 
            referenceInfo?.trim().toUpperCase() || '', 
            customerLogo, 
            status, 
            includeGst || false, 
            type || 'Quotation', 
            extraTerms?.trim().toUpperCase() || '',
            user.id
        ]);

        if (categories && categories.length > 0) {
            for (const cat of categories) {
                const catResult = await client.query(
                    'INSERT INTO quotation_categories (quotation_id, name) VALUES ($1, $2) RETURNING id',
                    [finalId, cat.name?.trim().toUpperCase() || '']
                );
                const categoryId = catResult.rows[0].id;

                if (cat.items && cat.items.length > 0) {
                    for (const item of cat.items) {
                        const cleanCompany = item.company?.trim().toUpperCase() || '';
                        const cleanDesign = item.design?.trim().toUpperCase() || '';
                        const cleanFinish = item.finish?.trim().toUpperCase() || '';
                        const cleanSize = item.size?.trim().toUpperCase() || '';
                        const cleanWeight = item.weight?.trim().toUpperCase() || '';

                        await client.query(
                            `INSERT INTO quotation_items (
                                category_id, company, design, finish, size, multiplier, qty, unit_price, total, image, boxes, weight
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                            [
                                categoryId, 
                                cleanCompany, 
                                cleanDesign, 
                                cleanFinish,
                                cleanSize, 
                                item.multiplier || 16, 
                                item.qty || 0, 
                                item.unitPrice || 0, 
                                item.total || 0, 
                                item.image || null, 
                                item.boxes || 0,
                                cleanWeight
                            ]
                        );

                        // Auto-save to master_products
                        await syncProductToMaster(client, {
                            ...item,
                            company: cleanCompany,
                            design: cleanDesign,
                            finish: cleanFinish,
                            size: cleanSize,
                            weight: cleanWeight
                        }, 'CREATE');

                        // If starting as Final, update usage
                        if (status === 'Final') {
                            await updateProductUsage(client, item, parseFloat(item.qty || 0));
                        }
                    }
                }
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ id: finalId, message: 'Quotation created' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[CREATE QUOTATION] Error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

export const updateQuotation = async (req: Request, res: Response) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const {
            customerName, companyName, mobile, salesRef, date, grandTotal,
            categories, siteAddress, referenceInfo, customerLogo, status, includeGst, type, extraTerms
        } = req.body;

        await client.query('BEGIN');

        // Get old status to handle usage count if transitioning
        const oldQuotation = await client.query('SELECT status FROM quotations WHERE id = $1', [id]);
        if (oldQuotation.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Quotation not found' });
        }
        const oldStatus = oldQuotation.rows[0].status;

        // IF it was already Final, subtract old quantities BEFORE we delete them from quotation_items
        if (oldStatus === 'Final') {
            const oldItems = await client.query(`
                SELECT i.company, i.design, i.finish, i.size, i.qty 
                FROM quotation_items i
                JOIN quotation_categories c ON i.category_id = c.id
                WHERE c.quotation_id = $1
            `, [id]);
            for (const item of oldItems.rows) {
                await updateProductUsage(client, item, -parseFloat(item.qty || 0));
            }
        }

        const user = (req as any).user;
        const updateQuotationQuery = `
          UPDATE quotations SET 
            customer_name = $1, company_name = $2, mobile = $3, sales_ref = $4, date = $5, grand_total = $6, 
            site_address = $7, reference_info = $8, customer_logo = $9, status = $10, include_gst = $11, type = $12, extra_terms = $13
          WHERE id = $14 ${user.role !== 'Admin' ? 'AND created_by = $15' : ''}
        `;

        const queryParams: any[] = [
            customerName?.trim().toUpperCase() || '', 
            companyName?.trim().toUpperCase() || '', 
            mobile?.trim() || '', 
            salesRef?.trim().toUpperCase() || '', 
            date, 
            grandTotal, 
            siteAddress?.trim().toUpperCase() || '', 
            referenceInfo?.trim().toUpperCase() || '', 
            customerLogo, 
            status, 
            includeGst || false, 
            type || 'Quotation', 
            extraTerms?.trim().toUpperCase() || '', 
            id
        ];

        if (user.role !== 'Admin') {
            queryParams.push(user.id);
        }

        const result = await client.query(updateQuotationQuery, queryParams);
        
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Quotation not found or unauthorized' });
        }

        // Simple approach: delete categories (will delete items due to CASCADE) and re-insert
        await client.query('DELETE FROM quotation_categories WHERE quotation_id = $1', [id]);

        if (categories && categories.length > 0) {
            for (const cat of categories) {
                const catResult = await client.query(
                    'INSERT INTO quotation_categories (quotation_id, name) VALUES ($1, $2) RETURNING id',
                    [id, cat.name?.trim().toUpperCase() || '']
                );
                const categoryId = catResult.rows[0].id;

                if (cat.items && cat.items.length > 0) {
                    for (const item of cat.items) {
                        const cleanCompany = item.company?.trim().toUpperCase() || '';
                        const cleanDesign = item.design?.trim().toUpperCase() || '';
                        const cleanFinish = item.finish?.trim().toUpperCase() || '';
                        const cleanSize = item.size?.trim().toUpperCase() || '';
                        const cleanWeight = item.weight?.trim().toUpperCase() || '';

                        await client.query(
                            `INSERT INTO quotation_items (
                                category_id, company, design, finish, size, multiplier, qty, unit_price, total, image, boxes, weight
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                            [
                                categoryId, 
                                cleanCompany, 
                                cleanDesign, 
                                cleanFinish,
                                cleanSize, 
                                item.multiplier || 16, 
                                item.qty || 0, 
                                item.unitPrice || 0, 
                                item.total || 0, 
                                item.image || null, 
                                item.boxes || 0,
                                cleanWeight
                            ]
                        );

                        // Auto-save to master_products
                        await syncProductToMaster(client, {
                            ...item,
                            company: cleanCompany,
                            design: cleanDesign,
                            finish: cleanFinish,
                            size: cleanSize,
                            weight: cleanWeight
                        }, 'UPDATE');

                        // If new status is Final, update usage with new quantities
                        if (status === 'Final') {
                            await updateProductUsage(client, item, parseFloat(item.qty || 0));
                        }
                    }
                }
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Quotation updated' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[UPDATE QUOTATION] Error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

export const deleteQuotation = async (req: Request, res: Response) => {
    const { id } = req.params;
    const password = req.headers['x-admin-password'] || req.body?.password || req.query?.password;

    if (password !== 'admin123') {
        return res.status(403).json({ error: 'Incorrect password. You need authorization to delete a quotation.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if quotation exists and its status
        const itemsResult = await client.query(`
            SELECT i.company, i.design, i.finish, i.size, i.qty, q.status, q.type 
            FROM quotation_items i
            JOIN quotation_categories c ON i.category_id = c.id
            JOIN quotations q ON c.quotation_id = q.id
            WHERE q.id = $1
        `, [id]);

        // Decrement product usage counts if it was Final
        if (itemsResult.rows.length > 0 && itemsResult.rows[0].status === 'Final') {
            const isOrderExport = itemsResult.rows[0].type === 'OrderExport';
            for (const item of itemsResult.rows) {
                if (isOrderExport && item.company && item.design) {
                    await client.query(`
                        UPDATE master_products 
                        SET total_quantity_used = COALESCE(total_quantity_used, 0) + $1
                        WHERE company = $2 AND design = $3 AND COALESCE(finish, '') = $4 AND COALESCE(size, '') = $5
                    `, [
                        parseFloat(item.qty || 0), 
                        item.company.trim(), 
                        item.design.trim(), 
                        item.finish?.trim() || '', 
                        item.size?.trim() || ''
                    ]);
                } else {
                    await updateProductUsage(client, item, -parseFloat(item.qty || 0));
                }
            }
        }

        // Explicitly delete items and categories to handle missing CASCADE in some environments
        await client.query(`
            DELETE FROM quotation_items 
            WHERE category_id IN (SELECT id FROM quotation_categories WHERE quotation_id = $1)
        `, [id]);
        await client.query('DELETE FROM quotation_categories WHERE quotation_id = $1', [id]);

        const deleteQuery = `DELETE FROM quotations WHERE id = $1`;
        const result = await client.query(deleteQuery, [id]);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Quotation not found' });
        }

        await client.query('COMMIT');
        res.json({ message: 'Quotation deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[DELETE] Error deleting quotation:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

export const updateQuotationStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get current status
        const currentQuotation = await client.query('SELECT status FROM quotations WHERE id = $1', [id]);
        if (currentQuotation.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Quotation not found' });
        }

        const oldStatus = currentQuotation.rows[0].status;

        const user = (req as any).user;
        // Update status
        const updateQuery = `UPDATE quotations SET status = $1 WHERE id = $2 ${user.role !== 'Admin' ? 'AND created_by = $3' : ''}`;
        const updateParams = user.role !== 'Admin' ? [status, id, user.id] : [status, id];
        const updateResult = await client.query(updateQuery, updateParams);

        if (updateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Quotation not found or unauthorized' });
        }

        // If transitioning to 'Final', update usage count
        if (status === 'Final' && oldStatus !== 'Final') {
            const itemsResult = await client.query(`
                SELECT i.company, i.design, i.finish, i.size, i.qty, i.image 
                FROM quotation_items i
                JOIN quotation_categories c ON i.category_id = c.id
                WHERE c.quotation_id = $1
            `, [id]);

            for (const item of itemsResult.rows) {
                // First ensure product exists in master_products (redundancy for safety)
                await syncProductToMaster(client, item, 'STATUS_UPDATE');

                // Then update total_quantity_used
                await updateProductUsage(client, item, parseFloat(item.qty || 0));
            }
        }
        // If transitioning AWAY from Final, decrement usage count
        else if (status !== 'Final' && oldStatus === 'Final') {
            const itemsResult = await client.query(`
                SELECT i.company, i.design, i.finish, i.size, i.qty 
                FROM quotation_items i
                JOIN quotation_categories c ON i.category_id = c.id
                WHERE c.quotation_id = $1
            `, [id]);

            for (const item of itemsResult.rows) {
                await updateProductUsage(client, item, -parseFloat(item.qty || 0));
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Status updated' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

export const getPublicQuotation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const queryStr = `
            SELECT q.*, 
            COALESCE(
              (SELECT json_agg(json_build_object(
                'id', c.id,
                'name', c.name,
                'items', COALESCE(
                  (SELECT json_agg(i) FROM quotation_items i WHERE i.category_id = c.id),
                  '[]'
                )
              )) FROM quotation_categories c WHERE c.quotation_id = q.id),
              '[]'
            ) as categories
            FROM quotations q
            WHERE LOWER(TRIM(q.id)) = LOWER(TRIM($1))
        `;

        const result = await pool.query(queryStr, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quotation not found' });
        }

        const row = result.rows[0];
        const record = {
            id: row.id,
            customerName: (row.customer_name || '').toUpperCase(),
            companyName: (row.company_name || '').toUpperCase(),
            mobile: row.mobile,
            salesRef: (row.sales_ref || '').toUpperCase(),
            date: row.date,
            grandTotal: parseFloat(row.grand_total || 0),
            siteAddress: (row.site_address || '').toUpperCase(),
            referenceInfo: (row.reference_info || '').toUpperCase(),
            customerLogo: row.customer_logo,
            status: row.status,
            includeGst: row.include_gst || false,
            extraTerms: row.extra_terms || '',
            categories: (row.categories || []).map((cat: any) => ({
                id: cat.id,
                name: (cat.name || '').toUpperCase(),
                items: (cat.items || []).map((it: any) => ({
                    id: it.id,
                    company: (it.company || '').toUpperCase(),
                    design: (it.design || '').toUpperCase(),
                    finish: (it.finish || '').toUpperCase(),
                    size: (it.size || '').toUpperCase(),
                    weight: (it.weight || '').toUpperCase(),
                    multiplier: parseFloat(it.multiplier || 16),
                    qty: parseFloat(it.qty || 0),
                    unitPrice: parseFloat(it.unit_price ?? it.unitPrice ?? 0),
                    total: parseFloat(it.total || 0),
                    image: it.image,
                    boxes: parseFloat(it.boxes || 0)
                }))
            }))
        };

        res.json(record);
    } catch (err) {
        console.error('Error fetching public quotation:', err);
        res.status(500).json({ error: 'Server error' });
    }
};


