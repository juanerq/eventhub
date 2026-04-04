-- ========================================
-- MIGRACIÓN: Mover imágenes a event_images
-- ========================================

-- 1. Migrar imágenes existentes de events.image_url a event_images
INSERT INTO public.event_images (event_id, image_url, is_primary, display_order)
SELECT 
  id as event_id,
  image_url,
  TRUE as is_primary,
  0 as display_order
FROM public.events
WHERE image_url IS NOT NULL AND image_url != '';

-- 2. Eliminar la columna image_url de la tabla events
ALTER TABLE public.events DROP COLUMN IF EXISTS image_url;

-- 3. Agregar comentario a la tabla
COMMENT ON TABLE public.event_images IS 'Tabla para almacenar múltiples imágenes por evento. La imagen primaria (is_primary=true) se usa como portada.';
