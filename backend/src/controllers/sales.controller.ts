import { Request, Response } from 'express';
import pool from '../db';
import { mapRowsToCamelCase } from '../utils';

export const getSalesRecords = async (req: Request, res: Response) => {
    try {
        const { dept } = req.query;
        const search = (req.query.search as string || '').toLowerCase();
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const user = (req as any).user;
        const rawCreatedBy = req.query.createdBy as string;
        const targetUserId = (rawCreatedBy === 'undefined' || isNaN(parseInt(rawCreatedBy))) ? null : parseInt(rawCreatedBy);
        
        let whereClause = dept ? 'WHERE dept = $1' : '';
        const params: any[] = dept ? [dept] : [];

        // RBAC: Admins can filter by user, others only see their own
        if (user.role === 'Admin' && targetUserId) {
            const placeholder = `$${params.length + 1}`;
            whereClause = whereClause ? `${whereClause} AND created_by = ${placeholder}` : `WHERE created_by = ${placeholder}`;
            params.push(targetUserId);
        } else if (user.role !== 'Admin') {
            const placeholder = `$${params.length + 1}`;
            whereClause = whereClause ? `${whereClause} AND created_by = ${placeholder}` : `WHERE created_by = ${placeholder}`;
            params.push(user.id);
        }

        if (search) {
            const searchPlaceholder = `$${params.length + 1}`;
            const searchFields = [
                'site_name', 'firm_name', 'customer_name', 'contact_number', 
                'location', 'contractor_owner_name', 'authorized_person_name',
                'architect_name', 'interior_designer_name', 'structural_engineer_name',
                'supervisor_name', 'pmc_name', 'purchase_person_name', 
                'another_name', 'salesman_name', 'address', 'notes',
                'architect_company', 'interior_company', 'structural_engineer_company',
                'contractor_owner_contact', 'customer_contact', 'architect_contact',
                'interior_designer_contact', 'structural_engineer_contact',
                'supervisor_contact', 'pmc_contact', 'purchase_person_contact', 'another_contact'
            ];
            
            const searchConditions = searchFields
                .map(field => `LOWER(COALESCE(${field}, '')) LIKE ${searchPlaceholder}`)
                .join(' OR ');

            const searchField = `(${searchConditions})`;
            whereClause = whereClause ? `${whereClause} AND ${searchField}` : `WHERE ${searchField}`;
            params.push(`%${search}%`);
        }

        const countQuery = `SELECT COUNT(*) FROM sales_records ${whereClause}`;
        const queryStr = `
            SELECT s.*, 
            COALESCE(
                (SELECT json_agg(f ORDER BY f.date ASC) 
                 FROM follow_ups f 
                 WHERE f.sales_record_id = s.id), 
                '[]'
            ) as follow_ups
            FROM sales_records s
            ${whereClause}
            ORDER BY s.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const dataParams = [...params, limit, offset];

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, params),
            pool.query(queryStr, dataParams)
        ]);

        const totalCount = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalCount / limit);

        const records = dataResult.rows.map(row => {
            const camelRow = mapRowsToCamelCase([row])[0];
            return {
                ...camelRow,
                lat: row.lat ? parseFloat(row.lat) : null,
                lng: row.lng ? parseFloat(row.lng) : null,
                followUps: (row.follow_ups || []).map((f: any) => ({
                    id: f.id,
                    date: f.date,
                    notes: f.notes,
                    createdAt: f.created_at
                }))
            };
        });

        res.json({
            data: records,
            pagination: {
                totalCount,
                totalPages,
                currentPage: page,
                limit
            }
        });
    } catch (err) {
        console.error('[GET SALES] Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const createSalesRecord = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const {
            dept, siteName, firmName,
            contractorOwnerName, contractorOwnerContact,
            authorizedPersonName, customerName, customerContact,
            architectName, architectContact,
            interiorDesignerName, interiorDesignerContact,
            structuralEngineerName, structuralEngineerContact,
            supervisorName, supervisorContact,
            pmcName, pmcContact,
            purchasePersonName, purchasePersonContact,
            contactNumber, anotherName, anotherContact, salesmanName,
            address, notes, lat, lng,
            location, architectCompany, interiorCompany, structuralEngineerCompany,
            followUps
        } = req.body;

        if (!dept || (!siteName && !firmName && !customerName)) {
            return res.status(400).json({ error: 'Dept and at least one identifying name (Site, Firm, or Customer) are required' });
        }

        await client.query('BEGIN');

        const user = (req as any).user;
        const insertRecordQuery = `
          INSERT INTO sales_records (
            dept, site_name, firm_name, 
            contractor_owner_name, contractor_owner_contact,
            authorized_person_name, customer_name, customer_contact,
            architect_name, architect_contact,
            interior_designer_name, interior_designer_contact,
            structural_engineer_name, structural_engineer_contact,
            supervisor_name, supervisor_contact,
            pmc_name, pmc_contact,
            purchase_person_name, purchase_person_contact,
            contact_number, another_name, another_contact, salesman_name, 
            address, notes, lat, lng,
            location, architect_company, interior_company, structural_engineer_company,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
          RETURNING id
        `;

        const recordResult = await client.query(insertRecordQuery, [
            dept, siteName, firmName,
            contractorOwnerName, contractorOwnerContact,
            authorizedPersonName, customerName, customerContact,
            architectName, architectContact,
            interiorDesignerName, interiorDesignerContact,
            structuralEngineerName, structuralEngineerContact,
            supervisorName, supervisorContact,
            pmcName, pmcContact,
            purchasePersonName, purchasePersonContact,
            contactNumber, anotherName, anotherContact, salesmanName, address, notes, lat, lng,
            location, architectCompany, interiorCompany, structuralEngineerCompany,
            user.id
        ]);

        const recordId = recordResult.rows[0].id;

        if (followUps && followUps.length > 0) {
            for (const f of followUps) {
                await client.query(
                    'INSERT INTO follow_ups (sales_record_id, date, notes) VALUES ($1, $2, $3)',
                    [recordId, f.date, f.notes]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ id: recordId, message: 'Record created' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[CREATE SALES] Error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

export const updateSalesRecord = async (req: Request, res: Response) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const {
            dept, siteName, firmName,
            contractorOwnerName, contractorOwnerContact,
            authorizedPersonName, customerName, customerContact,
            architectName, architectContact,
            interiorDesignerName, interiorDesignerContact,
            structuralEngineerName, structuralEngineerContact,
            supervisorName, supervisorContact,
            pmcName, pmcContact,
            purchasePersonName, purchasePersonContact,
            contactNumber, anotherName, anotherContact, salesmanName,
            address, notes, lat, lng,
            location, architectCompany, interiorCompany, structuralEngineerCompany,
            followUps
        } = req.body;

        await client.query('BEGIN');

        const user = (req as any).user;
        const updateRecordQuery = `
          UPDATE sales_records SET 
            dept = $1, site_name = $2, firm_name = $3, 
            contractor_owner_name = $4, contractor_owner_contact = $5,
            authorized_person_name = $6, customer_name = $7, customer_contact = $8,
            architect_name = $9, architect_contact = $10,
            interior_designer_name = $11, interior_designer_contact = $12,
            structural_engineer_name = $13, structural_engineer_contact = $14,
            supervisor_name = $15, supervisor_contact = $16,
            pmc_name = $17, pmc_contact = $18,
            purchase_person_name = $19, purchase_person_contact = $20,
            contact_number = $21, another_name = $22, another_contact = $23, salesman_name = $24, address = $25, notes = $26, lat = $27, lng = $28,
            location = $29, architect_company = $30, interior_company = $31, structural_engineer_company = $32
          WHERE id = $33 ${user.role !== 'Admin' ? 'AND created_by = $34' : ''}
        `;

        const queryParams = [
            dept, siteName, firmName,
            contractorOwnerName, contractorOwnerContact,
            authorizedPersonName, customerName, customerContact,
            architectName, architectContact,
            interiorDesignerName, interiorDesignerContact,
            structuralEngineerName, structuralEngineerContact,
            supervisorName, supervisorContact,
            pmcName, pmcContact,
            purchasePersonName, purchasePersonContact,
            contactNumber, anotherName, anotherContact, salesmanName, address, notes, lat, lng,
            location, architectCompany, interiorCompany, structuralEngineerCompany,
            id
        ];

        if (user.role !== 'Admin') {
            queryParams.push(user.id);
        }

        const result = await client.query(updateRecordQuery, queryParams);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Record not found' });
        }

        // Simple approach for follow-ups: delete all and re-insert
        await client.query('DELETE FROM follow_ups WHERE sales_record_id = $1', [id]);

        if (followUps && followUps.length > 0) {
            for (const f of followUps) {
                await client.query(
                    'INSERT INTO follow_ups (sales_record_id, date, notes) VALUES ($1, $2, $3)',
                    [id, f.date, f.notes]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Record updated' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[UPDATE SALES] Error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

export const deleteSalesRecord = async (req: Request, res: Response) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const user = (req as any).user;
        await client.query('BEGIN');

        // Explicitly delete follow ups (though ON DELETE CASCADE should handle it, this is safer)
        await client.query('DELETE FROM follow_ups WHERE sales_record_id = $1', [id]);

        const deleteQuery = `DELETE FROM sales_records WHERE id = $1 ${user.role !== 'Admin' ? 'AND created_by = $2' : ''}`;
        const deleteParams = user.role !== 'Admin' ? [id, user.id] : [id];
        
        const result = await client.query(deleteQuery, deleteParams);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Record not found' });
        }

        await client.query('COMMIT');
        res.json({ message: 'Record deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[DELETE SALES] Error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};
