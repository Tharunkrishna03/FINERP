-- Supabase RBAC Migration
-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.userprofile CASCADE;
DROP TABLE IF EXISTS public.useravatar CASCADE;
DROP TABLE IF EXISTS public.usermoduleaccess CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- Create roles table
CREATE TABLE public.roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE
);

-- Insert default roles
INSERT INTO public.roles (name) VALUES ('Administrator'), ('Manager'), ('User');

-- Create userprofile table linked to auth.users
CREATE TABLE public.userprofile (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
    user_name text NOT NULL,
    role_id uuid NOT NULL REFERENCES public.roles (id),
    profile_image text,
    sno_format text DEFAULT '1',
    ano_format text DEFAULT '1',
    customer_id_no_format text DEFAULT '1',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create useravatar table linked to auth.users
CREATE TABLE public.useravatar (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
    image text
);

-- Create usermoduleaccess table linked to auth.users
CREATE TABLE public.usermoduleaccess (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
    visible_modules jsonb DEFAULT '[]'::jsonb,
    role text DEFAULT 'Staff'
);

-- Create common settings table
CREATE TABLE public.settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value jsonb NOT NULL
);

-- Enable Row Level Security on userprofile and useravatar
ALTER TABLE public.userprofile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner can select" ON public.userprofile FOR SELECT USING (auth.uid() = auth_uid);
CREATE POLICY "owner can update" ON public.userprofile FOR UPDATE USING (auth.uid() = auth_uid);
CREATE POLICY "owner can delete" ON public.userprofile FOR DELETE USING (auth.uid() = auth_uid);

ALTER TABLE public.useravatar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner can select" ON public.useravatar FOR SELECT USING (auth.uid() = auth_uid);
CREATE POLICY "owner can update" ON public.useravatar FOR UPDATE USING (auth.uid() = auth_uid);
CREATE POLICY "owner can delete" ON public.useravatar FOR DELETE USING (auth.uid() = auth_uid);

-- RLS for module access (owners only)
ALTER TABLE public.usermoduleaccess ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner can select" ON public.usermoduleaccess FOR SELECT USING (auth.uid() = auth_uid);
CREATE POLICY "owner can update" ON public.usermoduleaccess FOR UPDATE USING (auth.uid() = auth_uid);
CREATE POLICY "owner can delete" ON public.usermoduleaccess FOR DELETE USING (auth.uid() = auth_uid);
