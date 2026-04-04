-- Actualizar el trigger de creación de perfiles para asignar plan gratuito
-- Ejecutar DESPUÉS de 03-subscription-plans.sql

-- Eliminar el trigger existente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Crear función actualizada que asigna el plan según el metadata del usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  selected_plan_slug TEXT;
  plan_id UUID;
BEGIN
  -- Obtener el plan seleccionado del metadata del usuario (default: 'free')
  selected_plan_slug := COALESCE(NEW.raw_user_meta_data->>'subscription_plan', 'free');

  -- Obtener el ID del plan seleccionado
  SELECT id INTO plan_id
  FROM public.subscription_plans
  WHERE slug = selected_plan_slug
  LIMIT 1;

  -- Si no se encuentra el plan, usar el gratuito
  IF plan_id IS NULL THEN
    SELECT id INTO plan_id
    FROM public.subscription_plans
    WHERE slug = 'free'
    LIMIT 1;
  END IF;

  -- Insertar el perfil con el plan seleccionado
  INSERT INTO public.profiles (id, full_name, is_organizer, subscription_plan_id, subscription_status)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE((NEW.raw_user_meta_data->>'is_organizer')::BOOLEAN, FALSE),
    plan_id,
    'active'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Actualizar perfiles existentes que no tienen plan asignado
UPDATE public.profiles
SET 
  subscription_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1),
  subscription_status = 'active'
WHERE subscription_plan_id IS NULL;
