-- ========================================
-- FIX: Corregir validación de límite de imágenes
-- ========================================

-- La función anterior tenía un bug donde user_plan.max_images_per_event
-- no se accedía correctamente. También vamos a mejorar los mensajes de error.

CREATE OR REPLACE FUNCTION public.check_image_limit()
RETURNS TRIGGER AS $$
DECLARE
  max_images INTEGER;
  current_images_count INTEGER;
  event_owner UUID;
  user_plan_name TEXT;
BEGIN
  -- Obtener el dueño del evento
  SELECT organizer_id INTO event_owner
  FROM public.events
  WHERE id = NEW.event_id;

  -- Si no encontramos el dueño, permitir la operación (será validado en otro lado)
  IF event_owner IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener el límite de imágenes del plan del usuario
  SELECT sp.max_images_per_event, sp.name
  INTO max_images, user_plan_name
  FROM public.profiles p
  JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
  WHERE p.id = event_owner;

  -- Si no encontramos plan, usar el plan gratuito por defecto
  IF max_images IS NULL THEN
    SELECT max_images_per_event INTO max_images
    FROM public.subscription_plans
    WHERE slug = 'free'
    LIMIT 1;
    
    user_plan_name := 'Gratuito';
  END IF;

  -- Si aún no hay límite (no debería pasar), usar 1 como fallback
  IF max_images IS NULL THEN
    max_images := 1;
  END IF;

  -- Contar imágenes existentes para este evento
  SELECT COUNT(*)
  INTO current_images_count
  FROM public.event_images
  WHERE event_id = NEW.event_id;

  -- Validar límite
  IF current_images_count >= max_images THEN
    RAISE EXCEPTION 'Has alcanzado el límite de % imagen(es) por evento con tu plan %. Actualiza a PRO para subir hasta 10 imágenes.', 
      max_images, 
      user_plan_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
DROP TRIGGER IF EXISTS validate_image_limit ON public.event_images;
CREATE TRIGGER validate_image_limit
  BEFORE INSERT ON public.event_images
  FOR EACH ROW
  EXECUTE FUNCTION public.check_image_limit();

-- Verificar que los planes tienen los valores correctos
UPDATE public.subscription_plans
SET max_images_per_event = 1
WHERE slug = 'free';

UPDATE public.subscription_plans
SET max_images_per_event = 10
WHERE slug = 'pro';
