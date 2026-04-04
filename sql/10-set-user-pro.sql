-- ========================================
-- ACTUALIZAR USUARIO A PLAN PRO
-- ========================================
-- Ejecutar este script para asignar el plan PRO a un usuario específico

-- OPCIÓN 1: Actualizar por email
-- Reemplaza 'tu@email.com' con el email del usuario
UPDATE public.profiles
SET 
  subscription_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'pro'),
  subscription_status = 'active'
WHERE email = 'tu@email.com';

-- OPCIÓN 2: Actualizar el último usuario registrado (para testing)
/*
UPDATE public.profiles
SET 
  subscription_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'pro'),
  subscription_status = 'active'
WHERE id = (
  SELECT id FROM public.profiles 
  ORDER BY created_at DESC 
  LIMIT 1
);
*/

-- Verificar el cambio
SELECT 
  p.id,
  p.full_name,
  p.email,
  sp.name as plan_name,
  sp.max_images_per_event,
  p.subscription_status
FROM public.profiles p
LEFT JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
WHERE p.email IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 5;
