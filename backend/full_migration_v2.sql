-- Consolidate all schema updates required for the latest version of Omada
-- Fixes missing columns in sales_records, quotations, and quotation_items

-- 1. Updates for sales_records table
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS another_name VARCHAR(255);
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS another_contact VARCHAR(255);
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS salesman_name VARCHAR(255);

-- 2. Updates for quotations table
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS include_gst BOOLEAN DEFAULT FALSE;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS extra_terms TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Quotation';

-- 3. Updates for quotation_items table
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS boxes DECIMAL(15,2) DEFAULT 0;

-- 4. Ensure necessary indexes exist
CREATE INDEX IF NOT EXISTS idx_sales_records_dept ON sales_records(dept);
CREATE INDEX IF NOT EXISTS idx_sales_records_created_by ON sales_records(created_by);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_type ON quotations(type);
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON quotations(created_by);

-- 5. Final check on users table (role should exist but just in case)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'User';
    END IF;
END $$;
