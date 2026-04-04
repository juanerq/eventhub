# Guía de Migración - Sistema Multi-imagen

## 📋 Resumen

Esta migración transforma el sistema de imágenes de eventos de un campo único (`image_url`) a una arquitectura multi-imagen usando la tabla `event_images`. Esto permite:

- ✅ Múltiples imágenes por evento
- ✅ Selección de imagen primaria
- ✅ Ordenamiento de imágenes
- ✅ Mejor separación de responsabilidades
- ✅ Soporte para planes FREE (1 imagen) y PRO (10 imágenes)

## 🔄 Cambios Realizados en el Código

### API Endpoints Actualizados

1. **`src/pages/api/events/create.ts`**
   - ✅ Eliminado `image_url` del objeto del evento
   - ✅ Agregada inserción en `event_images` después de crear evento
   - ✅ Inserta imagen con `is_primary=true` y `display_order=0`

2. **`src/pages/api/events/update.ts`**
   - ✅ Consulta imagen primaria desde `event_images`
   - ✅ Eliminada referencia a `event.image_url`
   - ✅ Actualiza/elimina/inserta en `event_images` según acción
   - ✅ Soporte para remover y subir nuevas imágenes

3. **`src/pages/api/events/list.ts`**
   - ✅ Consulta imágenes primarias desde `event_images`
   - ✅ Agrega `image_url` al objeto de cada evento para compatibilidad

### Frontend Actualizado

1. **`src/pages/my-events.astro`**
   - ✅ Consulta imágenes desde `event_images` al cargar eventos
   - ✅ Agrega `image_url` al objeto de cada evento

2. **`src/pages/edit-event/[id].astro`**
   - ✅ Carga imagen primaria desde `event_images`
   - ✅ Mantiene compatibilidad con formulario existente

3. **`src/components/EventCard.astro`**
   - ✅ Sin cambios necesarios (usa `event.image_url` que se agrega en consultas)

## 🗄️ Migración de Base de Datos

### ⚠️ IMPORTANTE: Ejecutar en orden

El archivo `sql/04-migrate-to-event-images.sql` contiene 3 pasos:

1. **Migrar imágenes existentes**: Copia todas las imágenes de `events.image_url` a `event_images`
2. **Eliminar columna antigua**: Elimina `image_url` de la tabla `events`
3. **Documentar**: Agrega comentario explicativo a la tabla

### 📝 Instrucciones de Ejecución

#### Opción 1: Supabase Dashboard (Recomendado)

1. Abre tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **SQL Editor** en el menú lateral
3. Crea una nueva query
4. Copia el contenido completo de `sql/04-migrate-to-event-images.sql`
5. Pégalo en el editor
6. Haz clic en **Run** para ejecutar la migración
7. Verifica que no haya errores en la consola

#### Opción 2: CLI de Supabase (Si está instalado)

```bash
# Ejecutar migración
supabase db push --file sql/04-migrate-to-event-images.sql
```

#### Opción 3: psql (Conexión directa)

```bash
# Obtén las credenciales de conexión desde Supabase Dashboard > Settings > Database
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" < sql/04-migrate-to-event-images.sql
```

### ✅ Verificación Post-Migración

Después de ejecutar la migración, verifica:

```sql
-- 1. Verificar que las imágenes se migraron
SELECT COUNT(*) FROM event_images;
-- Debe mostrar el número de eventos que tenían imagen_url

-- 2. Verificar que la columna image_url fue eliminada
\d events
-- No debe aparecer la columna image_url

-- 3. Verificar que las imágenes tienen is_primary=true
SELECT event_id, image_url, is_primary FROM event_images LIMIT 5;
-- Todas deben tener is_primary=true
```

## 🧪 Pruebas Necesarias

Después de la migración, prueba los siguientes escenarios:

- [ ] **Crear evento nuevo con imagen**
  - Sube una imagen
  - Verifica que aparezca en la tarjeta del evento
  - Confirma que se creó una fila en `event_images`

- [ ] **Editar evento existente**
  - Cambia la imagen de un evento
  - Verifica que la antigua se elimine de storage
  - Confirma que la nueva aparece correctamente

- [ ] **Eliminar imagen de evento**
  - Marca "Eliminar imagen actual" en el formulario de edición
  - Verifica que desaparece de la vista
  - Confirma que se eliminó de `event_images`

- [ ] **Visualizar eventos en dashboard**
  - Verifica que todos los eventos muestren sus imágenes
  - Confirma que los eventos sin imagen muestran placeholder

- [ ] **Visualizar "Mis Eventos"**
  - Verifica que tus eventos muestren las imágenes correctas
  - Edita uno y verifica la actualización

## 🔒 Rollback (En caso de problemas)

Si necesitas revertir la migración:

```sql
-- 1. Re-agregar columna image_url
ALTER TABLE public.events ADD COLUMN image_url TEXT;

-- 2. Copiar URLs de vuelta desde event_images
UPDATE public.events e
SET image_url = ei.image_url
FROM public.event_images ei
WHERE e.id = ei.event_id
  AND ei.is_primary = true;

-- 3. (Opcional) Eliminar registros de event_images
-- DELETE FROM public.event_images;
```

Luego restaura los archivos modificados desde Git:

```bash
git checkout src/pages/api/events/create.ts
git checkout src/pages/api/events/update.ts
git checkout src/pages/api/events/list.ts
git checkout src/pages/my-events.astro
git checkout src/pages/edit-event/[id].astro
```

## 📈 Próximos Pasos (Funcionalidades Futuras)

Con esta arquitectura ahora puedes implementar:

1. **Galería de imágenes en evento**
   - Mostrar todas las imágenes del evento en una galería
   - Navegación tipo carousel

2. **Subida múltiple en formulario**
   - Permitir subir hasta 10 imágenes (plan PRO) o 1 (plan FREE)
   - Interfaz drag-and-drop

3. **Reordenamiento de imágenes**
   - Cambiar `display_order` arrastrando imágenes
   - Seleccionar cualquier imagen como primaria

4. **Optimización de rendimiento**
   - Lazy loading de imágenes
   - Generación de thumbnails

## 🆘 Soporte

Si tienes problemas con la migración:

1. Revisa los logs de Supabase en el Dashboard
2. Verifica que la tabla `event_images` existe y tiene las políticas RLS correctas
3. Confirma que el trigger de límite de imágenes está activo
4. Consulta la documentación de Supabase sobre migrations

---

**Fecha de creación**: 2024
**Versión**: 1.0
**Estado**: ✅ Código listo - ⚠️ Migración SQL pendiente de ejecución
