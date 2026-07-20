# 06 — Cache y Rendimiento

> **Archivo:** `plans/06-cache-y-rendimiento.md`
> **Propósito:** Documentar la estrategia de caching con Cloudflare Cache API (incluyendo purge on-demand), la eliminación del doble fetch SSR+cliente, optimización de imágenes y métricas de rendimiento.
> **Dependencias:** `03-api-worker.md`, `04-frontend-publico.md`

---

## 1. Estrategia de Cache

### 1.1 Capas de cache

```
[Browser Cache]
    ↑ Cache-Control: public, max-age=0
    ↓
[Cloudflare Edge Cache]  ← s-maxage=5 (HTML)
    ↑ Cache API (Worker)  ← TTL programático
    ↓
[Supabase]                ← siempre datos frescos
```

### 1.2 ¿Qué se cachea y por cuánto?

| Recurso | Cache | TTL | Purge on-demand |
|---------|-------|-----|-----------------|
| `GET /api/products` | Cloudflare Cache API | 5s | ✅ Al modificar productos |
| `GET /api/products/:slug` | Cloudflare Cache API | 5s | ✅ Al modificar ese producto |
| `GET /api/categories` | Cloudflare Cache API | 5s | ✅ Al modificar categorías |
| `GET /api/sizes` | Cloudflare Cache API | 60s | ✅ Al modificar talles |
| `GET /api/brands` | Cloudflare Cache API | 60s | ✅ Al modificar marcas |
| `GET /api/settings` | Cloudflare Cache API | 5s | ✅ Al guardar settings |
| `GET /api/video-drops` | Cloudflare Cache API | 60s | ✅ Al modificar video drops |
| Páginas HTML (SSR) | Cloudflare Edge | 0s | ❌ No necesario (frescura via API) |
| Assets con hash | Cloudflare Edge | 1 año | ❌ Inmutables |
| `POST /api/analytics/track` | ❌ No | — | — |

### 1.3 Por qué 5 segundos y no 1 hora

El TTL de 5 segundos es un balance entre rendimiento y frescura:

- **5s es suficiente**: En una tienda con ~200 productos, el pico de requests por visitante en una página de listado es 1 request. Con 5s de cache, el hit rate es alto incluso con pocos visitantes.
- **Frescura garantizada**: El purge on-demand es para quien necesita instantaneidad (admin modificando un producto). Para el visitante común, 5 segundos de diferencia es imperceptible.
- **Sin rebuild**: A diferencia de SSG, el purge purga la cache del Worker (un request), no rebuilds el proyecto entero.

---

## 2. Middleware de Cache

### 2.1 Implementación

```typescript
// middleware/cache.ts
import { createMiddleware } from 'hono/factory';

async function cacheGet(c: Context, ttl: number): Promise<Response | null> {
  const cache = caches.default;
  const url = new URL(c.req.url);
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  return null;
}

async function cacheSet(c: Context, response: Response, ttl: number): Promise<Response> {
  const cache = caches.default;
  const url = new URL(c.req.url);
  const cacheKey = new Request(url.toString(), { method: 'GET' });

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, s-maxage=${ttl}, max-age=0`);
  headers.set('CF-Cache-Status', 'HIT');

  const cachedResponse = new Response(response.body, {
    status: response.status,
    headers,
  });

  // Cloudflare Cache API no respeta s-maxage programáticamente,
  // usamos ctx.waitUntil para poner en cache con expiry manual
  c.executionCtx.waitUntil(
    cache.put(cacheKey, cachedResponse.clone())
  );

  return cachedResponse;
}

export const publicCache = createMiddleware(async (c, next) => {
  if (c.req.method !== 'GET') return next();

  const cached = await cacheGet(c, 5);
  if (cached) return cached;

  await next();

  if (c.res.status === 200) {
    const cloned = await cacheSet(c, c.res.clone(), 5);
    c.res = cloned;
  }
});
```

### 2.2 Función de purge

```typescript
// middleware/cache.ts
export async function purgeCache(c: Context, paths: string[]) {
  const cache = caches.default;
  const baseUrl = new URL(c.req.url);
  const purges = paths.map(path => {
    const url = new URL(path, baseUrl.origin);
    const key = new Request(url.toString(), { method: 'GET' });
    return cache.delete(key);
  });
  await Promise.allSettled(purges);
}
```

### 2.3 Uso en handlers

```typescript
// routes/products.ts
import { purgeCache } from '../middleware/cache';

router.put('/:id', async (c) => {
  // ... actualizar producto en Supabase ...
  const product = /* producto actualizado */;

  // Purge cache related to this product
  await purgeCache(c, [
    '/api/products',
    `/api/products/${product.slug}`,
    `/api/products/${product.id}`,
  ]);

  // Log activity
  await logActivity(supabase, admin, 'updated', 'product', product.id, product.name);

  return c.json({ product });
});
```

### 2.4 Paths a purgar por operación

| Operación | Purga |
|-----------|-------|
| Crear producto | `/api/products` |
| Actualizar producto | `/api/products`, `/api/products/{slug}`, `/api/products/{id}` |
| Eliminar/restaurar | `/api/products`, `/api/products/{slug}` |
| Reordenar | `/api/products` |
| Modificar categoría | `/api/categories` |
| Modificar tamaño | `/api/sizes` |
| Modificar marca | `/api/brands` |
| Modificar settings | `/api/settings` |
| Modificar video drop | `/api/video-drops` |

---

## 3. Medición de Rendimiento

### 3.1 Estado actual (proyecto original)

| Métrica | Valor |
|---------|-------|
| Líneas de código total | ~14,500 en ~90 archivos |
| KV reads por load de /catalogo | 7 (SSR: 4, Cliente: 3) |
| KV reads por load de /producto | 4 (SSR: 1, Cliente: 3) |
| KV reads totales (proyectados) | ~7 por visitante |
| Archivos de tipos | 4 archivos divergentes |
| Router API | Switch-case de 534 líneas |
| API_BASE hardcodeada | 6 ocurrencias |

### 3.2 Estado esperado (reconstrucción)

| Métrica | Valor | Mejora |
|---------|-------|--------|
| Líneas de código total | ~8,000 en ~50 archivos | -45% |
| KV reads | **0** (WAF + Cache API) | -100% |
| Fetchs por load de /catalogo | 2 (SSR únicamente) | -71% |
| Fetchs por load de /producto | 1 (SSR únicamente) | -75% |
| Fetchs por load de Home | 2 (SSR 1 + HypeGallery 1) | -50% |
| Archivos de tipos | 1 archivo central | -75% |
| Router API | Hono declarativo (~100 líneas) | -81% |
| API_BASE | 1 constante en config.ts | -83% |

### 3.3 Consumo de Cloudflare

| Recurso | Antes | Después |
|---------|-------|---------|
| KV reads/día | ~10,000+ | 0 |
| KV writes/día (rate limit) | ~1,000+ | 0 (WAF) |
| Cache hits/día | 0 (sin cache) | ~8,000 (con 5s TTL) |
| WAF requests/día | 0 (sin WAF) | ~1,000 (rate limiting) |

---

## 4. Optimización de Imágenes

### 4.1 Estrategia actual

Las imágenes se suben a Supabase Storage. No hay procesamiento server-side de imágenes (solo background removal con Cloudflare Images).

### 4.2 Estrategia propuesta

| Paso | Lugar | Descripción |
|------|-------|-------------|
| Upload | Worker → Supabase Storage | Se sube la imagen original |
| Background removal | Cloudflare Images | Se procesa en el upload |
| Display | Frontend | Se sirve directo desde Supabase Storage |

### 4.3 Optimización a futuro (post-MVP)

- Cloudflare Images para generar múltiples sizes (thumbnail, medium, full)
- Lazy loading nativo con `loading="lazy"`
- WebP conversion automática (Cloudflare Polish)
- CDN caching con Cloudflare Images

---

## 5. Headers de Respuesta

### 5.1 HTML pages

```
Cache-Control: public, max-age=0, s-maxage=0
```

Las páginas HTML NO se cachean en edge (s-maxage=0). La frescura viene de que el Worker tira datos cacheados desde el Cache API internamente. Esto asegura que el HTML siempre refleje la cache más reciente.

### 5.2 API responses (desde el middleware de cache)

```
Cache-Control: public, s-maxage=5, max-age=0
```

### 5.3 Assets con hash

```
Cache-Control: public, max-age=31536000, immutable
```

### 5.4 Static assets (sin hash)

```
Cache-Control: public, max-age=86400
```
