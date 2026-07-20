# 01 — Visión General y Arquitectura

> **Archivo:** `plans/01-vision-y-arquitectura.md`
> **Propósito:** Definir la visión del proyecto, el stack tecnológico, la arquitectura general, la justificación de cada decisión y la estructura de carpetas.
> **Dependencias:** Ninguno (archivo raíz del plan)

---

## 1. Visión del Proyecto

### 1.1 ¿Qué es Rincón del Hype?

Tienda online de sneakers y streetwear 100% auténticos, con base en Zona Oeste, Buenos Aires, Argentina. El proyecto consta de:

- **Sitio público**: Catálogo de productos, páginas individuales de producto, galería de videos, carrito de compras via WhatsApp
- **Panel administrativo**: Gestión completa de productos, categorías, talles, marcas, imágenes, videos, analytics, actividad, configuración de tienda

### 1.2 ¿Por qué se reconstruye?

El proyecto actual fue desarrollado íntegramente con IA mediante instrucciones incrementales ("agrega esto", "cambia aquello") sin una arquitectura definida. Esto generó:

- Deuda técnica estructural (router manual, tipos duplicados, fetch sin control)
- Bugs en producción (encoding roto, doble fetch)
- Imposibilidad de mantener/extender sin romper
- Consumo excesivo de Cloudflare KV
- Base de datos eliminada, infraestructura de Cloudflare eliminada

### 1.3 Objetivos de la reconstrucción

1. **Arquitectura definida**: Cada decisión documentada antes de implementar
2. **Mantenibilidad**: Código modular, tipado, testeable
3. **Rendimiento**: Cache inteligente, SSR optimizado, mínimo consumo de KV
4. **Instantaneidad**: Cambios en admin → visibles en página pública en segundos
5. **Funcionalidad completa**: Admin con todas las capacidades actuales + mejoras
6. **Deploy automatizado**: CI/CD con GitHub Actions

---

## 2. Stack Tecnológico

### 2.1 Stack final

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| Frontend framework | **Astro** | ^7.0 | SSR, routing de páginas, integración de componentes React |
| UI framework | **React** | ^19.0 | Componentes interactivos (catálogo, producto, admin) |
| Lenguaje | **TypeScript** | ^6.0 | Tipado estático en todo el proyecto |
| Estilos | **Tailwind CSS** | ^4.0 | Utility-first CSS |
| API Worker | **Hono** | ^4.x | Router declarativo, middlewares, Zod integration |
| Base de datos | **Supabase PostgreSQL** | — | Base de datos principal con RLS |
| Auth DB | **Supabase Auth** | — | Autenticación de administradores |
| Storage | **Supabase Storage** | — | Imágenes de productos, videos, assets |
| Cache edge | **Cloudflare Cache API** | — | Cache de respuestas API con purge on-demand |
| Rate limiting | **Cloudflare WAF** | — | Límite de requests por IP, sin código |
| Procesamiento imágenes | **Cloudflare Images** | — | Background removal en uploads |
| Deployment | **Wrangler** | ^4.0 | Deploy de Worker y Pages |
| CI/CD | **GitHub Actions** | — | Build + deploy automático |
| State management | **Zustand** | ^5.x | Estado global (auth admin, carrito) |
| Validación | **Zod** | ^3.x | Schemas de validación en API |
| Íconos | **Lucide React** | ^1.x | Íconos vectoriales |
| Smooth scroll | **Lenis** | ^1.x | Scroll suave |

### 2.2 Stack del proyecto original (para referencia)

| Tecnología | Original | Reconstrucción | Motivo del cambio |
|-----------|----------|---------------|-------------------|
| Router API | Switch-case manual (534 líneas) | **Hono** | Rutas declarativas, middlewares, mantenible |
| Cache API | Map en memoria | **Cloudflare Cache API** | Persiste entre isolates, purge global |
| Rate limiting | KV writes por request | **Cloudflare WAF** | 0 código, 0 KV usage, config desde dashboard |
| State admin | React Context | **Zustand** | Accesible fuera de React, sin Providers |
| Types | 4 archivos divergentes | **1 archivo central** | Single source of truth |
| Auth tokens | localStorage | localStorage (se mantiene) | Admin SPA, no justifica cookies httpOnly |
| @dnd-kit | Sí, para reordenar | **Se mantiene** | Funciona bien, no cambiarlo |
| react-router-dom | Sí, admin SPA | **Se mantiene** | Admin necesita ruteo interno |

### 2.3 Dependencias npm

```json
// frontend/package.json
{
  "dependencies": {
    "@astrojs/cloudflare": "^14.1.0",
    "@astrojs/react": "^6.0.0",
    "@dnd-kit/core": "^6.3.0",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.0",
    "@supabase/supabase-js": "^2.110.0",
    "@tailwindcss/vite": "^4.3.0",
    "astro": "^7.0.0",
    "clsx": "^2.1.0",
    "lenis": "^1.3.0",
    "lucide-react": "^1.17.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.17.0",
    "tailwind-merge": "^3.6.0",
    "tailwindcss": "^4.3.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "typescript": "^6.0.0"
  }
}
```

```json
// worker/package.json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0",
    "hono": "^4.7.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250401.0",
    "typescript": "^6.0.0",
    "wrangler": "^4.0.0"
  }
}
```

### 2.4 Justificación de cada tecnología

**Astro 7**: Es el framework que mejor integra SSR + islas de React. Permite tener componentes React solo donde se necesita interactividad (catálogo, admin) y HTML plano donde alcanza (SEO, contenido estático). El adapter de Cloudflare Pages funciona de primera. Ya estábamos en Astro, no hay razón para migrar.

**Hono**: Router declarativo con soporte nativo de Cloudflare Workers. Elimina el switch-case gigante. Los middlewares permiten separar CORS, auth, cache y error handling sin mezclarlos con la lógica de negocio. Integración directa con Zod para validación de schemas. Es el estándar de facto para Workers con routing en 2026.

**Tailwind CSS 4**: Ya está en el proyecto. La nueva versión con `@theme` y `@source` simplifica la configuración. Sin runtime, solo CSS generado en build.

**Zustand**: 1KB, sin Providers, sin boilerplate. El store es accesible desde cualquier lugar (incluyendo el helper de API que necesita leer el token de auth). Reemplaza React Context para el estado global del admin y el carrito.

**Cloudflare Cache API**: Permite almacenar respuestas en el edge cache de Cloudflare con control programático. Cuando el admin modifica un producto, podemos purgar exactamente las URLs de cache que quedaron obsoletas. Esto da frescura en segundos sin rebuild del proyecto.

**Cloudflare WAF para rate limiting**: En vez de escribir a KV por cada request (como hace el proyecto actual), configuramos reglas desde el dashboard de Cloudflare. 0 latency, 0 cost, 0 código. Las reglas se aplican a nivel de edge antes de que el request llegue al Worker.

**Supabase**: PostgreSQL con RLS, Auth y Storage integrados. Las 23 migraciones existentes están bien diseñadas. No cambiar algo que funciona.

---

## 3. Arquitectura General

### 3.1 Diagrama de alto nivel

```
                    ┌─────────────────────────────────────┐
                    │          Cloudflare DNS              │
                    │       rincondelhype.com              │
                    └──────────┬──────────────┬────────────┘
                               │              │
                    ┌──────────▼────┐  ┌──────▼───────────┐
                    │  Cloudflare   │  │  Cloudflare WAF   │
                    │  Pages (SSR)  │  │  Rate Limiting    │
                    │  Frontend     │  │  (dashboard)      │
                    │  Astro + React│  └──────────────────┘
                    └──────┬───────┘
                           │ llama a API
                    ┌──────▼───────┐
                    │  Cloudflare  │
                    │  Workers     │
                    │  Hono API    │
                    │  (edge)      │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
     ┌────────────┐ ┌──────────┐ ┌──────────┐
     │  Supabase  │ │ Supabase │ │Cloudflare│
     │  Postgres  │ │ Storage  │ │ Images   │
     │  + Auth    │ │ (img/vid)│ │(bg rem)  │
     └────────────┘ └──────────┘ └──────────┘
```

### 3.2 Flujo de datos por página

#### Home (/)
```
1. Browser request → Cloudflare Pages (SSR)
2. Layout.astro se ejecuta en el edge
3. Layout llama GET /api/settings → Cache HIT/MISS
4. Page index.astro se ejecuta:
   a. getAllProducts() → GET /api/products → Cache
   b. Filtra p.isNew para NewArrivals
5. HTML se renderiza con datos inline
6. Browser recibe HTML + React hydrate:
   - Hero (client:load)
   - NewArrivals con productos ya incluidos (NO fetch extra)
   - HypeGallery (client:visible → fetchVideoDrops)
   - CartDrawer (client:load)
   - Settings desde window.__RDH_SETTINGS__ (NO fetch extra)
```

#### Catálogo (/catalogo)
```
1. Browser request → Cloudflare Pages (SSR)
2. Layout.astro se ejecuta (settings inyectados)
3. Page catalogo.astro:
   a. getAllProducts() → GET /api/products → Cache (1 request)
   b. getCategories() → GET /api/categories → Cache (1 request)
   c. brands y sizes se derivan de products en JS (0 requests extra)
4. HTML renderizado con todos los datos
5. Browser: CatalogoPage recibe productos por props (NO fetch extra)
```

#### Producto (/producto/:slug)
```
1. Browser request → Cloudflare Pages (SSR)
2. Page [slug].astro:
   a. fetchProductBySlug(slug) → GET /api/products/:slug → Cache
   b. Genera meta tags (title, og:description, ld+json)
   c. Pasa el producto como prop a ProductoPage
3. Browser: ProductoPage recibe initialProduct (NO fetch extra)
```

#### Admin (/admin/*)
```
1. Browser request → Cloudflare Pages (SSR, HTML mínimo)
2. AdminApp (client:only="react") se hidrata en browser
3. AdminApp verifica sesión → GET /api/admin/check
4. Router interno (react-router-dom) maneja las rutas
5. Cada sección hace sus requests autenticados
```

### 3.3 Cómo funciona la instantaneidad admin → público

```
Admin guarda un producto (PUT /api/admin/products/:id)
  → Middleware de auth verifica el token JWT
  → Valida body con Zod
  → Escribe en Supabase
  → Invalida cache de Cloudflare:
      - Purga /api/products (lista)
      - Purga /api/products/:slug (detalle)
      - Purga /api/products/:id (por UUID)
  → Responde 200 OK

Próximo request de visitante a /catalogo:
  → Cache MISS (porque purgamos)
  → Worker consulta Supabase
  → Sirve datos frescos
  → Almacena en cache por 5 segundos
```

El purge es una operación del Worker que usa Cloudflare Cache API para eliminar entradas específicas. No requiere rebuild del proyecto, no requiere redeploy. El próximo request obtiene datos frescos.

### 3.4 Eliminación del doble fetch (comparativa)

| Página | Antes (KV reads) | Después (KV reads) | Diferencia |
|--------|-----------------|-------------------|------------|
| /catalogo | 7 (SSR: 4, Cliente: 3) | 2 (SSR: 2, Cliente: 0) | -71% |
| /producto/:slug | 4 (SSR: 1, Cliente: 3) | 1 (SSR: 1, Cliente: 0) | -75% |
| / | 4 (SSR: 1, Cliente: 3) | 2 (SSR: 1, Cliente: 1)* | -50% |

*El fetch de HypeGallery es legítimo — no tiene equivalente SSR.

**Cómo se logra:**
1. SSR fetchea los datos una vez y los pasa como props a componentes React
2. Componentes React confían en las props y NO hacen fetch al montar
3. Brands y sizes se derivan de products en JavaScript (no con funciones que fetchean)
4. Settings se fetchean en Layout.astro y se inyectan via `window.__RDH_SETTINGS__`
5. Componentes leen de `window.__RDH_SETTINGS__` en vez de llamar `fetchSettings()`

---

## 4. Estructura de Carpetas

```
rincon-del-hype/
│
├── frontend/                          # Astro app (sitio público + admin SPA)
│   ├── src/
│   │   ├── components/
│   │   │   ├── public/                # Componentes del sitio público
│   │   │   │   ├── Hero.tsx
│   │   │   │   ├── SiteHeader.tsx
│   │   │   │   ├── SiteFooter.tsx
│   │   │   │   ├── NewArrivals.tsx
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── CatalogFilters.tsx
│   │   │   │   ├── HowToOrder.tsx
│   │   │   │   ├── About.tsx
│   │   │   │   ├── HypeGallery.tsx
│   │   │   │   ├── WhatsAppIcon.tsx
│   │   │   │   ├── SmoothScroll.tsx
│   │   │   │   ├── PageViewTracker.tsx
│   │   │   │   ├── UsdModal.tsx
│   │   │   │   └── SizePicker.tsx
│   │   │   ├── admin/                 # Componentes del panel admin
│   │   │   │   ├── AdminApp.tsx        # Entry point del SPA
│   │   │   │   ├── Layout.tsx          # Layout del admin
│   │   │   │   ├── Dashboard.tsx       # Panel principal + StatsGrid
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── ProductsList.tsx
│   │   │   │   ├── ProductForm.tsx
│   │   │   │   ├── ProductOrder.tsx
│   │   │   │   ├── ProductPreview.tsx
│   │   │   │   ├── ImageCompositionEditor.tsx
│   │   │   │   ├── DragDropUpload.tsx
│   │   │   │   ├── CategoriesManager.tsx
│   │   │   │   ├── SizesManager.tsx
│   │   │   │   ├── BrandsManager.tsx
│   │   │   │   ├── VideoDropsManager.tsx
│   │   │   │   ├── ActivityModal.tsx
│   │   │   │   ├── Settings.tsx
│   │   │   │   ├── Rendimiento.tsx
│   │   │   │   ├── Atributos.tsx
│   │   │   │   └── StatusBadge.tsx
│   │   │   ├── cart/                  # Componentes del carrito
│   │   │   │   ├── CartDrawer.tsx
│   │   │   │   └── CartTrigger.tsx
│   │   │   ├── catalogo/              # Componente de página de catálogo
│   │   │   │   └── CatalogoPage.tsx
│   │   │   ├── producto/              # Componente de página de producto
│   │   │   │   └── ProductoPage.tsx
│   │   │   └── ui/                    # Componentes UI reutilizables
│   │   │       └── SearchBar.tsx
│   │   │
│   │   ├── pages/                     # Páginas de Astro (ruteo automático)
│   │   │   ├── index.astro            # Home
│   │   │   ├── catalogo.astro         # Catálogo
│   │   │   ├── producto/
│   │   │   │   └── [slug].astro       # Página dinámica de producto
│   │   │   ├── admin/
│   │   │   │   └── index.astro        # Admin SPA entry
│   │   │   ├── 404.astro              # Página 404
│   │   │   └── sitemap.xml.ts         # Sitemap dinámico con productos
│   │   │
│   │   ├── layouts/
│   │   │   └── Layout.astro           # Layout principal (head, fonts, settings, footer)
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                 # Cliente API (fetch tipado, endpoints)
│   │   │   ├── config.ts              # API_BASE, WHATSAPP_PHONE
│   │   │   ├── utils.ts               # cn, formatPrice, scrollToHash
│   │   │   ├── image-composition.ts   # getImageCompositionStyle
│   │   │   ├── process-media.ts       # Thumbnail/preview generation (browser)
│   │   │   ├── analytics.ts           # trackEvent, getSessionId
│   │   │   └── store/                 # Zustand stores
│   │   │       ├── auth-store.ts      # Auth state (admin token, user)
│   │   │       ├── cart-store.ts      # Cart state (items, drawer)
│   │   │       └── settings-store.ts  # Cached settings (from window)
│   │   │
│   │   ├── hooks/
│   │   │   ├── use-scroll-reveal.ts
│   │   │   └── use-focus-trap.ts
│   │   │   # NOTA: use-timeline-animation.ts NO se crea (código muerto original)
│   │   │
│   │   ├── data/
│   │   │   └── types.ts              # ÚNICO archivo de tipos del frontend
│   │   │
│   │   ├── assets/
│   │   │   └── brand/                # Logo, imágenes de marca
│   │   │
│   │   └── styles/
│   │       └── global.css            # Tailwind + theme + animaciones
│   │
│   ├── public/                        # Archivos estáticos
│   │   ├── favicon.svg
│   │   ├── favicon.ico
│   │   ├── robots.txt
│   │   ├── _headers
│   │   ├── _redirects
│   │   ├── fonts/
│   │   │   ├── 1.woff2               # font-1 (bold black, headings)
│   │   │   ├── 2.woff2               # font-2 (regular, body)
│   │   │   └── 3.woff2               # font-3 (light, accents)
│   │   ├── brand/
│   │   ├── social/
│   │   ├── about/
│   │   └── gallery/
│   │
│   ├── astro.config.mjs
│   ├── tsconfig.json
│   ├── tailwind.config.ts             # Tailwind v4 theme extension
│   └── package.json
│
├── worker/                            # Hono API (Cloudflare Worker)
│   ├── src/
│   │   ├── index.ts                   # Hono app entry, middleware setup
│   │   ├── types.ts                   # Tipos del worker
│   │   ├── middleware/
│   │   │   ├── auth.ts               # verifyAdmin, tryVerifyAdmin
│   │   │   ├── cors.ts               # CORS headers
│   │   │   ├── cache.ts              # Cache API + purge
│   │   │   └── error-handler.ts      # Error handling, Zod errors
│   │   ├── routes/
│   │   │   ├── products.ts           # CRUD productos + reorder + duplicate
│   │   │   ├── categories.ts         # CRUD categorías
│   │   │   ├── sizes.ts              # CRUD talles
│   │   │   ├── brands.ts             # CRUD marcas + merge
│   │   │   ├── images.ts             # Upload, delete, composition
│   │   │   ├── auth.ts               # Login, refresh, check
│   │   │   ├── settings.ts           # CRUD settings
│   │   │   ├── stats.ts              # Dashboard stats + activity log
│   │   │   ├── analytics.ts          # Admin analytics endpoints
│   │   │   ├── analytics_public.ts   # Track event público
│   │   │   ├── rendimiento.ts        # Performance data
│   │   │   └── video-drops.ts        # CRUD video drops
│   │   └── lib/
│   │       ├── supabase.ts           # Cliente Supabase
│   │       ├── validate.ts           # Zod schemas
│   │       └── activity.ts           # Activity logger
│   │
│   ├── wrangler.toml
│   ├── tsconfig.json
│   ├── .dev.vars                     # Variables locales (no commiteado)
│   └── package.json
│
├── supabase/                          # Configuración de Supabase
│   ├── config.toml                    # Config local de Supabase CLI
│   └── migrations/                    # 23 migraciones SQL
│       ├── 001_extensions.sql
│       ├── 002_categories.sql
│       ├── ... (todas las migraciones existentes)
│       └── 023_video_drops.sql
│
├── .env.example                       # Variables de entorno de ejemplo
├── .github/
│   └── workflows/
│       └── deploy.yml                 # CI/CD con GitHub Actions
├── .gitignore
└── README.md                          # Brief onboarding
```

---

## 5. Principios Arquitectónicos

### 5.1 Reglas de diseño

1. **SSR como fuente única**: Los datos se fetchean en SSR y se pasan como props a componentes React. Los componentes NO refetchean los mismos datos al montar.
2. **Un solo types.ts**: Todos los tipos del frontend viven en `src/data/types.ts`. Admin y público comparten las mismas interfaces.
3. **Variables de entorno**: Toda URL, API key o configuración de entorno va en `.env` / `wrangler secret`. Nada hardcodeado.
4. **Hono para routing**: El Worker usa Hono con rutas declarativas. No más switch-case.
5. **Cache con purge**: Cloudflare Cache API para respuestas. Purga on-demand cuando el admin modifica datos.
6. **Rate limiting en edge, no en código**: Cloudflare WAF, no KV.
7. **Componentes < 300 líneas**: Si un componente supera 300 líneas, se divide.
8. **Zustand para estado global**: Auth del admin, carrito, settings cacheados.
9. **Sin código muerto**: Ningún archivo/export sin uso. Si no se importa, no existe.
10. **Validación con Zod**: Toda entrada de API se valida con Zod antes de tocar la DB.

### 5.2 Lo que NO cambia (se mantiene del proyecto original)

- Componentes visuales del sitio público (Hero, About, HowToOrder, etc.) con su misma UI
- Funcionalidad completa del admin (Dashboard, ProductsList, ProductForm, todos los managers)
- Schema de base de datos (las 23 migraciones se aplican tal cual)
- Estilos, animaciones, tipografía, paleta de colores
- Sistema de carrito (useSyncExternalStore + localStorage)
- Smooth scroll con Lenis
- Background removal con Cloudflare Images
- Soft-delete de productos
- Activity log
- Analytics tracking

### 5.3 Lo que se elimina definitivamente

| Archivo/Función | Motivo |
|----------------|--------|
| `src/lib/log.ts` | Código muerto, nunca importado |
| `src/data/products.ts:PRODUCT_IMAGE_PADDING` | Código muerto, reemplazado por DB |
| `src/hooks/use-timeline-animation.ts` | Código muerto, nunca importado |
| `worker/src/lib/cache.ts` (Map) | Reemplazado por Cloudflare Cache API |
| `worker/src/lib/rate-limit.ts` (KV) | Reemplazado por Cloudflare WAF |
| `worker/src/index.ts` switch-case | Reemplazado por Hono |
| Ruta de refresh `/admin/refresh` | Simplificado a endpoint único |

---

## 6. Flujo de Autenticación

### 6.1 Admin login

```
1. Admin ingresa email + password en LoginPage
2. Frontend llama POST /api/admin/login
3. Worker:
   a. Llama a Supabase Auth: POST /auth/v1/token?grant_type=password
   b. Si credenciales válidas, Supabase devuelve access_token + refresh_token
   c. Worker verifica que el user está en la tabla admins
   d. Devuelve tokens al frontend
4. Frontend:
   a. Guarda tokens en localStorage (TOKEN_KEY, REFRESH_TOKEN_KEY)
   b. Redirige al Dashboard
   c. Programa refresh automático antes de que expire
```

### 6.2 Token refresh automático

```
1. AuthStore (Zustand) programa un setTimeout al 80% del expires_in
2. Cuando se dispara:
   a. Llama POST /api/admin/refresh con refresh_token
   b. Obtiene nuevo access_token
   c. Lo guarda en localStorage y en el store
   d. Reprograma el próximo refresh
3. Si el refresh falla (token expirado):
   a. Limpia localStorage
   b. Redirige al login
```

### 6.3 Protección de rutas API

```
Cada request a /api/admin/* pasa por el middleware de auth:
1. Extrae Authorization header (Bearer token)
2. Verifica token contra Supabase Auth (GET /auth/v1/user)
3. Verifica que el user existe en la tabla admins
4. Si OK → pasa al handler con adminUser en contexto
5. Si NO → responde 401 UNAUTHORIZED
6. Si es superadmin necesario → verifica role antes del handler
```

---

## 7. Variables de Entorno

### 7.1 Worker (`worker/.dev.vars` + `wrangler secret`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SUPABASE_URL` | URL del proyecto Supabase | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin bypass RLS) | `eyJ...` |
| `ALLOWED_ORIGINS` | Orígenes permitidos para CORS | `http://localhost:4321,https://rincondelhype.com` |

### 7.2 Frontend (`.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PUBLIC_API_BASE` | URL base de la API | `https://api.rincondelhype.com` |

### 7.3 Variables que NO existen (por decisión)

| Variable ausente | Motivo |
|-----------------|--------|
| `RATE_LIMIT_KV` id | No más KV namespace para rate limiting |
| `CLOUDFLARE_IMAGES_KEY` | Se usa el binding `IMAGES` de Cloudflare, no una API key |
