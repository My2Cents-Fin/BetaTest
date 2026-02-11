-- ============================================
-- Base Tables Migration - Run this FIRST
-- Creates users, households, and household_members tables
-- ============================================

-- 1. Users Table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Households Table (create table first, policies later)
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Household Members Table (create table first, policies later)
CREATE TABLE public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, user_id)
);

-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for users table
-- ============================================

-- Users can view all users (needed for household member display)
CREATE POLICY "Anyone can view users" ON public.users
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- RLS Policies for households table
-- ============================================

-- Members can view their household
CREATE POLICY "Members can view their household" ON public.households
  FOR SELECT USING (
    id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Users can insert households (when creating)
CREATE POLICY "Users can insert households" ON public.households
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Members can update their household
CREATE POLICY "Members can update their household" ON public.households
  FOR UPDATE USING (
    id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- RLS Policies for household_members table
-- ============================================

-- Members can view members of their household
CREATE POLICY "Members can view household members" ON public.household_members
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Users can insert themselves into households (when joining)
CREATE POLICY "Users can insert themselves" ON public.household_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Fast lookup of household members
CREATE INDEX idx_household_members_household_id
  ON public.household_members(household_id);

CREATE INDEX idx_household_members_user_id
  ON public.household_members(user_id);

-- Fast lookup by invite code
CREATE INDEX idx_households_invite_code
  ON public.households(invite_code);

-- ============================================
-- Done! Base tables created.
-- Run migration 001 next.
-- ============================================
