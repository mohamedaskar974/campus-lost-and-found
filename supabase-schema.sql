-- ============================================================================
-- CRESCENT RECLAIM - SUPABASE & NEON CLOUD POSTGRESQL SCHEMA
-- Developer: M. MOHAED ASKAR (Reg No: 240071601159)
-- B.S. Abdur Rahman Crescent Institute of Science & Technology
-- ============================================================================

-- 1. Items Table
CREATE TABLE IF NOT EXISTS public.items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'claim_pending', 'reunited')),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    zone TEXT NOT NULL,
    exact_spot TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    reporter_name TEXT NOT NULL,
    reporter_email TEXT NOT NULL,
    reporter_phone TEXT,
    reporter_reg TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Claims Table
CREATE TABLE IF NOT EXISTS public.claims (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    claimant_name TEXT NOT NULL,
    claimant_reg TEXT NOT NULL,
    claimant_email TEXT NOT NULL,
    claimant_phone TEXT NOT NULL,
    proof_details TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Email Outbound Logs Table
CREATE TABLE IF NOT EXISTS public.email_logs (
    id SERIAL PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    item_title TEXT NOT NULL,
    body_html TEXT NOT NULL,
    claimant_name TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) & Public Read/Write for Campus Portal
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow Public Read Items" ON public.items FOR SELECT USING (true);
CREATE POLICY "Allow Public Insert Items" ON public.items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow Public Read Claims" ON public.claims FOR SELECT USING (true);
CREATE POLICY "Allow Public Insert Claims" ON public.claims FOR INSERT WITH CHECK (true);

-- 5. Seed Verified Campus Items
INSERT INTO public.items (id, type, status, category, title, "desc", zone, exact_spot, photo_url, reporter_name, reporter_email, reporter_phone, reporter_reg)
VALUES 
('item-101', 'found', 'active', 'Electronics', 'Casio fx-991EX Classwiz Calculator', 'Found on study table in silent reading zone. Has blue anime sticker on the back cover.', 'Central Library', '2nd Floor Table 14', 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop', 'Dr. K. Palanivel / Librarian Desk', 'library.desk@crescent.education', '+91 98401 22334', 'FAC-LIB-04'),
('item-102', 'found', 'active', 'Cards', 'Crescent Student ID Card (II B.Sc CS)', 'Blue lanyard with Crescent crest. Kept safely at the Canteen billing counter.', 'Main Canteen', 'Juice Counter Table', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=600&auto=format&fit=crop', 'Canteen Supervisor', 'canteen@crescent.education', '+91 98402 99881', 'STAFF-CAN-02'),
('item-103', 'lost', 'active', 'Keys', 'Yamaha Bike Keys with Crescent Lanyard', 'Set of 2 keys with black rubber head.', 'Campus Parking', 'Gate 2 Shed', 'https://images.unsplash.com/photo-1582139329536-e7284fece509?q=80&w=600&auto=format&fit=crop', 'M. Mohaed Askar', 'askar@crescent.education', '+91 98401 23456', '240071601159')
ON CONFLICT (id) DO NOTHING;
