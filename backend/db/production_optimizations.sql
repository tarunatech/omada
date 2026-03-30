-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_records_dept ON sales_records(dept);
CREATE INDEX IF NOT EXISTS idx_follow_ups_sales_record_id ON follow_ups(sales_record_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_type ON quotations(type);
CREATE INDEX IF NOT EXISTS idx_quotation_categories_quotation_id ON quotation_categories(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_category_id ON quotation_items(category_id);
CREATE INDEX IF NOT EXISTS idx_master_products_company_design ON master_products(company, design);

-- Ensure include_gst is in quotations (it should be, but just in case)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotations' AND column_name='include_gst') THEN
        ALTER TABLE quotations ADD COLUMN include_gst BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
