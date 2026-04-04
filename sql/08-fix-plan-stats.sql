-- Arreglar función get_user_plan_stats para contar todos los eventos activos
-- No solo los creados este mes, sino TODOS los eventos activos (draft o published)

-- Primero eliminar la función existente porque cambió el tipo de retorno
DROP FUNCTION IF EXISTS public.get_user_plan_stats(UUID);

-- Recrear con el esquema correcto
CREATE OR REPLACE FUNCTION public.get_user_plan_stats(user_id UUID)
RETURNS TABLE (
  plan_name TEXT,
  plan_slug TEXT,
  price DECIMAL,
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
  -- Contar TODOS los eventos activos del usuario (no solo del mes actual)
  -- Un evento es activo si está en estado 'published' o 'draft'
  SELECT COUNT(*)::INTEGER INTO v_current_events
  FROM public.events
  WHERE organizer_id = user_id
    AND status IN ('published', 'draft');

  RETURN QUERY
  SELECT 
    sp.name,
    sp.slug,
    sp.price,
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

-- Verificar que la función existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_plan_stats';
