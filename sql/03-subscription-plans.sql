-- ========================================
-- TABLA DE PLANES
-- ========================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  max_active_events INTEGER, -- NULL = ilimitado
  max_images_per_event INTEGER NOT NULL DEFAULT 1,
  max_capacity_per_event INTEGER, -- NULL = ilimitado
  can_feature_events BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar planes predefinidos
INSERT INTO public.subscription_plans (name, slug, price, max_active_events, max_images_per_event, max_capacity_per_event, can_feature_events, description)
VALUES 
  (
    'Gratuito',
    'free',
    0,
    3,
    1,
    30,
    FALSE,
    'Plan gratuito con funcionalidades básicas'
  ),
  (
    'PRO',
    'pro',
    20000000,
    NULL, -- eventos ilimitados
    10, -- múltiples imágenes
    NULL, -- capacidad ilimitada
    TRUE,
    'Plan profesional con todas las funcionalidades'
  )
ON CONFLICT (slug) DO NOTHING;

-- Habilitar RLS y permitir lectura pública de planes
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Plans are viewable by everyone"
  ON public.subscription_plans FOR SELECT
  USING (true);

-- Dar permisos de lectura
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT ON public.subscription_plans TO anon;

-- ========================================
-- MODIFICAR TABLA PROFILES
-- ========================================
-- Agregar columnas para el plan de suscripción (sin DEFAULT con subquery)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES public.subscription_plans(id),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Actualizar perfiles existentes con plan gratuito por defecto
UPDATE public.profiles
SET subscription_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'free')
WHERE subscription_plan_id IS NULL;

-- Crear función para obtener el plan gratuito por defecto
CREATE OR REPLACE FUNCTION public.get_default_plan_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE;

-- Establecer el DEFAULT usando la función
ALTER TABLE public.profiles 
ALTER COLUMN subscription_plan_id SET DEFAULT public.get_default_plan_id();

-- ========================================
-- TABLA DE IMÁGENES DE EVENTOS
-- ========================================
CREATE TABLE IF NOT EXISTS public.event_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.event_images ENABLE ROW LEVEL SECURITY;

-- Políticas para imágenes
CREATE POLICY "Event images are viewable by everyone"
  ON public.event_images FOR SELECT
  USING (true);

CREATE POLICY "Organizers can insert images for their events"
  ON public.event_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can update images for their events"
  ON public.event_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can delete images for their events"
  ON public.event_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Índices
CREATE INDEX idx_event_images_event ON public.event_images(event_id);
CREATE INDEX idx_event_images_primary ON public.event_images(event_id, is_primary) WHERE is_primary = TRUE;

-- ========================================
-- FUNCIÓN PARA VALIDAR LÍMITES DEL PLAN
-- ========================================
CREATE OR REPLACE FUNCTION public.check_plan_limits()
RETURNS TRIGGER AS $$
DECLARE
  user_plan RECORD;
  active_events_count INTEGER;
  event_capacity INTEGER;
BEGIN
  -- Obtener el plan del usuario
  SELECT 
    sp.max_active_events,
    sp.max_capacity_per_event,
    sp.can_feature_events
  INTO user_plan
  FROM public.profiles p
  JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
  WHERE p.id = NEW.organizer_id;

  -- Validar número de eventos activos al mes
  IF user_plan.max_active_events IS NOT NULL THEN
    SELECT COUNT(*)
    INTO active_events_count
    FROM public.events
    WHERE organizer_id = NEW.organizer_id
      AND status IN ('published', 'draft')
      AND created_at >= date_trunc('month', CURRENT_DATE)
      AND (TG_OP = 'INSERT' OR id != NEW.id); -- Excluir el evento actual en UPDATE

    IF active_events_count >= user_plan.max_active_events THEN
      RAISE EXCEPTION 'Has alcanzado el límite de % eventos activos al mes. Actualiza a PRO para eventos ilimitados.', user_plan.max_active_events;
    END IF;
  END IF;

  -- Validar capacidad del evento
  IF user_plan.max_capacity_per_event IS NOT NULL AND NEW.capacity IS NOT NULL THEN
    IF NEW.capacity > user_plan.max_capacity_per_event THEN
      RAISE EXCEPTION 'La capacidad máxima permitida en tu plan es de % personas. Actualiza a PRO para capacidad ilimitada.', user_plan.max_capacity_per_event;
    END IF;
  END IF;

  -- Validar eventos destacados
  IF NEW.is_featured = TRUE AND user_plan.can_feature_events = FALSE THEN
    RAISE EXCEPTION 'Los eventos destacados solo están disponibles en el plan PRO.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar límites al crear/actualizar eventos
DROP TRIGGER IF EXISTS validate_plan_limits ON public.events;
CREATE TRIGGER validate_plan_limits
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.check_plan_limits();

-- ========================================
-- FUNCIÓN PARA VALIDAR LÍMITE DE IMÁGENES
-- ========================================
CREATE OR REPLACE FUNCTION public.check_image_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_plan RECORD;
  current_images_count INTEGER;
  event_owner UUID;
BEGIN
  -- Obtener el dueño del evento
  SELECT organizer_id INTO event_owner
  FROM public.events
  WHERE id = NEW.event_id;

  -- Obtener el límite de imágenes del plan
  SELECT sp.max_images_per_event
  INTO user_plan
  FROM public.profiles p
  JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
  WHERE p.id = event_owner;

  -- Contar imágenes existentes para este evento
  SELECT COUNT(*)
  INTO current_images_count
  FROM public.event_images
  WHERE event_id = NEW.event_id;

  -- Validar límite
  IF current_images_count >= user_plan.max_images_per_event THEN
    RAISE EXCEPTION 'Has alcanzado el límite de % imagen(es) por evento. Actualiza a PRO para múltiples imágenes.', user_plan.max_images_per_event;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar límite de imágenes
DROP TRIGGER IF EXISTS validate_image_limit ON public.event_images;
CREATE TRIGGER validate_image_limit
  BEFORE INSERT ON public.event_images
  FOR EACH ROW
  EXECUTE FUNCTION public.check_image_limit();

-- ========================================
-- FUNCIÓN PARA OBTENER ESTADÍSTICAS DEL PLAN
-- ========================================
CREATE OR REPLACE FUNCTION public.get_user_plan_stats(user_id UUID)
RETURNS TABLE (
  plan_name TEXT,
  plan_slug TEXT,
  max_active_events INTEGER,
  current_active_events INTEGER,
  max_images_per_event INTEGER,
  max_capacity_per_event INTEGER,
  can_feature_events BOOLEAN,
  events_remaining INTEGER
) AS $$
DECLARE
  v_current_events INTEGER;
BEGIN
  -- Contar eventos activos del usuario en el mes actual
  SELECT COUNT(*)::INTEGER INTO v_current_events
  FROM public.events
  WHERE organizer_id = user_id
    AND status IN ('published', 'draft')
    AND created_at >= date_trunc('month', CURRENT_DATE);

  RETURN QUERY
  SELECT 
    sp.name,
    sp.slug,
    sp.max_active_events,
    v_current_events as current_active,
    sp.max_images_per_event,
    sp.max_capacity_per_event,
    sp.can_feature_events,
    CASE 
      WHEN sp.max_active_events IS NULL THEN NULL
      ELSE sp.max_active_events - v_current_events
    END as remaining
  FROM public.profiles p
  JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
  WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
