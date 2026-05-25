-- Supabase Schema for Silkthread API (Migration from Firebase)
-- Run this entire script in the Supabase Dashboard -> SQL Editor

-- 1. users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'tailor', 'customer')),
    avatar TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. tailor_profiles table
CREATE TABLE tailor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    specializations TEXT DEFAULT '',
    rating NUMERIC(2,1) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    active_orders INTEGER DEFAULT 0,
    max_capacity INTEGER DEFAULT 5,
    experience_years INTEGER DEFAULT 0,
    bio TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. garments table
CREATE TABLE garments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    base_price NUMERIC(10,2) NOT NULL,
    emoji TEXT DEFAULT '',
    image_url TEXT,
    fabric_options TEXT DEFAULT '',
    customization_options TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. fabrics table
CREATE TABLE fabrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    image_url TEXT,
    price_per_meter NUMERIC(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. customizations table
CREATE TABLE customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    garment_type TEXT NOT NULL,
    customization_type TEXT NOT NULL,
    option_name TEXT NOT NULL,
    extra_price NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id),
    garment_id UUID REFERENCES garments(id),
    fabric_id UUID REFERENCES fabrics(id),
    fabric_source TEXT DEFAULT 'website',
    fabric_name TEXT DEFAULT '',
    color TEXT DEFAULT '',
    customization_notes TEXT DEFAULT '',
    customizations JSONB DEFAULT '{}',
    measurements JSONB DEFAULT '{}',
    design_images JSONB DEFAULT '[]',
    total_price NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','assigned','cutting','stitching','finishing','ready','dispatched','delivered')),
    tailor_id UUID REFERENCES users(id),
    payment_status TEXT DEFAULT 'unpaid',
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. order_status_history table
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    notes TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. measurements table
CREATE TABLE measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chest TEXT,
    waist TEXT,
    hip TEXT,
    shoulder TEXT,
    sleeve_length TEXT,
    height TEXT,
    neck TEXT,
    inseam TEXT,
    shirt_length TEXT,
    pant_length TEXT,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ENABLE ROW LEVEL SECURITY (RLS)
-- Since this is a backend API holding the master keys, we allow all operations
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE garments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service" ON tailor_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service" ON garments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service" ON fabrics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service" ON customizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service" ON order_status_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service" ON measurements FOR ALL USING (true) WITH CHECK (true);

-- ADD INDEXES FOR PERFORMANCE
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_tailor_id ON orders(tailor_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_tailor_profiles_user_id ON tailor_profiles(user_id);
CREATE INDEX idx_measurements_user_id ON measurements(user_id);
CREATE INDEX idx_order_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_messages_order_id ON messages(order_id);
