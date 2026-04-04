-- Script para configurar Supabase Storage para imágenes de eventos
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear el bucket para imágenes de eventos
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Habilitar RLS en el bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Política para permitir que cualquiera pueda leer las imágenes (público)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

-- 4. Política para permitir que usuarios autenticados suban imágenes
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

-- 5. Política para permitir que los organizadores eliminen sus propias imágenes
CREATE POLICY "Organizers can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

-- 6. Política para permitir que los organizadores actualicen sus propias imágenes
CREATE POLICY "Organizers can update their own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

-- Nota: El bucket ya está configurado para ser público, 
-- por lo que las URLs generadas serán accesibles sin autenticación.
