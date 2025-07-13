# Multi-Tenant ERP Database Architecture with Dynamic Schema Creation

## Architecture Overview
- **Schema-per-tenant**: Each company gets its own PostgreSQL schema
- **Auto-generated IDs**: All tables use `table_name_id` as primary key with auto-increment
- **Dynamic provisioning**: Company schemas created automatically on signup
- **Shared global tables**: Core system tables in `public` schema

## Global Schema Structure (public)

### Core System Tables

```sql
-- Global users table (shared across all companies)
CREATE TABLE public.users (
    user_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    google_id VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    email_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Global companies registry
CREATE TABLE public.companies (
    company_id BIGSERIAL PRIMARY KEY,
    schema_name VARCHAR(63) UNIQUE NOT NULL, -- PostgreSQL schema name
    company_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    GSTIN VARCHAR(15),
    industry VARCHAR(100),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    user_id bigint not null,
    --company_size 
    -- Contact information
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),

    --services
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    invoice_reminders BOOLEAN DEFAULT false,
    payment_alerts BOOLEAN DEFAULT false,
    Report_updates BOOLEAN DEFAULT false,

    -- System configuration
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'USD',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    
    -- Subscription details
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(20) DEFAULT 'active',
    subscription_expires_at TIMESTAMP,
    max_users INTEGER DEFAULT 5,
    
    -- System status
    is_active BOOLEAN DEFAULT true,
    schema_created BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(user_id)
        ON DELETE CASCADE
);

-- User-company relationships (global)
CREATE TABLE public.user_companies (
    user_company_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(user_id) ON DELETE CASCADE,
    company_id BIGINT REFERENCES public.companies(company_id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- owner, admin, manager, employee, viewer
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    invited_by BIGINT REFERENCES public.users(user_id),
    invited_at TIMESTAMP,
    joined_at TIMESTAMP,
    last_access_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

-- System-wide settings and configurations
CREATE TABLE public.system_settings (
    setting_id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Global audit logs for system-level actions
CREATE TABLE public.system_audit_logs (
    audit_log_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(user_id),
    company_id BIGINT REFERENCES public.companies(company_id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id BIGINT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Company-Specific Schema Template

### Schema Creation Function
```sql
-- Function to create company schema with all tables
CREATE OR REPLACE FUNCTION create_company_schema(company_schema_name VARCHAR(63))
RETURNS BOOLEAN AS $$
DECLARE
    schema_exists BOOLEAN;
BEGIN
    -- Check if schema already exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = company_schema_name
    ) INTO schema_exists;
    
    IF schema_exists THEN
        RETURN FALSE; -- Schema already exists
    END IF;
    
    -- Create the schema
    EXECUTE format('CREATE SCHEMA %I', company_schema_name);
    
    -- Create all company-specific tables
    PERFORM create_company_tables(company_schema_name);
    
    -- Insert default data
    PERFORM insert_default_company_data(company_schema_name);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Company Schema Tables Template

```sql
-- Function to create all company tables
CREATE OR REPLACE FUNCTION create_company_tables(schema_name VARCHAR(63))
RETURNS VOID AS $$
BEGIN
    -- 1. PRODUCT CATEGORIES
    EXECUTE format('
        CREATE TABLE %I.product_categories (
            product_category_id BIGSERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            parent_category_id BIGINT REFERENCES %I.product_categories(product_category_id),
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name, schema_name);

    -- 2. PRODUCTS
    EXECUTE format('
        CREATE TABLE %I.products (
            product_id BIGSERIAL PRIMARY KEY,
            sku VARCHAR(100) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category_id BIGINT REFERENCES %I.product_categories(product_category_id),
            unit_of_measure VARCHAR(50) DEFAULT ''pcs'',
            cost_price DECIMAL(15,4) DEFAULT 0,
            selling_price DECIMAL(15,4) DEFAULT 0,
            min_stock_level INTEGER DEFAULT 0,
            max_stock_level INTEGER DEFAULT 0,
            reorder_point INTEGER DEFAULT 0,
            barcode VARCHAR(255),
            weight DECIMAL(10,3),
            dimensions JSONB, -- {length, width, height, unit}
            image_urls JSONB DEFAULT ''[]'',
            tags JSONB DEFAULT ''[]'',
            custom_fields JSONB DEFAULT ''{}''::jsonb,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name, schema_name);

    -- 3. WAREHOUSES
    EXECUTE format('
        CREATE TABLE %I.warehouses (
            warehouse_id BIGSERIAL PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(100),
            country VARCHAR(100),
            postal_code VARCHAR(20),
            phone VARCHAR(20),
            email VARCHAR(255),
            manager_name VARCHAR(255),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name);

    -- 4. STOCK LEVELS
    EXECUTE format('
        CREATE TABLE %I.stock_levels (
            stock_level_id BIGSERIAL PRIMARY KEY,
            product_id BIGINT REFERENCES %I.products(product_id) ON DELETE CASCADE,
            warehouse_id BIGINT REFERENCES %I.warehouses(warehouse_id) ON DELETE CASCADE,
            quantity_on_hand DECIMAL(15,3) DEFAULT 0,
            quantity_reserved DECIMAL(15,3) DEFAULT 0,
            quantity_available DECIMAL(15,3) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
            last_counted_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(product_id, warehouse_id)
        )', schema_name, schema_name, schema_name);

    -- 5. STOCK MOVEMENTS
    EXECUTE format('
        CREATE TABLE %I.stock_movements (
            stock_movement_id BIGSERIAL PRIMARY KEY,
            product_id BIGINT REFERENCES %I.products(product_id) ON DELETE CASCADE,
            warehouse_id BIGINT REFERENCES %I.warehouses(warehouse_id) ON DELETE CASCADE,
            movement_type VARCHAR(50) NOT NULL, -- in, out, transfer, adjustment
            quantity DECIMAL(15,3) NOT NULL,
            unit_cost DECIMAL(15,4),
            reference_type VARCHAR(50), -- invoice, purchase_order, adjustment, transfer
            reference_id BIGINT,
            notes TEXT,
            movement_date TIMESTAMP DEFAULT NOW(),
            created_by BIGINT, -- references public.users(user_id)
            created_at TIMESTAMP DEFAULT NOW()
        )', schema_name, schema_name, schema_name);

    -- 6. CONTACTS (Customers/Suppliers)
    EXECUTE format('
        CREATE TABLE %I.contacts (
            contact_id BIGSERIAL PRIMARY KEY,
            type VARCHAR(20) NOT NULL CHECK (type IN (''customer'', ''supplier'', ''lead'', ''prospect'')),
            code VARCHAR(50) UNIQUE,
            name VARCHAR(255) NOT NULL,
            company_name VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(20),
            mobile VARCHAR(20),
            website VARCHAR(255),
            
            -- Contact person details
            contact_person VARCHAR(255),
            designation VARCHAR(100),
            
            -- Address information
            billing_address TEXT,
            billing_city VARCHAR(100),
            billing_state VARCHAR(100),
            billing_country VARCHAR(100),
            billing_postal_code VARCHAR(20),
            
            shipping_address TEXT,
            shipping_city VARCHAR(100),
            shipping_state VARCHAR(100),
            shipping_country VARCHAR(100),
            shipping_postal_code VARCHAR(20),
            
            -- Business information
            tax_id VARCHAR(100),
            registration_number VARCHAR(100),
            credit_limit DECIMAL(15,2) DEFAULT 0,
            payment_terms INTEGER DEFAULT 30, -- days
            
            -- CRM specific fields
            lead_source VARCHAR(100),
            lead_status VARCHAR(50),
            industry VARCHAR(100),
            assigned_to BIGINT, -- references public.users(user_id)
            last_contacted_at TIMESTAMP,
            
            -- Additional data
            tags JSONB DEFAULT ''[]'',
            custom_fields JSONB DEFAULT ''{}''::jsonb,
            notes TEXT,
            
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name);

    -- 7. CONTACT INTERACTIONS
    EXECUTE format('
        CREATE TABLE %I.contact_interactions (
            interaction_id BIGSERIAL PRIMARY KEY,
            contact_id BIGINT REFERENCES %I.contacts(contact_id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL, -- call, email, meeting, note, task
            subject VARCHAR(255),
            description TEXT,
            interaction_date TIMESTAMP DEFAULT NOW(),
            duration_minutes INTEGER,
            outcome VARCHAR(100),
            next_action VARCHAR(255),
            next_action_date TIMESTAMP,
            priority VARCHAR(20) DEFAULT ''medium'',
            status VARCHAR(20) DEFAULT ''completed'',
            created_by BIGINT, -- references public.users(user_id)
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name, schema_name);

    -- 8. INVOICE SEQUENCES
    EXECUTE format('
        CREATE TABLE %I.invoice_sequences (
            sequence_id BIGSERIAL PRIMARY KEY,
            document_type VARCHAR(50) NOT NULL, -- invoice, quote, purchase_order, credit_note
            prefix VARCHAR(10) DEFAULT '''',
            current_number INTEGER DEFAULT 1,
            format_template VARCHAR(50) DEFAULT ''{prefix}{number}'',
            reset_frequency VARCHAR(20) DEFAULT ''never'', -- never, yearly, monthly
            last_reset_date DATE,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(document_type)
        )', schema_name);

    -- 9. INVOICES
    EXECUTE format('
        CREATE TABLE %I.invoices (
            invoice_id BIGSERIAL PRIMARY KEY,
            invoice_number VARCHAR(100) UNIQUE NOT NULL,
            document_type VARCHAR(20) DEFAULT ''invoice'', -- invoice, quote, credit_note, purchase_order
            status VARCHAR(20) DEFAULT ''draft'', -- draft, sent, paid, partially_paid, overdue, cancelled
            
            -- Customer/Supplier information
            contact_id BIGINT REFERENCES %I.contacts(contact_id),
            contact_name VARCHAR(255) NOT NULL,
            contact_email VARCHAR(255),
            contact_phone VARCHAR(20),
            
            -- Billing address
            billing_address TEXT,
            billing_city VARCHAR(100),
            billing_state VARCHAR(100),
            billing_country VARCHAR(100),
            billing_postal_code VARCHAR(20),
            
            -- Invoice details
            issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
            due_date DATE,
            payment_terms INTEGER DEFAULT 30,
            po_number VARCHAR(100),
            
            -- Amounts
            subtotal DECIMAL(15,2) DEFAULT 0,
            discount_amount DECIMAL(15,2) DEFAULT 0,
            tax_amount DECIMAL(15,2) DEFAULT 0,
            shipping_amount DECIMAL(15,2) DEFAULT 0,
            total_amount DECIMAL(15,2) DEFAULT 0,
            paid_amount DECIMAL(15,2) DEFAULT 0,
            balance_amount DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
            
            -- Currency and exchange
            currency VARCHAR(3) DEFAULT ''USD'',
            exchange_rate DECIMAL(10,4) DEFAULT 1,
            
            -- Additional information
            notes TEXT,
            terms_conditions TEXT,
            internal_notes TEXT,
            
            -- Metadata
            created_by BIGINT, -- references public.users(user_id)
            approved_by BIGINT, -- references public.users(user_id)
            approved_at TIMESTAMP,
            sent_at TIMESTAMP,
            
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name, schema_name);

    -- 10. INVOICE ITEMS
    EXECUTE format('
        CREATE TABLE %I.invoice_items (
            invoice_item_id BIGSERIAL PRIMARY KEY,
            invoice_id BIGINT REFERENCES %I.invoices(invoice_id) ON DELETE CASCADE,
            product_id BIGINT REFERENCES %I.products(product_id),
            
            -- Item details
            description VARCHAR(500) NOT NULL,
            quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
            unit_price DECIMAL(15,4) NOT NULL DEFAULT 0,
            discount_percent DECIMAL(5,2) DEFAULT 0,
            discount_amount DECIMAL(15,2) DEFAULT 0,
            
            -- Tax information
            tax_percent DECIMAL(5,2) DEFAULT 0,
            tax_amount DECIMAL(15,2) DEFAULT 0,
            
            -- Calculated amounts
            line_total DECIMAL(15,2) DEFAULT 0,
            
            -- Additional data
            unit_of_measure VARCHAR(50),
            sort_order INTEGER DEFAULT 0,
            
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name, schema_name, schema_name);

    -- 11. PAYMENTS
    EXECUTE format('
        CREATE TABLE %I.payments (
            payment_id BIGSERIAL PRIMARY KEY,
            invoice_id BIGINT REFERENCES %I.invoices(invoice_id),
            payment_number VARCHAR(100),
            payment_method VARCHAR(50) NOT NULL, -- cash, card, bank_transfer, cheque, online
            reference_number VARCHAR(100),
            amount DECIMAL(15,2) NOT NULL,
            payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
            
            -- Bank details (for bank transfers)
            bank_name VARCHAR(255),
            account_number VARCHAR(100),
            
            -- Card details (masked)
            card_last_four VARCHAR(4),
            card_type VARCHAR(20),
            
            -- Additional information
            notes TEXT,
            attachment_url VARCHAR(500),
            
            -- Status and verification
            status VARCHAR(20) DEFAULT ''completed'', -- pending, completed, failed, cancelled
            verified_at TIMESTAMP,
            verified_by BIGINT, -- references public.users(user_id)
            
            created_by BIGINT, -- references public.users(user_id)
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name, schema_name);

    -- 12. EMPLOYEES
    EXECUTE format('
        CREATE TABLE %I.employees (
            employee_id BIGSERIAL PRIMARY KEY,
            user_id BIGINT, -- references public.users(user_id) if employee has system access
            employee_code VARCHAR(50) UNIQUE NOT NULL,
            
            -- Personal information
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            middle_name VARCHAR(100),
            email VARCHAR(255),
            phone VARCHAR(20),
            mobile VARCHAR(20),
            date_of_birth DATE,
            gender VARCHAR(10),
            marital_status VARCHAR(20),
            
            -- Employment details
            hire_date DATE NOT NULL,
            termination_date DATE,
            employment_status VARCHAR(20) DEFAULT ''active'', -- active, terminated, suspended
            employment_type VARCHAR(50) DEFAULT ''full_time'', -- full_time, part_time, contract, intern
            
            -- Job information
            department VARCHAR(100),
            designation VARCHAR(100),
            reporting_manager_id BIGINT REFERENCES %I.employees(employee_id),
            work_location VARCHAR(255),
            
            -- Salary information
            salary_type VARCHAR(20) DEFAULT ''monthly'', -- monthly, hourly, daily, weekly
            base_salary DECIMAL(15,2) DEFAULT 0,
            hourly_rate DECIMAL(10,2) DEFAULT 0,
            overtime_rate DECIMAL(10,2) DEFAULT 0,
            
            -- Address information
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(100),
            country VARCHAR(100),
            postal_code VARCHAR(20),
            
            -- Emergency contact
            emergency_contact_name VARCHAR(255),
            emergency_contact_phone VARCHAR(20),
            emergency_contact_relationship VARCHAR(50),
            
            -- Government IDs and tax information
            tax_id VARCHAR(100),
            social_security_number VARCHAR(50),
            passport_number VARCHAR(50),
            
            -- Bank account details
            bank_name VARCHAR(255),
            bank_account_number VARCHAR(100),
            bank_routing_number VARCHAR(50),
            
            -- Additional information
            profile_picture_url VARCHAR(500),
            notes TEXT,
            custom_fields JSONB DEFAULT ''{}''::jsonb,
            
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name, schema_name);

    -- 13. PAYROLL PERIODS
    EXECUTE format('
        CREATE TABLE %I.payroll_periods (
            payroll_period_id BIGSERIAL PRIMARY KEY,
            period_name VARCHAR(100) NOT NULL,
            period_type VARCHAR(20) NOT NULL DEFAULT ''monthly'', -- weekly, bi_weekly, monthly, quarterly
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            pay_date DATE NOT NULL,
            
            -- Status tracking
            status VARCHAR(20) DEFAULT ''draft'', -- draft, processing, approved, paid, closed
            
            -- Summary information
            total_employees INTEGER DEFAULT 0,
            total_gross_salary DECIMAL(15,2) DEFAULT 0,
            total_deductions DECIMAL(15,2) DEFAULT 0,
            total_net_salary DECIMAL(15,2) DEFAULT 0,
            
            -- Approval workflow
            created_by BIGINT, -- references public.users(user_id)
            approved_by BIGINT, -- references public.users(user_id)
            approved_at TIMESTAMP,
            processed_at TIMESTAMP,
            
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            
            UNIQUE(period_name, start_date, end_date)
        )', schema_name);

    -- 14. PAYROLL ENTRIES
    EXECUTE format('
        CREATE TABLE %I.payroll_entries (
            payroll_entry_id BIGSERIAL PRIMARY KEY,
            payroll_period_id BIGINT REFERENCES %I.payroll_periods(payroll_period_id) ON DELETE CASCADE,
            employee_id BIGINT REFERENCES %I.employees(employee_id) ON DELETE CASCADE,
            
            -- Basic salary information
            base_salary DECIMAL(15,2) DEFAULT 0,
            days_worked DECIMAL(5,2) DEFAULT 0,
            hours_worked DECIMAL(8,2) DEFAULT 0,
            
            -- Overtime calculations
            overtime_hours DECIMAL(8,2) DEFAULT 0,
            overtime_rate DECIMAL(10,2) DEFAULT 0,
            overtime_amount DECIMAL(15,2) DEFAULT 0,
            
            -- Earnings
            allowances DECIMAL(15,2) DEFAULT 0,
            bonuses DECIMAL(15,2) DEFAULT 0,
            commissions DECIMAL(15,2) DEFAULT 0,
            other_earnings DECIMAL(15,2) DEFAULT 0,
            gross_salary DECIMAL(15,2) DEFAULT 0,
            
            -- Deductions
            income_tax DECIMAL(15,2) DEFAULT 0,
            social_security DECIMAL(15,2) DEFAULT 0,
            health_insurance DECIMAL(15,2) DEFAULT 0,
            retirement_contribution DECIMAL(15,2) DEFAULT 0,
            loan_deduction DECIMAL(15,2) DEFAULT 0,
            other_deductions DECIMAL(15,2) DEFAULT 0,
            total_deductions DECIMAL(15,2) DEFAULT 0,
            
            -- Final calculation
            net_salary DECIMAL(15,2) DEFAULT 0,
            
            -- Payment information
            payment_method VARCHAR(50) DEFAULT ''bank_transfer'',
            payment_status VARCHAR(20) DEFAULT ''pending'', -- pending, paid, failed
            payment_date DATE,
            payment_reference VARCHAR(100),
            
            -- Additional information
            notes TEXT,
            payslip_generated BOOLEAN DEFAULT false,
            payslip_sent BOOLEAN DEFAULT false,
            
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            
            UNIQUE(payroll_period_id, employee_id)
        )', schema_name, schema_name, schema_name);

    -- 15. TAX RATES
    EXECUTE format('
        CREATE TABLE %I.tax_rates (
            tax_rate_id BIGSERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            tax_type VARCHAR(20) NOT NULL, -- GST, VAT, sales_tax, income_tax
            rate DECIMAL(5,2) NOT NULL,
            applicable_from DATE NOT NULL,
            applicable_to DATE,
            
            -- Tax configuration
            is_compound BOOLEAN DEFAULT false, -- compound tax calculation
            calculation_order INTEGER DEFAULT 1,
            
            -- Geographic applicability
            country VARCHAR(100),
            state VARCHAR(100),
            city VARCHAR(100),
            
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name);

    -- 16. GST RETURNS
    EXECUTE format('
        CREATE TABLE %I.gst_returns (
            gst_return_id BIGSERIAL PRIMARY KEY,
            return_type VARCHAR(20) NOT NULL, -- GSTR1, GSTR3B, GSTR2, etc.
            financial_year INTEGER NOT NULL,
            period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
            
            -- Filing information
            filing_date DATE,
            due_date DATE,
            status VARCHAR(20) DEFAULT ''draft'', -- draft, filed, paid, delayed
            
            -- Summary amounts
            total_taxable_sales DECIMAL(15,2) DEFAULT 0,
            total_tax_on_sales DECIMAL(15,2) DEFAULT 0,
            total_taxable_purchases DECIMAL(15,2) DEFAULT 0,
            total_tax_on_purchases DECIMAL(15,2) DEFAULT 0,
            
            -- Tax calculations
            output_tax DECIMAL(15,2) DEFAULT 0,
            input_tax_credit DECIMAL(15,2) DEFAULT 0,
            tax_payable DECIMAL(15,2) DEFAULT 0,
            interest_payable DECIMAL(15,2) DEFAULT 0,
            penalty_payable DECIMAL(15,2) DEFAULT 0,
            
            -- Payment information
            total_amount_payable DECIMAL(15,2) DEFAULT 0,
            amount_paid DECIMAL(15,2) DEFAULT 0,
            payment_date DATE,
            payment_reference VARCHAR(100),
            
            -- Additional information
            acknowledgment_number VARCHAR(100),
            filed_by BIGINT, -- references public.users(user_id)
            notes TEXT,
            
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            
            UNIQUE(return_type, financial_year, period_month)
        )', schema_name);

    -- 17. CUSTOM REPORTS
    EXECUTE format('
        CREATE TABLE %I.custom_reports (
            report_id BIGSERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            report_type VARCHAR(50) NOT NULL, -- sales, inventory, financial, hr, custom
            category VARCHAR(50),
            
            -- Report configuration
            query_config JSONB NOT NULL, -- SQL query or report parameters
            display_config JSONB DEFAULT ''{}''::jsonb, -- chart type, columns, etc.
            filter_config JSONB DEFAULT ''{}''::jsonb, -- default filters
            
            -- Access control
            is_public BOOLEAN DEFAULT false,
            allowed_roles JSONB DEFAULT ''["admin"]''::jsonb,
            
            -- Scheduling
            is_scheduled BOOLEAN DEFAULT false,
            schedule_config JSONB DEFAULT ''{}''::jsonb,
            
            -- Metadata
            created_by BIGINT, -- references public.users(user_id)
            last_run_at TIMESTAMP,
            run_count INTEGER DEFAULT 0,
            
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name);

    -- 18. AI INSIGHTS
    EXECUTE format('
        CREATE TABLE %I.ai_insights (
            insight_id BIGSERIAL PRIMARY KEY,
            module VARCHAR(50) NOT NULL, -- inventory, sales, crm, hr, finance
            insight_type VARCHAR(50) NOT NULL, -- prediction, recommendation, alert, trend
            
            -- Insight content
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            insight_data JSONB DEFAULT ''{}''::jsonb, -- structured insight data
            
            -- AI metadata
            model_version VARCHAR(50),
            confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
            data_source JSONB, -- what data was analyzed
            
            -- Business impact
            impact_level VARCHAR(20) DEFAULT ''medium'', -- low, medium, high, critical
            category VARCHAR(50), -- cost_saving, efficiency, risk, opportunity
            estimated_impact DECIMAL(15,2), -- monetary impact if applicable
            
            -- Action tracking
            is_actionable BOOLEAN DEFAULT true,
            action_taken BOOLEAN DEFAULT false,
            action_details TEXT,
            action_taken_at TIMESTAMP,
            action_taken_by BIGINT, -- references public.users(user_id)
            
            -- Lifecycle
            expires_at TIMESTAMP,
            is_dismissed BOOLEAN DEFAULT false,
            dismissed_at TIMESTAMP,
            dismissed_by BIGINT, -- references public.users(user_id)
            
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name);

    -- 19. AUDIT LOGS
    EXECUTE format('
        CREATE TABLE %I.audit_logs (
            audit_log_id BIGSERIAL PRIMARY KEY,
            user_id BIGINT, -- references public.users(user_id)
            action VARCHAR(50) NOT NULL, -- create, update, delete, login, logout, export
            resource_type VARCHAR(50) NOT NULL, -- invoice, product, customer, employee
            resource_id BIGINT,
            
            -- Change tracking
            old_values JSONB,
            new_values JSONB,
            changed_fields JSONB, -- array of changed field names
            
            -- Request information
            ip_address INET,
            user_agent TEXT,
            request_method VARCHAR(10),
            request_url TEXT,
            
            -- Additional context
            notes TEXT,
            severity VARCHAR(20) DEFAULT ''info'', -- info, warning, error, critical
            
            created_at TIMESTAMP DEFAULT NOW()
        )', schema_name);

    -- 20. NOTIFICATIONS
    EXECUTE format('
        CREATE TABLE %I.notifications (
            notification_id BIGSERIAL PRIMARY KEY,
            user_id BIGINT, -- references public.users(user_id), null for system-wide
            
            -- Notification content
            type VARCHAR(50) NOT NULL, -- info, warning, error, success, reminder
            category VARCHAR(50), -- system, invoice, inventory, payroll, etc.
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            
            -- Additional data
            data JSONB DEFAULT ''{}''::jsonb, -- action buttons, links, etc.
            priority VARCHAR(20) DEFAULT ''normal'', -- low, normal, high, urgent
            
            -- Delivery channels
            channels JSONB DEFAULT ''["app"]''::jsonb, -- app, email, sms, push
            
            -- Status tracking
            is_read BOOLEAN DEFAULT false,
            read_at TIMESTAMP,
            is_archived BOOLEAN DEFAULT false,
            archived_at TIMESTAMP,
            
            -- Lifecycle
            expires_at TIMESTAMP,
            
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name);

    -- Create indexes for performance
    PERFORM create_company_indexes(schema_name);
    
END;
$$ LANGUAGE plpgsql;
```

### Index Creation Function
```sql
CREATE OR REPLACE FUNCTION create_company_indexes(schema_name VARCHAR(63))
RETURNS VOID AS $$
BEGIN
    -- Products indexes
    EXECUTE format('CREATE INDEX idx_%I_products_sku ON %I.products(sku)', schema_name, schema_name);
    EXECUTE format('CREATE INDEX idx_%I_products_name ON %I.products(name)', schema_name, schema_name);
    EXECUTE format('CREATE INDEX idx_%I_products_active ON %I.products(is_active)', schema_name, schema_name);
    EXECUTE format('CREATE INDEX idx_%I_products_category ON %I.products(category_id)', schema_name, schema_name);
    
    -- Stock levels indexes
    EXECUTE format('CREATE INDEX idx_%I_stock_product_warehouse ON %I.stock_levels(product_id, warehouse_id)', schema_name, schema_name);
    EXECUTE format('CREATE INDEX idx_%I_stock_low_stock ON %I.stock_levels(product_id) WHERE quantity_available <= 10', schema_name, schema_name);
    
    -- Contacts indexes // there is some error with the below line upon excecuation
    --EXECUTE format('CREATE INDEX idx_%I_contacts_type ON %I.contacts(type)', schema_name, schema_name);