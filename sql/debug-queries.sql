-- 🔧 Queries útiles para debugging del sistema de planes

-- ============================================
-- 1. VER TU USUARIO Y PLAN ACTUAL
-- ============================================
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as registered_at,
  p.full_name,
  p.is_organizer,
  sp.name as plan_name,
  sp.slug as plan_slug,
  sp.price as plan_price,
  p.subscription_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
WHERE u.email = 'juanerq@gmail.com';  -- Cambia por tu email


-- ============================================
-- 2. VER ESTADÍSTICAS DE TU PLAN
-- ============================================
-- Primero obtén tu UUID del query anterior, luego:
SELECT * FROM public.get_user_plan_stats('pega-tu-uuid-aqui');


-- ============================================
-- 3. CONTAR TUS EVENTOS ACTIVOS ESTE MES
-- ============================================
SELECT 
  COUNT(*) as eventos_este_mes,
  status,
  to_char(created_at, 'YYYY-MM') as mes
FROM public.events
WHERE organizer_id = auth.uid()
  AND status IN ('published', 'draft')
  AND created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY status, mes;


-- ============================================
-- 4. VER TODOS LOS EVENTOS QUE HAS CREADO
-- ============================================
SELECT 
  id,
  title,
  category,
  status,
  capacity,
  is_featured,
  created_at,
  start_date
FROM public.events
WHERE organizer_id = auth.uid()
ORDER BY created_at DESC;


-- ============================================
-- 5. ASIGNAR PLAN GRATUITO MANUALMENTE
-- ============================================
UPDATE public.profiles
SET 
  subscription_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'free'),
  subscription_status = 'active'
WHERE id = auth.uid();


-- ============================================
-- 6. CAMBIAR A PLAN PRO (PARA PRUEBAS)
-- ============================================
UPDATE public.profiles
SET 
  subscription_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'pro'),
  subscription_status = 'active'
WHERE id = auth.uid();


-- ============================================
-- 7. VER TODOS LOS USUARIOS Y SUS PLANES
-- ============================================
SELECT 
  u.email,
  p.full_name,
  p.is_organizer,
  sp.name as plan,
  sp.slug,
  p.subscription_status,
  (
    SELECT COUNT(*)
    FROM public.events e
    WHERE e.organizer_id = u.id
      AND e.created_at >= date_trunc('month', CURRENT_DATE)
  ) as eventos_este_mes
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
ORDER BY u.created_at DESC;


-- ============================================
-- 8. PROBAR LÍMITES DEL PLAN
-- ============================================
-- Intenta crear un evento que exceda tu límite de capacidad:
-- (Esto debería fallar si estás en plan Free y pones más de 30)
INSERT INTO public.events (
  organizer_id,
  title,
  category,
  start_date,
  city,
  capacity,
  status
) VALUES (
  auth.uid(),
  'Evento de Prueba',
  'concert',
  NOW() + INTERVAL '7 days',
  'Bogotá',
  50,  -- Intenta poner más de 30 si estás en plan Free
  'draft'
);


-- ============================================
-- 9. LIMPIAR EVENTOS DE PRUEBA
-- ============================================
DELETE FROM public.events
WHERE organizer_id = auth.uid()
  AND title LIKE '%Prueba%';


-- ============================================
-- 10. VER LOGS DE ERRORES DEL TRIGGER
-- ============================================
-- Si un evento no se crea, el trigger lanza una excepción
-- No se guardan logs, pero puedes ver el error en el cliente


-- ============================================
-- 11. VERIFICAR QUE LA FUNCIÓN RPC FUNCIONA
-- ============================================
-- Esto es lo que llama la aplicación desde el frontend
SELECT 
  plan_name,
  plan_slug,
  max_active_events,
  current_active_events,
  max_capacity_per_event,
  can_feature_events,
  events_remaining
FROM public.get_user_plan_stats(auth.uid());


-- ============================================
-- 12. RESETEAR TU PLAN (VOLVER A FREE)
-- ============================================
UPDATE public.profiles
SET 
  subscription_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'free'),
  subscription_status = 'active'
WHERE id = auth.uid();


-- ============================================
-- 13. VER PERMISOS DE LA FUNCIÓN RPC
-- ============================================
SELECT 
  routine_schema,
  routine_name,
  privilege_type,
  grantee
FROM information_schema.routine_privileges
WHERE routine_name = 'get_user_plan_stats';
