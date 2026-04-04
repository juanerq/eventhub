-- Script de verificación de eventos activos
-- Ejecutar en Supabase SQL Editor

-- 1. Ver el usuario actual (tu ID)
SELECT auth.uid() as "Tu User ID";

-- 2. Contar eventos por status
SELECT 
  status,
  COUNT(*) as total
FROM public.events
WHERE organizer_id = auth.uid()
GROUP BY status
ORDER BY status;

-- 3. Ver detalles de todos tus eventos
SELECT 
  title,
  status,
  created_at,
  start_date,
  category,
  city
FROM public.events
WHERE organizer_id = auth.uid()
ORDER BY created_at DESC;

-- 4. Probar la función get_user_plan_stats (ANTES del fix)
SELECT * FROM public.get_user_plan_stats(auth.uid());

-- 5. Verificar tu perfil y plan actual
SELECT 
  p.id,
  p.full_name,
  p.is_organizer,
  sp.name as plan_name,
  sp.slug as plan_slug,
  sp.max_active_events
FROM public.profiles p
JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
WHERE p.id = auth.uid();
