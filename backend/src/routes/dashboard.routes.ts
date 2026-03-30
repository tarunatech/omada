import { Router } from 'express';
import pool from '../db';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, async (req, res) => {
    try {
        const quotationsResult = await pool.query("SELECT COUNT(*) as count, SUM(grand_total) as total FROM quotations WHERE type = 'Quotation'");
        const confirmedQuotationsResult = await pool.query("SELECT COUNT(*) as count FROM quotations WHERE status = 'Final' AND type = 'Quotation'");
        const pendingQuotationsResult = await pool.query("SELECT COUNT(*) as count FROM quotations WHERE status = 'Pending' AND type = 'Quotation'");
        const samplesResult = await pool.query("SELECT COUNT(*) as count FROM quotations WHERE type = 'Sample'");
        const salesRecordsResult = await pool.query('SELECT COUNT(*) as count FROM sales_records');

        const recentQuotationsResult = await pool.query("SELECT id, customer_name as customer, grand_total as amount, date, status FROM quotations WHERE type = 'Quotation' ORDER BY created_at DESC LIMIT 5");
        const recentSalesResult = await pool.query('SELECT id, site_name, firm_name, contractor_owner_name, dept as department, contact_number, created_at as date FROM sales_records ORDER BY created_at DESC LIMIT 5');

        res.json({
            kpis: [
                { label: 'Total Quotations', value: quotationsResult.rows[0].count, icon: 'FileText', color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Total Samples', value: samplesResult.rows[0].count, icon: 'Package', color: 'text-rose-600', bg: 'bg-rose-50' },
                { label: 'Confirmed Orders', value: confirmedQuotationsResult.rows[0].count, icon: 'TrendingUp', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Pending Enquiries', value: pendingQuotationsResult.rows[0].count, icon: 'Clock', color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Sales Records', value: salesRecordsResult.rows[0].count, icon: 'Users', color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ],
            recentQuotations: recentQuotationsResult.rows.map(q => ({
                id: q.id,
                customer: q.customer,
                amount: `₹${parseFloat(q.amount || 0).toLocaleString()}`,
                date: q.date,
                status: q.status === 'Final' ? 'Confirmed' : q.status
            })),
            recentSales: recentSalesResult.rows.map(s => ({
                id: s.id.toString(),
                party: s.site_name || s.firm_name || s.contractor_owner_name,
                department: s.department,
                contact: s.contact_number,
                date: new Date(s.date).toISOString().split('T')[0],
                status: 'New'
            }))
        });
    } catch (err) {
        console.error('[DASHBOARD] Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
