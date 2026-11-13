# SISTEMAIA — Patrimonio Gastronómico de Ciudad Juárez

Sistema de administración para documentar, analizar y difundir el patrimonio
gastronómico tradicional de Ciudad Juárez (Zona Centro, Av. Juárez, Mercado
Cuauhtémoc y corredores de fondas típicas).

## Estructura (monorepo)

```
apps/
  web/    Frontend SvelteKit (Svelte 5) — se despliega en Vercel
  api/    Backend Express (Node.js) + Supabase — se despliega en Vercel como serverless
supabase/
  schema.sql   Esquema de base de datos + RLS
```

## Seguridad implementada

- **Contraseñas**: hasheadas con `bcryptjs` (12 rounds). Nunca se guardan en texto plano.
- **Autenticación**: JWT (`jsonwebtoken`) con expiración configurable.
- **Secretos**: todo lo sensible en `.env` (gitignored). Ver `.env.example`.
- **Rate limiting**: middleware de balance de cargas por IP (`apps/api/src/middleware/rateLimit.js`),
  con límite estricto extra para login/registro.
- **RLS en Supabase**: las tablas no tienen políticas públicas; solo la API
  (service role) accede a los datos.
- Cabeceras de seguridad básicas y CORS restringido a `CLIENT_URL`.

## Puesta en marcha local

1. Instala dependencias:
   ```bash
   npm install
   ```

2. **Supabase**: crea un proyecto en https://supabase.com y ejecuta
   `supabase/schema.sql` en el SQL Editor.

3. **Backend**: copia `apps/api/.env.example` a `apps/api/.env` y rellena:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API)
   - `JWT_SECRET` (string largo aleatorio)
   - `CLIENT_URL=http://localhost:5173`

   ```bash
   npm run dev:api   # http://localhost:4000
   ```

4. **Frontend**: copia `apps/web/.env.example` a `apps/web/.env`
   (`PUBLIC_API_URL=http://localhost:4000/api`) y:

   ```bash
   npm run dev:web   # http://localhost:5173
   ```

## Despliegue en Vercel (monorepo)

Crea **dos proyectos** en Vercel apuntando al mismo repo:

| Proyecto | Root Directory | Notas |
|---|---|---|
| `sistemaia-web` | `apps/web` | Framework: SvelteKit. Env: `PUBLIC_API_URL` |
| `sistemaia-api` | `apps/api` | Functions en `api/index.js`. Env: todas las de `apps/api/.env` |

Pasos:

1. Despliega primero `sistemaia-api` y copia su URL (ej. `https://sistemaia-api.vercel.app`).
2. En `sistemaia-api` → Settings → Environment Variables, define las variables de `apps/api/.env`.
3. Despliega `sistemaia-web` con `PUBLIC_API_URL=https://sistemaia-api.vercel.app/api`.
4. En `sistemaia-api`, actualiza `CLIENT_URL` a la URL del frontend para CORS.
5. Redeploy del API.

> Nota: el rate limiter usa memoria por instancia; en serverless el contador se
> reinicia por instancia. Para límites estrictos globales se puede respaldar
> con una tabla en Supabase más adelante.

## API (resumen)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | No | Registro (bcrypt) |
| POST | `/api/auth/login` | No | Login → JWT |
| GET | `/api/auth/me` | Sí | Usuario actual |
| GET | `/api/gastronomy` | No | Listar publicados (filtros: `q`, `categoria`, `zona`) |
| GET | `/api/gastronomy/all` | Sí | Todos los registros (admin) |
| GET | `/api/gastronomy/:id` | No | Detalle |
| POST | `/api/gastronomy` | Sí | Crear (borrador) |
| PUT | `/api/gastronomy/:id` | Sí | Editar / cambiar estado |
| DELETE | `/api/gastronomy/:id` | Sí | Eliminar |

Categorías: `fonda`, `platillo`, `mercado`, `bebida`, `postre`, `otro`.
Zonas: `zona_centro`, `avenida_juarez`, `mercado_cuauhtemoc`, `otra`.
Estados: `borrador`, `publicado`.
