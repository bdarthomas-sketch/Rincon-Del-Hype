# 03 — API Worker (Hono + Cloudflare Workers)

> **Archivo:** `plans/03-api-worker.md`
> **Propósito:** Documentar la implementación del Worker de API con Hono, incluyendo rutas, middlewares, handlers, tipos compartidos, cliente Supabase, validación Zod y activity logger.
> **Dependencias:** `02-base-de-datos.md`

---

## 1. Estructura del Worker

```
worker/
├── src/
│   ├── index.ts                  # Hono app, registro de rutas, setup
│   ├── types.ts                  # Tipos compartidos
│   ├── middleware/
│   │   ├── auth.ts               # verifyAdmin, tryVerifyAdmin
│   │   ├── cors.ts               # CORS dinámico según ALLOWED_ORIGINS
│   │   ├── cache.ts              # Cache API + purge helpers
│   │   └── error-handler.ts      # Error handler global + Zod errors
│   ├── routes/
│   │   ├── products.ts           # CRUD + reorder + duplicate
│   │   ├── categories.ts         # CRUD
│   │   ├── sizes.ts              # CRUD
│   │   ├── brands.ts             # CRUD + merge
│   │   ├── images.ts             # Upload, delete, composition
│   │   ├── auth.ts               # Login, refresh, check
│   │   ├── settings.ts           # CRUD store settings
│   │   ├── stats.ts              # Dashboard stats + activity log
│   │   ├── analytics.ts          # Admin analytics
│   │   ├── analytics_public.ts   # Public track endpoint
│   │   ├── rendimiento.ts        # Performance data
│   │   └── video-drops.ts        # CRUD
│   └── lib/
│       ├── supabase.ts           # Cliente Supabase singleton
│       ├── validate.ts           # Zod schemas centralizados
│       └── activity.ts           # Activity logger helper
├── wrangler.toml
├── tsconfig.json
├── .dev.vars                     # Variables locales
└── package.json
```

---

## 2. Entry Point (`src/index.ts`)

```typescript
import { Hono } from 'hono';
import { cors } from './middleware/cors';
import { errorHandler } from './middleware/error-handler';
import { publicCache } from './middleware/cache';
import { verifyAdmin } from './middleware/auth';

// Routes
import productsRoutes from './routes/products';
import categoriesRoutes from './routes/categories';
import sizesRoutes from './routes/sizes';
import brandsRoutes from './routes/brands';
import imagesRoutes from './routes/images';
import authRoutes from './routes/auth';
import settingsRoutes from './routes/settings';
import statsRoutes from './routes/stats';
import analyticsRoutes from './routes/analytics';
import analyticsPublicRoutes from './routes/analytics_public';
import rendimientoRoutes from './routes/rendimiento';
import videoDropsRoutes from './routes/video-drops';

const app = new Hono<{ Bindings: Env }>();

// Global middlewares
app.use('*', cors);
app.onError(errorHandler);

// Public routes (con cache)
app.use('/api/products/*', publicCache);
app.use('/api/categories/*', publicCache);
app.use('/api/sizes/*', publicCache);
app.use('/api/brands/*', publicCache);
app.use('/api/settings/*', publicCache);
app.use('/api/video-drops/*', publicCache);

app.route('/api/products', productsRoutes);
app.route('/api/categories', categoriesRoutes);
app.route('/api/sizes', sizesRoutes);
app.route('/api/brands', brandsRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/video-drops', videoDropsRoutes);

// Public routes (sin cache — analytics, auth)
app.post('/api/analytics/track', analyticsPublicRoutes);

// Rutas de auth (sin verifyAdmin — son públicas por necesidad)
app.post('/api/admin/login', authRoutes);
app.post('/api/admin/refresh', authRoutes);

// Admin routes (autenticadas)
const admin = new Hono<{ Bindings: Env }>();
admin.use('*', verifyAdmin);
admin.get('/api/admin/check', authRoutes);
admin.route('/api/admin/products', productsRoutes);
admin.route('/api/admin/categories', categoriesRoutes);
admin.route('/api/admin/sizes', sizesRoutes);
admin.route('/api/admin/brands', brandsRoutes);
admin.route('/api/admin/images', imagesRoutes);
admin.route('/api/admin/settings', settingsRoutes);
admin.route('/api/admin/stats', statsRoutes);
admin.route('/api/admin/analytics', analyticsRoutes);
admin.route('/api/admin/rendimiento', rendimientoRoutes);
admin.route('/api/admin/video-drops', videoDropsRoutes);

app.route('/', admin);

export default app;
```

**Observación:** La organización de rutas en Hono es declarativa. Cada archivo de ruta exporta un Hono instance o handler. El grupo `admin` comparte el middleware de auth.

### 2.1 Bindings Type

```typescript
// types.ts
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALLOWED_ORIGINS: string;
  ASSETS: Fetcher; // Cloudflare Pages assets (si se sirve desde el Worker)
}
```

---

## 3. Middlewares

### 3.1 `middleware/cors.ts`

```typescript
import { createMiddleware } from 'hono/factory';

export const cors = createMiddleware(async (c, next) => {
  const origin = c.req.header('Origin') || '';
  const allowed = c.env.ALLOWED_ORIGINS.split(',').map(s => s.trim());

  if (allowed.includes(origin) || allowed.includes('*')) {
    c.res.headers.set('Access-Control-Allow-Origin', origin);
    c.res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    c.res.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  await next();
});
```

### 3.2 `middleware/auth.ts`

```typescript
import { createMiddleware } from 'hono/factory';

export const verifyAdmin = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);

  // Verificar token contra Supabase Auth
  const { data: { user }, error } = await supabase(c.env)
    .auth.getUser(token);

  if (error || !user) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  // Verificar que el user está en la tabla admins
  const { data: admin } = await supabase(c.env)
    .from('admins')
    .select('id, role')
    .eq('user_id', user.id)
    .single();

  if (!admin) {
    return c.json({ error: 'Not an admin' }, 401);
  }

  c.set('adminUser', { ...user, adminId: admin.id, role: admin.role });
  await next();
});
```

### 3.3 `middleware/cache.ts`

Ver documento `06-cache-y-rendimiento.md` para la implementación detallada del middleware de cache con Cloudflare Cache API y purge on-demand.

### 3.4 `middleware/error-handler.ts`

```typescript
import { ZodError } from 'zod';

export const errorHandler = (err: Error, c: Context) => {
  if (err instanceof ZodError) {
    return c.json({
      error: 'Validation error',
      details: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    }, 400);
  }

  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
};
```

---

## 4. Rutas Públicas

### 4.1 `GET /api/products`

```
Query params:
  - category?: string  (slug de categoría)
  - brand?: string     (slug de marca)
  - search?: string    (búsqueda por texto)
  - page?: number      (paginación, default 1)
  - limit?: number     (items por página, default 50)
  - sort?: 'newest' | 'price_asc' | 'price_desc' | 'name'

Response:
{
  products: Product[],
  total: number,
  page: number,
  totalPages: number
}
```

**Lógica:**
```sql
SELECT p.*, pi.url as primary_image_url
FROM products p
LEFT JOIN LATERAL (
  SELECT url FROM product_images
  WHERE product_id = p.id AND is_primary = true
  LIMIT 1
) pi ON true
WHERE p.is_active = true AND p.deleted_at IS NULL
  [AND p.category_id = ?]       -- filter by category
  [AND p.brand_id = ?]          -- filter by brand
  [AND p.name ILIKE ?]          -- search
ORDER BY p.sort_order ASC, p.created_at DESC
LIMIT ? OFFSET ?;
```

### 4.2 `GET /api/products/:slug`

**Lógica:**
```sql
SELECT p.*,
  COALESCE(
    jsonb_agg(pi.* ORDER BY pi.sort_order) FILTER (WHERE pi.id IS NOT NULL),
    '[]'
  ) AS images
FROM products p
LEFT JOIN product_images pi ON pi.product_id = p.id
WHERE p.slug = ? AND p.is_active = true AND p.deleted_at IS NULL
GROUP BY p.id;
```

**Response:**
```json
{
  "product": ProductWithImages,
  "sizes": [ { "size_id": "uuid", "label": "42", "stock": 5 } ]
}
```

**Nota:** Los sizes del producto se fetchean por separado (JOIN product_sizes + sizes) y se incluyen en la respuesta.

### 4.3 `GET /api/categories`

```
Response: Categoria[]
```

Sin filtros. Se cachea por 5 segundos. Las categorías cambian rara vez.

### 4.4 `GET /api/sizes`

```
Response: Size[]
```

Todos los talles del catálogo. Cacheable.

### 4.5 `GET /api/brands`

```
Response: Brand[]
```

Todas las marcas. Cacheable.

### 4.6 `GET /api/settings`

```
Response: { [key: string]: any }
```

Retorna un objeto con todas las store_settings. Cacheable.

### 4.7 `GET /api/video-drops`

```
Response: VideoDrop[]
```

Solo `is_active = true`, ordenado por `sort_order`. Cacheable.

### 4.8 `POST /api/analytics/track`

```
Body: { event_type: string, session_id?: string, product_id?: string, metadata?: object }

Response: 201 { id: uuid }
```

Sin cache. Sin auth. Se usa para trackear eventos de visitantes (page views, clicks en WhatsApp, etc.).

---

## 5. Rutas Admin

Todas las rutas admin empiezan con `/api/admin/` y pasan por el middleware `verifyAdmin`.

### 5.1 Auth

| Ruta | Método | Body | Response |
|------|--------|------|----------|
| `/api/admin/login` | POST | `{ email, password }` | `{ access_token, refresh_token, user }` |
| `/api/admin/refresh` | POST | `{ refresh_token }` | `{ access_token, refresh_token }` |
| `/api/admin/check` | GET | — | `{ valid: true, user, role }` |

### 5.2 Products

| Ruta | Método | Body/Params | Descripción |
|------|--------|-------------|-------------|
| `/api/admin/products` | GET | `?page&limit&...` | Lista paginada (incluye inactivos) |
| `/api/admin/products` | POST | `ProductCreate` | Crear producto |
| `/api/admin/products/:id` | PUT | `ProductUpdate` | Actualizar producto |
| `/api/admin/products/:id` | DELETE | — | Soft-delete (set deleted_at) |
| `/api/admin/products/:id/restore` | POST | — | Restaurar soft-delete |
| `/api/admin/products/reorder` | POST | `{ order: [{ id, sort_order }] }` | Reordenar productos |
| `/api/admin/products/:id/duplicate` | POST | — | Duplicar producto |
| `/api/admin/products/deactivated` | GET | — | Lista de productos inactivos |

### 5.3 Categories

| Ruta | Método | Body/Params | Descripción |
|------|--------|-------------|-------------|
| `/api/admin/categories` | GET | — | Lista todas |
| `/api/admin/categories` | POST | `{ name, slug, description? }` | Crear |
| `/api/admin/categories/:id` | PUT | `{ name?, slug?, description?, sort_order? }` | Actualizar |
| `/api/admin/categories/:id` | DELETE | — | Eliminar (solo si sin productos) |

### 5.4 Sizes

| Ruta | Método | Body/Params | Descripción |
|------|--------|-------------|-------------|
| `/api/admin/sizes` | GET | — | Lista todos |
| `/api/admin/sizes` | POST | `{ label, sort_order? }` | Crear |
| `/api/admin/sizes/:id` | PUT | `{ label?, sort_order? }` | Actualizar |
| `/api/admin/sizes/:id` | DELETE | — | Eliminar |

### 5.5 Brands

| Ruta | Método | Body/Params | Descripción |
|------|--------|-------------|-------------|
| `/api/admin/brands` | GET | — | Lista todas |
| `/api/admin/brands` | POST | `{ name, slug? }` | Crear (slug auto si no se provee) |
| `/api/admin/brands/:id` | PUT | `{ name?, slug? }` | Actualizar |
| `/api/admin/brands/:id` | DELETE | — | Eliminar (solo si sin productos) |
| `/api/admin/brands/merge` | POST | `{ source_id, target_id }` | Merge una marca en otra |

### 5.6 Images

| Ruta | Método | Body/Params | Descripción |
|------|--------|-------------|-------------|
| `/api/admin/images/upload` | POST | `multipart` | Upload a Supabase Storage |
| `/api/admin/images` | POST | `{ product_id, url, is_primary? }` | Asociar imagen existente |
| `/api/admin/images/:id` | PUT | `{ is_primary?, sort_order?, image_mode?, ... }` | Actualizar metadata |
| `/api/admin/images/:id` | DELETE | — | Eliminar imagen |
| `/api/admin/images/composition` | PUT | `{ image_id, image_mode, image_scale, ... }` | Actualizar composición |

### 5.7 Settings

| Ruta | Método | Body | Descripción |
|------|--------|------|-------------|
| `/api/admin/settings` | GET | — | Lista todas |
| `/api/admin/settings/:key` | PUT | `{ value }` | Actualizar setting |
| `/api/admin/settings` | POST | `{ key, value }` | Crear setting |

### 5.8 Stats & Activity

| Ruta | Método | Body/Params | Descripción |
|------|--------|-------------|-------------|
| `/api/admin/stats/dashboard` | GET | — | Stats del dashboard |
| `/api/admin/stats/activity` | GET | `?page&limit` | Activity log paginado |

### 5.9 Analytics

| Ruta | Método | Params | Descripción |
|------|--------|--------|-------------|
| `/api/admin/analytics` | GET | `?from&to&type` | Events filtrados por fecha |
| `/api/admin/analytics/summary` | GET | `?from&to` | Resumen (total views, clicks, etc.) |

### 5.10 Rendimiento

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/rendimiento` | GET | Datos de rendimiento (integración futura) |

### 5.11 Video Drops

| Ruta | Método | Body/Params | Descripción |
|------|--------|-------------|-------------|
| `/api/admin/video-drops` | GET | — | Lista todos |
| `/api/admin/video-drops` | POST | `{ title, ... }` | Crear |
| `/api/admin/video-drops/:id` | PUT | `{ title?, ... }` | Actualizar |
| `/api/admin/video-drops/:id` | DELETE | — | Eliminar |

---

## 6. Cliente Supabase (`src/lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createClient> | null = null;

export function supabase(env: Env) {
  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return client;
}
```

**Nota:** Usar service_role key para bypassear RLS. La autenticación se maneja en el middleware de Hono.

---

## 7. Validación con Zod (`src/lib/validate.ts`)

Schemas centralizados:

```typescript
import { z } from 'zod';

export const ProductCreate = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  brand: z.string().min(1),
  brand_id: z.string().uuid().optional(),
  price: z.number().min(0),
  old_price: z.number().min(0).optional().nullable(),
  category_id: z.string().uuid(),
  description: z.string().optional().nullable(),
  is_new: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sizes: z.array(z.object({
    size_id: z.string().uuid(),
    stock: z.number().int().min(0).default(0),
  })).optional(),
});

export const ProductUpdate = ProductCreate.partial();
export const SettingsValue = z.record(z.string(), z.any());
export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export const RefreshBody = z.object({
  refresh_token: z.string().min(1),
});
```

---

## 8. Activity Logger (`src/lib/activity.ts`)

```typescript
export async function logActivity(
  supabase: SupabaseClient,
  admin: AdminUser,
  action: 'created' | 'updated' | 'deleted' | 'restored' | 'merged',
  entity: string,
  entityId: string,
  entityName?: string,
  details?: Record<string, unknown>,
) {
  await supabase.from('activity_log').insert({
    admin_id: admin.adminId,
    admin_email: admin.email,
    action,
    entity,
    entity_id: entityId,
    entity_name: entityName,
    details: details ?? null,
  });
}
```

---

## 9. Flujo de una request típica (admin crea producto)

```
1. POST /api/admin/products
2. middleware/cors.ts → setea headers CORS
3. middleware/auth.ts → verifyAdmin
   a. Extrae Bearer token
   b. Verifica contra Supabase Auth
   c. Verifica que existe en admins
   d. Setea c.get('adminUser')
4. routes/products.ts → handler
   a. Valida body con ProductCreate
   b. Inserta en products
   c. Inserta product_sizes (si se incluyeron)
   d. Llama logActivity
   e. Purga cache de /api/products
5. Responde 201 { product }
```

---

## 10. wRANGLER CONFIG (`wrangler.toml`)

```toml
name = "rdh-api"
main = "src/index.ts"
compatibility_date = "2026-04-01"

[observability]
enabled = true

[env.production]
workers_dev = false
routes = [{ pattern = "api.rincondelhype.com/*", zone_id = "..." }]
```

**Nota:** Sin binding de KV. WAF reemplaza el rate limiting. Cache API usa `caches.default` (built-in de Workers, no requiere binding).
