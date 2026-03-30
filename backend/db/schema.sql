-- Database Schema for Omada Sales Suite

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'User', -- 'Admin', 'User'
    selected_department VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sales Records Table
CREATE TABLE IF NOT EXISTS sales_records (
    id SERIAL PRIMARY KEY,
    dept VARCHAR(50) NOT NULL, -- 'builders', 'architects', 'contractors'
    site_name VARCHAR(255),
    firm_name VARCHAR(255),
    
    -- Contractor / Owner
    contractor_owner_name VARCHAR(255),
    contractor_owner_contact VARCHAR(255),
    
    -- Authorized Person
    authorized_person_name VARCHAR(255),
    
    -- Customer
    customer_name VARCHAR(255),
    customer_contact VARCHAR(255),
    
    -- Architect
    architect_name VARCHAR(255),
    architect_contact VARCHAR(255),
    
    -- Interior Designer
    interior_designer_name VARCHAR(255),
    interior_designer_contact VARCHAR(255),
    
    -- Structural Engineer
    structural_engineer_name VARCHAR(255),
    structural_engineer_contact VARCHAR(255),
    
    -- Site Supervisor (for Builders)
    supervisor_name VARCHAR(255),
    supervisor_contact VARCHAR(255),
    
    -- PMC Company (for Builders)
    pmc_name VARCHAR(255),
    pmc_contact VARCHAR(255),
    
    -- Purchase Person (for Architects)
    purchase_person_name VARCHAR(255),
    purchase_person_contact VARCHAR(255),
    
    -- Shared fields
    location VARCHAR(255),
    contact_number VARCHAR(50), -- General contact number
    address TEXT,
    notes TEXT,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    
    -- New Company Tracking Fields
    architect_company VARCHAR(255),
    interior_company VARCHAR(255),
    structural_engineer_company VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Follow Ups Table
CREATE TABLE IF NOT EXISTS follow_ups (
    id SERIAL PRIMARY KEY,
    sales_record_id INTEGER REFERENCES sales_records(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
    id VARCHAR(50) PRIMARY KEY, -- e.g., Q-1001
    customer_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(50),
    sales_ref VARCHAR(255),
    site_address TEXT,
    reference_info TEXT,
    grand_total DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Final'
    customer_logo TEXT, -- Base64 or URL
    date DATE DEFAULT CURRENT_DATE,
    type VARCHAR(50) DEFAULT 'Quotation', -- 'Quotation', 'Sample'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quotation Categories Table
CREATE TABLE IF NOT EXISTS quotation_categories (
    id SERIAL PRIMARY KEY,
    quotation_id VARCHAR(50) REFERENCES quotations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL
);

-- Quotation Items Table
CREATE TABLE IF NOT EXISTS quotation_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES quotation_categories(id) ON DELETE CASCADE,
    company VARCHAR(100),
    design VARCHAR(255),
    finish VARCHAR(100),
    size VARCHAR(100),
    multiplier DECIMAL(10, 2) DEFAULT 16,
    qty DECIMAL(10, 2) DEFAULT 0,
    unit_price DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) DEFAULT 0,
    image TEXT -- Base64 or URL
);
-- Master Data Tables
CREATE TABLE IF NOT EXISTS master_companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(100),
    contact VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_products (
    id SERIAL PRIMARY KEY,
    company VARCHAR(100) NOT NULL,
    design VARCHAR(255) NOT NULL,
    finish VARCHAR(100),
    size VARCHAR(100),
    image TEXT, -- Base64
    total_quantity_used DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company, design, finish, size)
);
