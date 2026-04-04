# 📋 Orden de Ejecución de Scripts SQL

Ejecuta estos archivos en Supabase SQL Editor en el siguiente orden:

## 1️⃣ Configuración Inicial
```bash
01-profiles.sql  # Ya debería estar ejecutado (tabla profiles básica)
02-events.sql    # Ya debería estar ejecutado (tabla events)
```

## 2️⃣ Sistema de Planes de Suscripción
```bash
03-subscription-plans.sql    # ⭐ Ejecutar primero
```
Este archivo crea:
- ✅ Tabla `subscription_plans` con planes Free y PRO
- ✅ Agrega columna `subscription_plan_id` a `profiles`
- ✅ Tabla `event_images` para imágenes de eventos
- ✅ Triggers de validación de límites
- ✅ Función `get_user_plan_stats()` para obtener estadísticas

## 3️⃣ Verificar y Configurar
```bash
04-verify-plans.sql    # ⭐ Ejecutar segundo
```
Este archivo:
- ✅ Verifica que los planes existan
- ✅ Actualiza perfiles sin plan asignado
- ✅ Da permisos a la función RPC
- ✅ Permite consultar los planes

## 4️⃣ Actualizar Trigger de Registro
```bash
05-update-profile-trigger.sql    # ⭐ Ejecutar tercero
```
Este archivo:
- ✅ Actualiza el trigger para que asigne plan gratuito automáticamente
- ✅ Cuando un usuario se registre, tendrá el plan Free por defecto

---

## 🔍 Verificación

Después de ejecutar todos los scripts, verifica que todo funcione:

### 1. Ver tus planes disponibles:
```sql
SELECT * FROM public.subscription_plans;
```
Deberías ver:
- Gratuito (free) - $0
- PRO (pro) - $20,000,000

### 2. Ver tu perfil con el plan asignado:
```sql
SELECT 
  p.id,
  p.full_name,
  p.is_organizer,
  sp.name as plan_name,
  sp.slug as plan_slug,
  p.subscription_status
FROM public.profiles p
LEFT JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
WHERE p.id = auth.uid();
```

### 3. Probar la función de estadísticas:
```sql
SELECT * FROM public.get_user_plan_stats(auth.uid());
```
Deberías ver tus estadísticas completas del plan.

---

## 🚨 Solución de Problemas

### Si la página de perfil no carga datos:

1. **Abre la consola del navegador** (F12)
2. Ve a la pestaña "Console"
3. Busca errores en rojo
4. Si ves errores del tipo "function does not exist", ejecuta nuevamente `04-verify-plans.sql`

### Si no tienes plan asignado:

Ejecuta manualmente:
```sql
UPDATE public.profiles
SET 
  subscription_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'free'),
  subscription_status = 'active'
WHERE id = auth.uid();
```

### Si los nuevos usuarios no obtienen plan automáticamente:

Ejecuta `05-update-profile-trigger.sql` nuevamente.

---

## ✅ Test Completo

Para crear un usuario de prueba y verificar:

1. Registra un nuevo usuario en `/login`
2. Ve al SQL Editor y ejecuta:
```sql
SELECT 
  u.email,
  p.full_name,
  p.is_organizer,
  sp.name as plan_name,
  p.subscription_status
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
WHERE u.email = 'email-del-nuevo-usuario@ejemplo.com';
```

Si todo está bien, deberías ver el plan "Gratuito" asignado automáticamente.

---

## 🎯 Gestión Dinámica de Planes

Los planes de suscripción se cargan **dinámicamente** desde la base de datos. Esto significa que puedes:

### ✅ Modificar planes sin tocar código

**Cambiar precios:**
```sql
UPDATE public.subscription_plans
SET price = 15000000
WHERE slug = 'pro';
```

**Cambiar límites:**
```sql
UPDATE public.subscription_plans
SET 
  max_active_events = 5,
  max_capacity_per_event = 50
WHERE slug = 'free';
```

### ✅ Agregar nuevos planes

```sql
INSERT INTO public.subscription_plans 
  (name, slug, price, max_active_events, max_images_per_event, max_capacity_per_event, can_feature_events, description)
VALUES 
  ('Plus', 'plus', 10000000, 10, 3, 100, FALSE, 'Plan intermedio');
```

Los cambios se reflejarán **automáticamente** en:
- 📝 Formulario de registro (`/login`)
- 👤 Página de perfil (`/profile`)
- 📊 Dashboard de estadísticas

### 📄 Ver más ejemplos

Consulta [sql/06-update-plans.sql](sql/06-update-plans.sql) para más ejemplos de modificación de planes.

---