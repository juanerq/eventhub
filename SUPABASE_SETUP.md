# Guía de Configuración de Supabase

## 1. Configuración Inicial

Ya tienes configuradas las credenciales de Supabase en el archivo `.env`:

```env
SUPABASE_URL=https://jzctrgtbuvtytqlkwwnw.supabase.co
SUPABASE_KEY=tu_supabase_anon_key
```

## 2. Configurar Base de Datos

### Opción A: Usar el SQL Editor de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a "SQL Editor" en el menú lateral
3. Copia el contenido de `supabase-schema.sql`
4. Pégalo en el editor y ejecuta el script

### Opción B: Usar la CLI de Supabase

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Ejecutar el schema
supabase db push
```

## 3. Configurar Email Templates (Opcional)

Para personalizar los emails de verificación y recuperación de contraseña:

1. Ve a "Authentication" > "Email Templates" en Supabase Dashboard
2. Personaliza los templates según tu marca

## 4. Estructura de Tablas Creada

El schema crea las siguientes tablas:

### `profiles`
Información extendida del usuario
- `id` (UUID, FK a auth.users)
- `full_name` (TEXT)
- `is_organizer` (BOOLEAN)
- `bio`, `avatar_url`, `city`, `country`
- Timestamps

### `events`
Eventos publicados por organizadores
- `id` (UUID, PK)
- `organizer_id` (UUID, FK a auth.users)
- `title`, `description`, `category`
- `start_date`, `end_date`
- `location_name`, `city`, `country`, `address`
- `latitude`, `longitude` (para geolocalización)
- `price`, `capacity`, `is_free`, `is_featured`
- `status`: 'draft' | 'published' | 'cancelled' | 'completed'
- Timestamps

### `favorites`
Eventos guardados por usuarios
- `user_id` + `event_id` (Composite PK)
- `created_at`

### `tickets`
Compras/reservas de entradas
- `id` (UUID, PK)
- `event_id`, `user_id`
- `quantity`, `total_price`
- `status`: 'pending' | 'confirmed' | 'cancelled' | 'refunded'
- `payment_id` (para integración con pasarela de pago)
- Timestamps

## 5. Row Level Security (RLS)

Todas las tablas tienen RLS habilitado con políticas que:

### Profiles
- ✅ Todos pueden ver todos los perfiles
- ✅ Los usuarios pueden crear y editar solo su propio perfil

### Events
- ✅ Todos pueden ver eventos publicados
- ✅ Los organizadores ven todos sus eventos (incluyendo drafts)
- ✅ Los organizadores pueden CRUD solo sus propios eventos

### Favorites
- ✅ Los usuarios solo pueden ver/crear/eliminar sus propios favoritos

### Tickets
- ✅ Los usuarios ven solo sus propios tickets
- ✅ Los organizadores ven los tickets de sus eventos

## 6. Funciones y Triggers

### `handle_new_user()`
Crea automáticamente un perfil cuando se registra un nuevo usuario, usando los datos de `user_metadata`:
- `full_name`
- `is_organizer`

### `update_updated_at_column()`
Actualiza automáticamente el campo `updated_at` en las tablas cuando se modifican.

## 7. Índices

Se crean índices para optimizar queries comunes:
- Búsqueda de eventos por organizador, ciudad, categoría, fecha
- Eventos destacados
- Favoritos por usuario y evento
- Tickets por usuario, evento y estado

## 8. Próximos Pasos

1. ✅ Ejecutar el schema SQL
2. ⏳ Configurar Storage para imágenes de eventos
3. ⏳ Configurar Realtime (opcional, para notificaciones)
4. ⏳ Integrar pasarela de pagos para tickets

## 9. Configurar Storage (Para Imágenes)

```sql
-- Crear bucket para imágenes de eventos
INSERT INTO storage.buckets (id, name, public)
VALUES ('events', 'events', true);

-- Políticas para el bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

CREATE POLICY "Organizers can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'events' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (bucket_id = 'events' AND auth.uid() = owner);
```

## 10. Testing

Para probar que todo funciona:

1. Registra un usuario desde `/login`
2. Verifica que se creó su perfil en la tabla `profiles`
3. Si eres organizador, podrás crear eventos (próxima funcionalidad)

## Enlaces Útiles

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
