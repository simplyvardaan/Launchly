-- ==============================================================================
-- Launchly — Production Database Schema for Supabase PostgreSQL
-- Tailored for NSOC, GSOC & Open-Source Production Deployment
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- 2. Sites / Published Websites Table
CREATE TABLE IF NOT EXISTS public.sites (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'draft', 'building')),
  views INTEGER NOT NULL DEFAULT 1,
  site_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_subdomain ON public.sites (subdomain);
CREATE INDEX IF NOT EXISTS idx_sites_user_id ON public.sites (user_id);

-- 3. Payments / Transactions Table (QR Code & UPI Purchases)
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT DEFAULT 'monthly',
  txn_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'failed')),
  payment_method TEXT NOT NULL DEFAULT 'qr_upi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_email ON public.payments (user_email);
CREATE INDEX IF NOT EXISTS idx_payments_txn_id ON public.payments (txn_id);

-- 4. Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS public.subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'frontpage',
  topics TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS topics TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers (email);

-- 5. Contact & Feedback Messages Table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow public read on published sites
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view live sites') THEN
    CREATE POLICY "Public can view live sites" ON public.sites FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on users') THEN
    CREATE POLICY "Service role full access on users" ON public.users FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on sites') THEN
    CREATE POLICY "Service role full access on sites" ON public.sites FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on payments') THEN
    CREATE POLICY "Service role full access on payments" ON public.payments FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on subscribers') THEN
    CREATE POLICY "Service role full access on subscribers" ON public.subscribers FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on contact_messages') THEN
    CREATE POLICY "Service role full access on contact_messages" ON public.contact_messages FOR ALL USING (true);
  END IF;

  -- Enforce strict owner-only access policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can only read own profile') THEN
    CREATE POLICY "Users can only read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can only read own payments') THEN
    CREATE POLICY "Users can only read own payments" ON public.payments FOR SELECT USING (auth.jwt() ->> 'email' = user_email);
  END IF;
END $$;

-- Explicit schema permissions: grant service_role full access, restrict anon/authenticated
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.sites TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Ensure table ownership for Supabase Dashboard Table Editor
ALTER TABLE public.users OWNER TO postgres;
ALTER TABLE public.sites OWNER TO postgres;
ALTER TABLE public.payments OWNER TO postgres;
ALTER TABLE public.subscribers OWNER TO postgres;
ALTER TABLE public.contact_messages OWNER TO postgres;

-- Notify PostgREST to reload schema cache so tables immediately reflect in Supabase Studio
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
