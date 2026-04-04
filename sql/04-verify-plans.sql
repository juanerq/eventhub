-- Script para verificar y reparar el sistema de planes de suscripción
-- Ejecutar DESPUÉS de 03-subscription-plans.sql

-- 1. Verificar que existen los planes
SELECT * FROM public.subscription_plans;

-- 2. Actualizar perfiles que no tengan plan asignado
UPDATE public.profiles
SET subscription_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1)
WHERE subscription_plan_id IS NULL;

-- 3. Verificar los perfiles
SELECT 
  p.id,
  p.full_name,
  p.is_organizer,
  p.subscription_plan_id,
  sp.name as plan_name,
  sp.slug as plan_slug
FROM public.profiles p
LEFT JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id;

-- 4. Probar la función get_user_plan_stats con tu ID de usuario
-- Primero, obtén tu ID de usuario ejecutando esto y copiando el valor de 'id':
SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'juanerq@gmail.com';

-- Luego reemplaza 'TU_USER_ID' con el ID que obtuviste arriba:
-- SELECT * FROM public.get_user_plan_stats('TU_USER_ID');

-- Ejemplo de prueba completa (reemplaza el UUID con el tuyo):
-- SELECT * FROM public.get_user_plan_stats('uuid-aqui');

-- 5. Dar permisos para la función RPC (importante para que Supabase pueda llamarla)
GRANT EXECUTE ON FUNCTION public.get_user_plan_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan_stats(UUID) TO anon;

-- 6. Asegurar que las tablas tienen los permisos correctos
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT ON public.subscription_plans TO anon;

-- 7. Permitir consultas públicas de planes (importante para el formulario de registro)
-- Esto permite que usuarios NO autenticados vean los planes disponibles
CREATE POLICY IF NOT EXISTS "Plans are viewable by everyone"
  ON public.subscription_plans FOR SELECT
  USING (true);

-- Habilitar RLS si no está habilitado
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
