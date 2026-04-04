# Configuración de Supabase Storage para Imágenes de Eventos

## 📋 Pasos para configurar

### 1. Ejecutar el script SQL
Ve a tu proyecto de Supabase → **SQL Editor** y ejecuta el archivo:
```
sql/03-setup-storage.sql
```

Este script:
- ✅ Crea el bucket `event-images` público
- ✅ Habilita Row Level Security (RLS)
- ✅ Configura políticas de acceso:
  - Cualquiera puede ver las imágenes (público)
  - Usuarios autenticados pueden subir imágenes
  - Organizadores pueden eliminar/actualizar sus imágenes

### 2. Verificar el bucket
1. Ve a **Storage** en el panel de Supabase
2. Deberías ver el bucket `event-images`
3. El bucket debe estar marcado como **Public**

### 3. Configurar CORS (si es necesario)
Si tienes problemas de CORS al subir imágenes:

1. Ve a **Storage Settings**
2. Agrega tu dominio a la lista de dominios permitidos:
   - Para desarrollo: `http://localhost:4321`
   - Para producción: `https://tu-dominio.com`

## 🔒 Credenciales S3 (ya configuradas)

Las credenciales S3 de Supabase Storage ya están integradas en el código:

```
Access key ID: 680017ace631fc5546f550da62ca94d6
Secret access key: 8fb71dcfc4d934bb4785c4897639e21d182b0f9f9a2aa3f364c7bb1c4314626e
Endpoint: https://jzctrgtbuvtytqlkwwnw.storage.supabase.co/storage/v1/s3
Region: us-east-1
```

**Nota:** Estas credenciales se usan internamente por el SDK de Supabase, no necesitas configurarlas manualmente.

## 📁 Estructura de archivos

Las imágenes se guardan con esta estructura:
```
event-images/
  └── events/
      ├── 1234567890-abc123.jpg
      ├── 1234567891-def456.png
      └── ...
```

Cada archivo tiene un nombre único basado en timestamp + token aleatorio.

## 🎯 Uso en el código

### Subir imagen
```typescript
import { uploadImage } from '../lib/storage';

const imageUrl = await uploadImage(file, 'events');
```

### Eliminar imagen
```typescript
import { deleteImage } from '../lib/storage';

const success = await deleteImage(imageUrl);
```

## ✅ Validaciones implementadas

- ✅ Tamaño máximo: 5MB
- ✅ Tipos permitidos: image/* (jpg, png, webp, etc.)
- ✅ Nombres únicos automáticos
- ✅ Cache-Control configurado (1 hora)

## 🚨 Troubleshooting

### Error: "Bucket not found"
- Ejecuta el script SQL `03-setup-storage.sql`
- Verifica que el bucket `event-images` existe en Storage

### Error: "Permission denied"
- Verifica que las políticas RLS estén activas
- Asegúrate de estar autenticado al subir imágenes

### Error: "File too large"
- Las imágenes no deben superar 5MB
- Comprime la imagen antes de subirla

## 📊 Límites de Supabase Storage

**Plan Free:**
- 1 GB de almacenamiento
- 2 GB de transferencia/mes

**Plan Pro:**
- 100 GB de almacenamiento
- 200 GB de transferencia/mes

Si necesitas más espacio, considera actualizar tu plan en Supabase.
