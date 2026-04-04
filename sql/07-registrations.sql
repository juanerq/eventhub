-- Tabla de inscripciones/registros a eventos
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  additional_info TEXT,
  ticket_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'confirmed', -- confirmed, cancelled, attended
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id) -- Un usuario solo puede inscribirse una vez por evento
);

-- Enable Row Level Security
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Policies for registrations
CREATE POLICY "Users can view their own registrations"
  ON public.event_registrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Organizers can view registrations for their events"
  ON public.event_registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_registrations.event_id
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own registrations"
  ON public.event_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations"
  ON public.event_registrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Organizers can update registrations for their events"
  ON public.event_registrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_registrations.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Índices para mejor rendimiento
CREATE INDEX idx_registrations_event ON public.event_registrations(event_id);
CREATE INDEX idx_registrations_user ON public.event_registrations(user_id);
CREATE INDEX idx_registrations_status ON public.event_registrations(status);
CREATE INDEX idx_registrations_ticket ON public.event_registrations(ticket_number);

-- Trigger para updated_at
CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función para generar número de ticket único
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  ticket TEXT;
BEGIN
  ticket := 'TKT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  RETURN ticket;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar ticket_number automáticamente
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_registration_ticket_number
  BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION set_ticket_number();
