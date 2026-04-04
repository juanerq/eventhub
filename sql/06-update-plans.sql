-- ====================================
-- ACTUALIZAR PLANES DE SUSCRIPCIÓN
-- ====================================
-- Usa estos queries para modificar los planes existentes

-- 1. Ver los planes actuales
SELECT 
  name,
  slug,
  price,
  max_active_events,
  max_images_per_event,
  max_capacity_per_event,
  can_feature_events,
  description
FROM public.subscription_plans
ORDER BY price;


-- 2. Actualizar el precio del plan PRO
UPDATE public.subscription_plans
SET price = 25000000  -- Nuevo precio: $25.000.000
WHERE slug = 'pro';


-- 3. Modificar los límites del plan Gratuito
UPDATE public.subscription_plans
SET 
  max_active_events = 5,  -- Cambiar de 3 a 5 eventos
  max_capacity_per_event = 50  -- Cambiar de 30 a 50 personas
WHERE slug = 'free';


-- 4. Actualizar descripción de un plan
UPDATE public.subscription_plans
SET description = 'Plan gratuito mejorado con más eventos'
WHERE slug = 'free';


-- 5. Agregar un nuevo plan INTERMEDIO (opcional)
INSERT INTO public.subscription_plans 
  (name, slug, price, max_active_events, max_images_per_event, max_capacity_per_event, can_feature_events, description)
VALUES 
  (
    'Plus',
    'plus',
    5000000,
    10,
    3,
    100,
    FALSE,
    'Plan intermedio con más capacidad'
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  max_active_events = EXCLUDED.max_active_events,
  max_images_per_event = EXCLUDED.max_images_per_event,
  max_capacity_per_event = EXCLUDED.max_capacity_per_event,
  can_feature_events = EXCLUDED.can_feature_events,
  description = EXCLUDED.description;


-- 6. Eliminar un plan (¡CUIDADO! Solo si no hay usuarios con ese plan)
-- DELETE FROM public.subscription_plans WHERE slug = 'plus';


-- 7. Verificar cuántos usuarios tiene cada plan
SELECT 
  sp.name as plan_name,
  sp.slug,
  sp.price,
  COUNT(p.id) as total_usuarios
FROM public.subscription_plans sp
LEFT JOIN public.profiles p ON sp.id = p.subscription_plan_id
GROUP BY sp.id, sp.name, sp.slug, sp.price
ORDER BY sp.price;


-- 8. Cambiar usuarios de un plan a otro
-- Ejemplo: Migrar usuarios del plan 'free' al plan 'plus'
-- UPDATE public.profiles
-- SET subscription_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'plus')
-- WHERE subscription_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'free');


-- ====================================
-- EJEMPLOS DE CONFIGURACIONES
-- ====================================

-- Plan totalmente gratis pero muy limitado
UPDATE public.subscription_plans
SET 
  max_active_events = 1,
  max_images_per_event = 1,
  max_capacity_per_event = 20,
  can_feature_events = FALSE
WHERE slug = 'free';

-- Plan PRO con todo ilimitado
UPDATE public.subscription_plans
SET 
  max_active_events = NULL,  -- NULL = ilimitado
  max_images_per_event = 20,
  max_capacity_per_event = NULL,  -- NULL = ilimitado
  can_feature_events = TRUE
WHERE slug = 'pro';
