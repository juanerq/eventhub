-- EventHub Database Schema
-- This file contains the SQL schema for the EventHub platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- USERS TABLE (handled by Supabase Auth)
-- ==============================================
-- Supabase Auth already provides:
-- - auth.users table with id, email, encrypted_password, etc.
-- - We use user_metadata to store: full_name, is_organizer

-- ==============================================
-- PROFILES TABLE (Extended user information)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  is_organizer BOOLEAN DEFAULT FALSE,
  bio TEXT,
  avatar_url TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ==============================================
-- EVENTS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'party', 'concert', 'sports', 'workshop', 'networking', etc.
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  location_name TEXT,
  city TEXT NOT NULL,
  country TEXT DEFAULT 'Colombia',
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  price DECIMAL(10, 2) DEFAULT 0,
  capacity INTEGER,
  is_free BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE, -- For sponsored/promoted events
  image_url TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'cancelled', 'completed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies for events
CREATE POLICY "Published events are viewable by everyone"
  ON public.events FOR SELECT
  USING (status = 'published' OR auth.uid() = organizer_id);

CREATE POLICY "Organizers can insert their own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their own events"
  ON public.events FOR DELETE
  USING (auth.uid() = organizer_id);

-- ==============================================
-- FAVORITES TABLE (User saved events)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

-- Enable Row Level Security
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Policies for favorites
CREATE POLICY "Users can view their own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================
-- TICKETS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1,
  total_price DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'refunded'
  payment_id TEXT, -- For payment gateway integration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Policies for tickets
CREATE POLICY "Users can view their own tickets"
  ON public.tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Organizers can view tickets for their events"
  ON public.tickets FOR SELECT
  USING (
    auth.uid() IN (
      SELECT organizer_id FROM public.events WHERE id = event_id
    )
  );

CREATE POLICY "Users can insert their own tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==============================================
-- FUNCTIONS
-- ==============================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, is_organizer)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE((NEW.raw_user_meta_data->>'is_organizer')::BOOLEAN, FALSE)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- INDEXES for better performance
-- ==============================================
CREATE INDEX idx_events_organizer ON public.events(organizer_id);
CREATE INDEX idx_events_city ON public.events(city);
CREATE INDEX idx_events_category ON public.events(category);
CREATE INDEX idx_events_start_date ON public.events(start_date);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_featured ON public.events(is_featured) WHERE is_featured = TRUE;

CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_favorites_event ON public.favorites(event_id);

CREATE INDEX idx_tickets_user ON public.tickets(user_id);
CREATE INDEX idx_tickets_event ON public.tickets(event_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
