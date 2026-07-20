# 09 — Roadmap y Tareas

> **Archivo:** `plans/09-roadmap-y-tareas.md`
> **Propósito:** Desglosar el plan de reconstrucción en fases, tareas detalladas con dependencias, prioridades y estimaciones de tiempo.
> **Dependencias:** Todos los archivos 01 a 08

---

## 1. Resumen de Fases

| Fase | Nombre | Duración estimada | Dependencias |
|------|--------|------------------|--------------|
| 0 | Setup | 2 días | Ninguna |
| 1 | Base de datos | 1 día | Fase 0 |
| 2 | API Worker | 5 días | Fase 1 |
| 3 | Frontend público | 5 días | Fase 2 |
| 4 | Admin SPA | 5 días | Fase 2 |
| 5 | Cache y rendimiento | 2 días | Fase 2, 3, 4 |
| 6 | Deploy y CI/CD | 1 día | Fase 3, 4 |
| 7 | Testing y QA | 2 días | Todas |

**Total estimado: ~23 días hábiles (~5 semanas)**

---

## 2. Fase 0: Setup (2 días)

### Día 1: Inicialización del proyecto

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 0.1 | Crear estructura de carpetas | `frontend/`, `worker/`, `supabase/`, `.github/workflows/` | Todo el repo |
| 0.2 | Inicializar frontend con Astro | `npm create astro@latest` con template minimal + TypeScript | `frontend/*` |
| 0.3 | Instalar dependencias frontend | react, @astrojs/react, @astrojs/cloudflare, tailwindcss, zustand, lucide-react, lenis, react-router-dom, @dnd-kit, @supabase/supabase-js, clsx, tailwind-merge | `frontend/package.json` |
| 0.4 | Configurar Astro | `astro.config.mjs` con adapter Cloudflare + React + Tailwind | `frontend/astro.config.mjs` |
| 0.5 | Configurar TypeScript frontend | `tsconfig.json` con strict + paths `@/` | `frontend/tsconfig.json` |

### Día 2: Inicialización del Worker

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 0.6 | Inicializar Worker con Hono | `npm create hono@latest` con template cloudflare-workers | `worker/*` |
| 0.7 | Instalar dependencias worker | @supabase/supabase-js, zod, @cloudflare/workers-types, wrangler | `worker/package.json` |
| 0.8 | Configurar wrangler | `wrangler.toml` con nombre, compat date, secrets | `worker/wrangler.toml` |
| 0.9 | Configurar TypeScript worker | `tsconfig.json` worker-specific | `worker/tsconfig.json` |
| 0.10 | Configurar Tailwind CSS 4 | `src/styles/global.css` con `@import "tailwindcss"` + `@theme` | `frontend/src/styles/global.css` |
| 0.11 | Crear `.env.example` | Template de variables de entorno | `.env.example` |
| 0.12 | Crear `public/_headers` | Cache headers estáticos | `public/_headers` |

---

## 3. Fase 1: Base de Datos (1 día)

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 1.1 | Aplicar migraciones a Supabase | Ejecutar migraciones 001-023 en orden | `supabase/migrations/*` |
| 1.2 | Verificar schema | Correr queries de verificación para cada tabla | — |
| 1.3 | Crear buckets Storage | `product-images`, `video-drops` con RLS | Supabase Dashboard |
| 1.4 | Configurar Auth | Habilitar email/password, crear admin user | Supabase Dashboard |
| 1.5 | Insertar admin en tabla admins | Vincular user de auth.users a admins | SQL Editor |
| 1.6 | Insertar seed settings | Store info inicial | SQL Editor |
| 1.7 | Actualizar URLs en migración 023 | Reemplazar URL hardcodeada de Supabase antigua | `supabase/migrations/023_video_drops.sql` |
| 1.8 | Subir imágenes de marca | Logo, imágenes de about al storage | Supabase Dashboard |

---

## 4. Fase 2: API Worker (5 días)

### Día 1: Core + Auth + Middlewares

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 2.1 | Crear tipos compartidos del Worker | `types.ts` con Env, AdminUser, interfaces públicas | `worker/src/types.ts` |
| 2.2 | Implementar cliente Supabase | `supabase.ts` singleton con service_role | `worker/src/lib/supabase.ts` |
| 2.3 | Implementar middleware CORS | Dinámico según ALLOWED_ORIGINS | `worker/src/middleware/cors.ts` |
| 2.4 | Implementar middleware de auth | `verifyAdmin` + `tryVerifyAdmin` | `worker/src/middleware/auth.ts` |
| 2.5 | Implementar error handler | Global + Zod errors | `worker/src/middleware/error-handler.ts` |
| 2.6 | Implementar middleware de cache | Cache get/set + purge function | `worker/src/middleware/cache.ts` |
| 2.7 | Crear schemas de validación Zod | ProductCreate, ProductUpdate, LoginBody, etc. | `worker/src/lib/validate.ts` |
| 2.8 | Crear entry point Hono | Setup de app, registro de middlewares globales | `worker/src/index.ts` |
| 2.9 | Implementar ruta de auth | Login, refresh, check | `worker/src/routes/auth.ts` |

### Día 2: Products + Categories + Sizes

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 2.10 | Implementar CRUD de productos | GET list, GET by slug, POST, PUT, DELETE (soft) | `worker/src/routes/products.ts` |
| 2.11 | Implementar reorder + duplicate | Reordenar con sort_order, duplicar slugs automáticos | `worker/src/routes/products.ts` |
| 2.12 | Implementar CRUD de categorías | GET, POST, PUT, DELETE | `worker/src/routes/categories.ts` |
| 2.13 | Implementar CRUD de talles | GET, POST, PUT, DELETE | `worker/src/routes/sizes.ts` |
| 2.14 | Implementar activity logger | Helper que inserta en activity_log | `worker/src/lib/activity.ts` |

### Día 3: Brands + Images + Settings

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 2.15 | Implementar CRUD de brands | GET, POST, PUT, DELETE, MERGE | `worker/src/routes/brands.ts` |
| 2.16 | Implementar upload de imágenes | Upload a Supabase Storage + background removal | `worker/src/routes/images.ts` |
| 2.17 | Implementar CRUD de images | POST (associate), PUT (metadata), DELETE | `worker/src/routes/images.ts` |
| 2.18 | Implementar image composition | Actualizar image_mode, scale, offset por imagen | `worker/src/routes/images.ts` |
| 2.19 | Implementar CRUD settings | GET, PUT, POST | `worker/src/routes/settings.ts` |

### Día 4: Stats + Analytics + Video Drops + Rendimiento

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 2.20 | Implementar stats dashboard | Product count, views, activity log paginado | `worker/src/routes/stats.ts` |
| 2.21 | Implementar analytics admin | Endpoints de analytics con filtro de fechas | `worker/src/routes/analytics.ts` |
| 2.22 | Implementar analytics público | POST /api/analytics/track | `worker/src/routes/analytics_public.ts` |
| 2.23 | Implementar CRUD video drops | GET público, CRUD admin | `worker/src/routes/video-drops.ts` |
| 2.24 | Implementar rendimiento | Endpoint base de rendimiento | `worker/src/routes/rendimiento.ts` |

### Día 5: Integración + Cache purges

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 2.25 | Integrar purge cache en handlers | Cada handler de modificación llama purgeCache() | Todos los routes |
| 2.26 | Testear todas las rutas localmente | Con curl, verificar responses | — |
| 2.27 | Verificar autenticación | Login → token → admin check → refresh | — |

---

## 5. Fase 3: Frontend Público (5 días)

### Día 1: Layout + Tipos + Config

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 3.1 | Crear tipos del frontend | `types.ts` con Product, Category, etc. | `frontend/src/data/types.ts` |
| 3.2 | Crear config | `config.ts` con API_BASE, WHATSAPP_PHONE | `frontend/src/lib/config.ts` |
| 3.3 | Crear utils | `cn()`, `formatPrice()`, `scrollToHash()` | `frontend/src/lib/utils.ts` |
| 3.4 | Crear API client | `api.ts` con funciones fetch tipadas | `frontend/src/lib/api.ts` |
| 3.5 | Crear Layout.astro | SSR básico con head, body, settings inline | `frontend/src/layouts/Layout.astro` |
| 3.6 | Crear store de settings | Zustand store que lee de `window.__RDH_SETTINGS__` | `frontend/src/lib/store/settings-store.ts` |

### Día 2: Componentes públicos base

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 3.7 | Crear SiteHeader | Header con logo, nav, cart trigger | `frontend/src/components/public/SiteHeader.tsx` |
| 3.8 | Crear SiteFooter | Footer con info de tienda, redes | `frontend/src/components/public/SiteFooter.tsx` |
| 3.9 | Crear ProductCard | Card de producto (compartida público/admin) | `frontend/src/components/public/ProductCard.tsx` |
| 3.10 | Crear Hero | Hero con featured products carousel | `frontend/src/components/public/Hero.tsx` |
| 3.11 | Crear NewArrivals | Grid de productos nuevos con scroll reveal | `frontend/src/components/public/NewArrivals.tsx` |

### Día 3: Páginas + Catálogo

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 3.12 | Crear página Home | `index.astro` con SSR products + featured | `frontend/src/pages/index.astro` |
| 3.13 | Crear CatalogoPage | Componente con filtros, búsqueda, grid | `frontend/src/components/catalogo/CatalogoPage.tsx` |
| 3.14 | Crear página de catálogo | `catalogo.astro` con SSR products + categories | `frontend/src/pages/catalogo.astro` |
| 3.15 | Crear filtros de catálogo | CategoryFilter, BrandFilter, SizeFilter, PriceSort | `frontend/src/components/public/CatalogFilters.tsx` |
| 3.16 | Crear SearchBar | Búsqueda con debounce | `frontend/src/components/ui/SearchBar.tsx` |

### Día 4: Producto + Galería

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 3.17 | Crear ProductoPage | Componente de producto individual | `frontend/src/components/producto/ProductoPage.tsx` |
| 3.18 | Crear SizePicker | Selector de talles con stock display | `frontend/src/components/public/SizePicker.tsx` |
| 3.19 | Crear página [slug].astro | SSR con meta tags, JSON-LD | `frontend/src/pages/producto/[slug].astro` |
| 3.20 | Crear HypeGallery | Galería de videos con lazy load | `frontend/src/components/public/HypeGallery.tsx` |
| 3.21 | Crear About + HowToOrder | Secciones estáticas (SSR, sin JS) | `frontend/src/components/public/About.tsx`, `HowToOrder.tsx` |

### Día 5: Componentes globales + 404

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 3.22 | Crear CartDrawer | Slide-in panel con items del carrito | `frontend/src/components/cart/CartDrawer.tsx` |
| 3.23 | Crear CartTrigger | Botón flotante del carrito | `frontend/src/components/cart/CartTrigger.tsx` |
| 3.24 | Crear cart store | Zustand store con persistencia localStorage | `frontend/src/lib/store/cart-store.ts` |
| 3.25 | Crear WhatsAppIcon | Botón flotante de WhatsApp | `frontend/src/components/public/WhatsAppIcon.tsx` |
| 3.26 | Crear SmoothScroll | Lenis integration | `frontend/src/components/public/SmoothScroll.tsx` |
| 3.27 | Crear UsdModal | Modal de cotización USD | `frontend/src/components/public/UsdModal.tsx` |
| 3.28 | Crear PageViewTracker | Analytics tracker invisible | `frontend/src/components/public/PageViewTracker.tsx` |
| 3.29 | Crear analytics lib | `trackEvent()`, `getSessionId()` | `frontend/src/lib/analytics.ts` |
| 3.30 | Crear página 404 | 404.astro personalizada | `frontend/src/pages/404.astro` |
| 3.31 | Crear sitemap.xml.ts | Sitemap con todos los productos | `frontend/src/pages/sitemap.xml.ts` |

---

## 6. Fase 4: Admin SPA (5 días)

### Día 1: Auth + Layout

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 4.1 | Crear auth store (Zustand) | login, logout, checkSession, token refresh | `frontend/src/lib/store/auth-store.ts` |
| 4.2 | Crear admin API helper | `request()` con token injection + auto-logout | `frontend/src/components/admin/api.ts` |
| 4.3 | Crear LoginPage | Formulario de login con error handling | `frontend/src/components/admin/LoginPage.tsx` |
| 4.4 | Crear AdminLayout | Layout del admin con sidebar y header | `frontend/src/components/admin/Layout.tsx` |
| 4.5 | Crear AdminApp (entry point) | AuthGate + react-router-dom setup | `frontend/src/components/admin/AdminApp.tsx` |
| 4.6 | Crear página de admin | `admin/index.astro` con `client:only="react"` | `frontend/src/pages/admin/index.astro` |

### Día 2: Dashboard + Products

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 4.7 | Crear Dashboard | StatsGrid + ActivityFeed | `frontend/src/components/admin/Dashboard.tsx` |
| 4.8 | Crear ProductsList | Tabla con filtros, búsqueda, paginación | `frontend/src/components/admin/ProductsList.tsx` |
| 4.9 | Crear StatusBadge | Badge de estado (activo/inactivo/nuevo) | `frontend/src/components/admin/StatusBadge.tsx` |
| 4.10 | Crear ProductForm | Formulario completo de producto | `frontend/src/components/admin/ProductForm.tsx` |

### Día 3: Images + Composition

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 4.11 | Crear DragDropUpload | Upload con drag & drop + preview | `frontend/src/components/admin/DragDropUpload.tsx` |
| 4.12 | Crear ImageCompositionEditor | Ajustes por imagen (mode, scale, offset) | `frontend/src/components/admin/ImageCompositionEditor.tsx` |
| 4.13 | Crear ProductPreview | Sidebar preview del producto | `frontend/src/components/admin/ProductPreview.tsx` |
| 4.14 | Crear ProductOrder | Reordenar productos con dnd-kit | `frontend/src/components/admin/ProductOrder.tsx` |

### Día 4: Categories + Sizes + Brands + Videos

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 4.15 | Crear CategoriesManager | CRUD + orden | `frontend/src/components/admin/CategoriesManager.tsx` |
| 4.16 | Crear SizesManager | CRUD + orden | `frontend/src/components/admin/SizesManager.tsx` |
| 4.17 | Crear BrandsManager | CRUD + merge | `frontend/src/components/admin/BrandsManager.tsx` |
| 4.18 | Crear VideoDropsManager | CRUD + preview | `frontend/src/components/admin/VideoDropsManager.tsx` |

### Día 5: Settings + Analytics + Rendimiento + Atributos

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 4.19 | Crear Settings | Editor de store_settings | `frontend/src/components/admin/Settings.tsx` |
| 4.20 | Crear ActivityModal | Modal con activity log paginado | `frontend/src/components/admin/ActivityModal.tsx` |
| 4.21 | Crear Analytics page | Tabla y gráficos de analytics (versión simplificada) | `frontend/src/components/admin/Analytics.tsx` |
| 4.22 | Crear Rendimiento | Tabla de rendimiento | `frontend/src/components/admin/Rendimiento.tsx` |
| 4.23 | Crear Atributos | Gestión de atributos | `frontend/src/components/admin/Atributos.tsx` |

---

## 7. Fase 5: Cache y Rendimiento (2 días)

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 5.1 | Revisar purge on all admin handlers | Verificar que cada handler de modificación purga cache | Todos los routes |
| 5.2 | Testear cache hits/misses | Forzar cache MISS, verificar HIT | — |
| 5.3 | Verificar eliminación de doble fetch | Cada componente React usa props, no fetch | Todos los componentes |
| 5.4 | Verificar `window.__RDH_SETTINGS__` | Que settings se inyectan y leen correctamente | Layout, settings-store |
| 5.5 | Optimizar imágenes | Verificar lazy loading, tamaños | Componentes de imágenes |
| 5.6 | Revisar headers de cache | _headers, Cache-Control en API | `public/_headers`, middleware |

---

## 8. Fase 6: Deploy y CI/CD (1 día)

| # | Tarea | Detalle | Archivos afectados |
|---|-------|---------|-------------------|
| 6.1 | Configurar Cloudflare Pages | Proyecto, build command, environment vars | Cloudflare Dashboard |
| 6.2 | Configurar Cloudflare Workers | Worker, rutas, secrets | Cloudflare Dashboard |
| 6.3 | Configurar DNS | CNAME records para domain + api subdomain | Cloudflare Dashboard |
| 6.4 | Configurar WAF rate limiting | Regla de rate limiting por IP | Cloudflare Dashboard |
| 6.5 | Configurar GitHub Actions | Pipeline de deploy frontend + worker | `.github/workflows/deploy.yml` |
| 6.6 | Setear secrets en GitHub | CF_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | GitHub Settings |
| 6.7 | Testear deploy completo | Push a main → build → deploy → verify | — |
| 6.8 | Testear purge en producción | Modificar producto en admin → verificar fresco en público | — |

---

## 9. Fase 7: Testing y QA (2 días)

| # | Tarea | Detalle |
|---|-------|---------|
| 7.1 | Testear todas las rutas de la API | Cada endpoint con requests válidos e inválidos |
| 7.2 | Testear autenticación | Login, token expirado, refresh, sin token |
| 7.3 | Testear cache purge | Modificar producto → verificar cache purged |
| 7.4 | Testear catálogo completo | Filtros, búsqueda, paginación, orden |
| 7.5 | Testear producto individual | Meta tags, JSON-LD, sizes, stock, WhatsApp |
| 7.6 | Testear admin completo | CRUD de cada entidad, upload imágenes, activity log |
| 7.7 | Testear carrito | Agregar, remover, WhatsApp message |
| 7.8 | Testear analytics | Events tracking, dashboard |
| 7.9 | Testear responsive | Mobile, tablet, desktop |
| 7.10 | Testear 404 | Rutas inválidas |
| 7.11 | Testear rate limiting | Exceder límite de requests |
| 7.12 | Testear rendimiento general | Lighthouse, Core Web Vitals |
| 7.13 | Testear migración de datos | Si se migran datos existentes |

---

## 10. Prioridades

### Crítico (bloqueante)
- Fase 1 (DB) — sin DB no funciona nada
- Fase 2 día 1 (Core + Auth) — sin auth no hay admin
- Fase 3 día 1 (Layout + tipos) — sin layout no hay frontend

### Alta prioridad
- CRUD de productos (2.10)
- Catálogo público (3.13, 3.14)
- Admin ProductsList + ProductForm (4.8, 4.10)
- Cache purge (2.25)

### Media prioridad
- Analytics (2.22, 4.21)
- Rendimiento (2.24, 4.22)
- Sitemap (3.31)
- Atributos (4.23)

### Baja prioridad (post-MVP)
- Image Composition Editor avanzado
- Analytics dashboard con gráficos
- Export de datos
- Temas/múltiples colores

---

## 11. Dependencias entre tareas

```
Fase 0 (Setup)
  └── Fase 1 (DB)
       └── Fase 2 (API Worker)
            ├── Fase 3 (Frontend público)
            └── Fase 4 (Admin SPA)
                 └── Fase 5 (Cache y rendimiento)
                      └── Fase 6 (Deploy)
                           └── Fase 7 (Testing)
```

Las fases 3 y 4 pueden correr en paralelo (dependen de Fase 2 pero no entre sí).
