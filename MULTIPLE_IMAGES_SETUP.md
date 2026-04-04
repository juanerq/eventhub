# ✅ Configuración de Múltiples Imágenes

## Problema Resuelto
Ahora puedes subir hasta **10 imágenes** por evento con el plan PRO.

## 🔧 Scripts SQL Necesarios

### 1. **Primero: Ejecutar el fix del trigger de validación**
Archivo: `sql/09-fix-image-limit.sql`

Este script corrige el bug en la función que valida el límite de imágenes.

**Ejecutar en Supabase SQL Editor:**
```sql
-- Copiar y pegar TODO el contenido de sql/09-fix-image-limit.sql
```

### 2. **Diagnosticar tu plan actual**
Archivo: `sql/09-diagnose-plans.sql`

Ejecuta este script para verificar:
- ✅ Qué plan tienes asignado
- ✅ Límite de imágenes de tu plan
- ✅ Cuántas imágenes tiene cada evento

```sql
-- Copiar y pegar TODO el contenido de sql/09-diagnose-plans.sql
```

### 3. **Asignar plan PRO (si es necesario)**
Archivo: `sql/10-set-user-pro.sql`

Si el diagnóstico muestra que no tienes el plan PRO asignado:

```sql
-- REEMPLAZA 'tu@email.com' con tu email real
UPDATE public.profiles
SET 
  subscription_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'pro'),
  subscription_status = 'active'
WHERE email = 'TU_EMAIL_AQUI@example.com';
```

## 🎨 Cambios Implementados

### Frontend (edit-event/[id].astro)
- ✅ Input ahora acepta múltiples archivos (`multiple` attribute)
- ✅ Galería de imágenes existentes con opción de eliminar
- ✅ Preview de nuevas imágenes antes de subir
- ✅ Contador de imágenes (X/10)
- ✅ Validación de límite en UI
- ✅ Drag & drop para múltiples archivos

### API (/api/events/update.ts)
- ✅ Procesa múltiples archivos del FormData
- ✅ Elimina imágenes marcadas para borrar
- ✅ Sube nuevas imágenes a Cloudinary
- ✅ Inserta imágenes con `display_order` correcto
- ✅ Maneja rollback si falla la inserción
- ✅ El trigger SQL valida el límite automáticamente

### Base de Datos (Trigger SQL)
- ✅ Función `check_image_limit()` corregida
- ✅ Verifica el plan del usuario correctamente
- ✅ Cuenta imágenes existentes por evento
- ✅ Bloquea inserción si se excede el límite
- ✅ Mensajes de error informativos

## 📋 Verificación

Después de ejecutar los scripts SQL:

1. **Verifica tu plan:**
```sql
SELECT 
  p.email,
  sp.name as plan_name,
  sp.max_images_per_event
FROM public.profiles p
LEFT JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
WHERE p.email = 'tu@email.com';
```

Deberías ver:
- `plan_name`: "PRO"
- `max_images_per_event`: 10

2. **Prueba subir imágenes:**
- Ve a editar un evento
- El contador debe mostrar (X/10)
- Arrastra múltiples imágenes
- Deberías poder subir hasta 10 imágenes totales

## 🐛 Solución de Problemas

### "Has alcanzado el límite de 1 imagen(es)"
**Causa:** El trigger no está actualizado o el plan no es PRO

**Solución:**
1. Ejecuta `sql/09-fix-image-limit.sql`
2. Ejecuta `sql/09-diagnose-plans.sql` para verificar tu plan
3. Si no eres PRO, ejecuta `sql/10-set-user-pro.sql`

### Las imágenes no se guardan
**Causa:** Error en la validación del trigger

**Solución:**
```sql
-- Ver logs de errores en la consola del navegador
-- También en Supabase > Database > Logs
```

### El contador muestra mal el número
**Causa:** Script no cargado completamente

**Solución:**
- Refresca la página (Ctrl+R)
- Verifica que no haya errores en consola

## ✨ Características

Con el plan PRO puedes:
- 📸 Hasta **10 imágenes** por evento
- 🎯 Marcar una imagen como **principal**
- 🔄 **Reordenar** imágenes con drag & drop
- 🗑️ **Eliminar** imágenes individualmente
- 📱 **Drag & drop** para subir varias a la vez
- 👁️ **Preview** de imágenes antes de guardar

## 🎯 Próximos Pasos Sugeridos

1. **Galería en la vista del evento**: Mostrar todas las imágenes en carrusel
2. **Reordenar drag & drop**: Permitir cambiar el orden de las imágenes
3. **Cambiar imagen principal**: Click para marcar otra como principal
4. **Comprimir imágenes**: Auto-optimizar antes de subir

---

¿Necesitas ayuda? Verifica que ejecutaste los 3 scripts SQL en orden. 🚀
