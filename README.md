# EventHub - Plataforma de Eventos

Plataforma digital donde organizadores publican eventos y los usuarios pueden descubrir actividades cerca de ellos.

## ???? Caracter??sticas Implementadas

### ??? Autenticaci??n con Supabase
- Sistema de login y registro completo
- Gesti??n de sesiones con cookies HTTP-only
- Soporte para cuentas de usuarios y organizadores
- P??ginas protegidas con middleware de autenticaci??n

## ??????? Tecnolog??as

- **Framework**: Astro 6 con SSR (Server-Side Rendering)
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticaci??n**: Supabase Auth
- **Estilos**: CSS moderno con Outfit como fuente principal
- **Package Manager**: pnpm

## ???? Instalaci??n

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev

# Construir para producci??n
pnpm build

# Vista previa de producci??n
pnpm preview
```

## ?????? Configuraci??n

### Variables de Entorno

El archivo `.env` ya est?? configurado con las credenciales de Supabase.

## ???? Estructura del Proyecto

```text
src/
????????? pages/
???   ????????? index.astro          # Redirige a login o dashboard
???   ????????? login.astro          # P??gina de autenticaci??n
???   ????????? dashboard.astro      # Panel principal (protegido)
???   ????????? api/
???       ????????? auth/
???           ????????? login.ts     # API endpoint para login
???           ????????? signup.ts    # API endpoint para registro
???           ????????? logout.ts    # API endpoint para cerrar sesi??n
????????? lib/
???   ????????? supabase.ts          # Cliente de Supabase
???   ????????? auth.ts              # Utilidades de autenticaci??n
????????? layouts/
???   ????????? Layout.astro         # Layout base
????????? env.d.ts                 # Tipos TypeScript para env
```

## ???? Roadmap

### Pr??ximas Funcionalidades

#### Para Usuarios
- [ ] Explorar eventos por ubicaci??n
- [ ] Filtrar por categor??a (fiestas, deportes, m??sica, negocios, etc.)
- [ ] B??squeda por fecha
- [ ] Sistema de favoritos
- [ ] Compra/reserva de entradas
- [ ] Perfil de usuario

#### Para Organizadores
- [ ] Publicar eventos
- [ ] Gesti??n de eventos (editar, eliminar)
- [ ] Configurar precios y cupos
- [ ] Panel de estad??sticas
- [ ] Eventos destacados (promoci??n)
- [ ] Dashboard de organizador

#### Modelo de Negocio
- [ ] Comisi??n por venta de entradas (5-10%)
- [ ] Sistema de eventos patrocinados
- [ ] Planes de suscripci??n para organizadores
  - Plan Gratuito: eventos b??sicos
  - Plan Pro: visibilidad premium + estad??sticas

## ???? Dise??o

La plataforma utiliza un dise??o moderno y vibrante que refleja la energ??a de los eventos:

- **Paleta de colores**: Gradientes dinámicos (naranja, rosa, amarillo)
- **Tipograf??a**: Outfit (moderna y legible)
- **Efectos**: Blobs animados, glassmorphism, animaciones suaves
- **Responsive**: Optimizado para m??vil, tablet y escritorio

## ???? Autenticaci??n

### Flujo de Autenticaci??n

1. El usuario accede a `/` (redirige a `/login` si no est?? autenticado)
2. Puede crear una cuenta o iniciar sesi??n
3. Al registrarse, puede marcar si es organizador
4. Tras autenticarse, es redirigido a `/dashboard`
5. Las sesiones se manejan con cookies HTTP-only seguras

### Protecci??n de Rutas

```typescript
// En cualquier p??gina protegida
import { getUser } from '../lib/auth';

const user = await getUser(Astro.cookies);
if (!user) {
  return Astro.redirect('/login');
}
```

## ???? Comandos

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`            | Installs dependencies                            |
| `pnpm dev`                | Starts local dev server at `localhost:4321`      |
| `pnpm build`              | Build your production site to `./dist/`          |
| `pnpm preview`            | Preview your build locally, before deploying     |
| `pnpm astro ...`          | Run CLI commands like `astro add`, `astro check` |

## ???? Notas de Desarrollo

- El proyecto usa SSR de Astro con el adaptador Node
- Las cookies de sesi??n tienen una duraci??n de 7 d??as (access token) y 30 d??as (refresh token)
- Se implementa refresh autom??tico de tokens cuando expiran
- Los errores se manejan con respuestas JSON uniformes

## ???? Empezar

1. El servidor de desarrollo est?? corriendo en `http://localhost:4321`
2. Accede a `/login` para crear una cuenta o iniciar sesi??n
3. Marca "Quiero organizar eventos" si deseas una cuenta de organizador
4. Tras autenticarte, ser??s redirigido al dashboard

## ???? Want to learn more?

Feel free to check [Astro documentation](https://docs.astro.build) or [Supabase documentation](https://supabase.com/docs).
