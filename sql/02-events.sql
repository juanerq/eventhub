-- Tabla de eventos
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
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
  is_featured BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  status TEXT DEFAULT 'draft',
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

-- Índices para mejor rendimiento
CREATE INDEX idx_events_organizer ON public.events(organizer_id);
CREATE INDEX idx_events_city ON public.events(city);
CREATE INDEX idx_events_category ON public.events(category);
CREATE INDEX idx_events_start_date ON public.events(start_date);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_featured ON public.events(is_featured) WHERE is_featured = TRUE;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
