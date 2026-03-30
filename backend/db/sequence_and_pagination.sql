-- 1. Create Sequence for Quotation Numbers
CREATE SEQUENCE IF NOT EXISTS quotation_number_seq START 1001;

-- 2. Add indices for faster pagination lookups
CREATE INDEX IF NOT EXISTS idx_master_products_created_at ON master_products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_master_companies_created_at ON master_companies (created_at DESC);
