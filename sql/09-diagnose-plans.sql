-- ========================================
-- SCRIPT DE DIAGNÓSTICO: Verificar configuración de plan
-- ========================================

-- Ver todos los planes disponibles
SELECT id, name, slug, max_images_per_event 
FROM public.subscription_plans 
ORDER BY price;

-- Ver perfiles de organizadores y sus planes
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.subscription_plan_id,
  sp.name as plan_name,
  sp.slug as plan_slug,
  sp.max_images_per_event,
  p.subscription_status
FROM public.profiles p
LEFT JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
WHERE p.email IS NOT NULL  -- Filtrar solo usuarios reales
ORDER BY p.created_at DESC;

-- Ver eventos y su cantidad de imágenes
SELECT 
  e.id,
  e.title,
  p.email as organizer_email,
  sp.name as plan_name,
  sp.max_images_per_event as plan_limit,
  COUNT(ei.id) as current_images
FROM public.events e
JOIN public.profiles p ON e.organizer_id = p.id
LEFT JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
LEFT JOIN public.event_images ei ON e.id = ei.event_id
GROUP BY e.id, e.title, p.email, sp.name, sp.max_images_per_event
ORDER BY e.created_at DESC
LIMIT 20;

-- Si hay perfiles sin plan asignado, asignarles el plan gratuito
-- EJECUTAR SOLO SI ES NECESARIO:
/*
UPDATE public.profiles
SET 
  subscription_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'free'),
  subscription_status = 'active'
WHERE subscription_plan_id IS NULL;
*/
