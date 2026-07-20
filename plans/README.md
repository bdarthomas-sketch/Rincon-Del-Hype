# Plan Maestro — Rincón del Hype

> Reconstrucción completa desde cero del ecommerce de sneakers/streetwear.
> Arquitectura definida ANTES de escribir código.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Astro 7 + React 19 + TypeScript 6 + Tailwind CSS 4 |
| API | Hono 4 (Cloudflare Worker) |
| DB | Supabase PostgreSQL (23 migraciones existentes) |
| Auth | Supabase Auth + JWT en localStorage |
| Storage | Supabase Storage + Cloudflare Images (bg removal) |
| Cache | Cloudflare Cache API (purge on-demand, 5s TTL) |
| Rate limiting | Cloudflare WAF (dashboard, 0 código) |
| State | Zustand 5 (auth, cart, settings) |
| Validation | Zod 3 |
| CI/CD | GitHub Actions + Wrangler |
| DNS | Cloudflare (rincondelhype.com + api.rincondelhype.com) |

## Archivos del plan (leer en orden)

| # | Archivo | Qué cubre |
|---|---------|-----------|
| 00 | `00-indice.md` | Índice + resumen ejecutivo |
| 01 | `01-vision-y-arquitectura.md` | Stack, estructura de carpetas, flujo de datos, principios |
| 02 | `02-base-de-datos.md` | Schema, migraciones, tablas, RLS, índices, triggers, storage buckets |
| 03 | `03-api-worker.md` | Rutas Hono, middlewares, auth, validación Zod, entry point |
| 04 | `04-frontend-publico.md` | Páginas Astro, componentes públicos, SSR data flow |
| 05 | `05-admin-spa.md` | Admin SPA con react-router-dom, Zustand, ABM completo |
| 06 | `06-cache-y-rendimiento.md` | Cache API, purge on-demand, eliminación doble fetch |
| 07 | `07-despliegue-y-cicd.md` | Cloudflare Pages + Workers, DNS, CI/CD |
| 08 | `08-convenciones-y-estandares.md` | Naming, TypeScript, errores, commits |
| 09 | `09-roadmap-y-tareas.md` | Roadmap por fases, ~100 tareas detalladas, dependencias |
| 10 | `10-decisiones-y-riesgos.md` | Decisiones, tradeoffs, alternativas descartadas, riesgos |

## Decisiones arquitectónicas clave

1. **SSR como fuente única** — datos fetcheados en Astro y pasados como props a React. Componentes NO refetchean lo mismo al montar.
2. **Doble fetch eliminado** — antes se hacía SSR + cliente (7 KV reads por catálogo). Ahora SSR solo, cliente recibe por props.
3. **Settings vía `window.__RDH_SETTINGS__`** — se fetchean una vez en Layout.astro y se inyectan globalmente. Componentes no llaman `fetchSettings()`.
4. **Cache purge on-demand** — admin modifica algo → Worker purga URLs específicas de Cloudflare Cache API. No rebuild, no redeploy. 5s TTL como fallback.
5. **WAF en vez de KV para rate limiting** — 0 código, 0 latency, configuración desde dashboard.
6. **Un solo `types.ts`** — todos los tipos del frontend en `src/data/types.ts`. Admin y público comparten interfaces.
7. **Brands y sizes se derivan de products en JS** — no hay endpoints separados para esto.
8. **JWT en localStorage** — tradeoff aceptado para SPA admin. No justifica cookies httpOnly.

## Estructura del proyecto

```
rincon-del-hype/
├── frontend/            # Astro 7 app
│   ├── src/
│   │   ├── components/  # public/, admin/, cart/, catalogo/, producto/, ui/
│   │   ├── pages/       # index, catalogo, producto/[slug], admin/, 404, sitemap.xml.ts
│   │   ├── layouts/     # Layout.astro (principal)
│   │   ├── lib/         # api.ts, config.ts, utils.ts, store/, analytics.ts
│   │   ├── data/        # types.ts (ÚNICO archivo de tipos)
│   │   ├── hooks/       # use-scroll-reveal, use-focus-trap
│   │   ├── styles/      # global.css (Tailwind v4 + theme)
│   │   └── assets/      # brand/
│   └── public/          # fonts/, brand/, social/, about/, gallery/, robots.txt, _headers, _redirects
├── worker/              # Hono API (Cloudflare Worker)
│   └── src/
│       ├── index.ts     # Entry point + routing
│       ├── types.ts     # Env, AdminUser, interfaces
│       ├── middleware/   # auth, cors, cache, error-handler
│       ├── routes/       # products, categories, sizes, brands, images, auth, settings, stats, analytics, rendimiento, video-drops
│       └── lib/          # supabase, validate, activity
├── supabase/
│   └── migrations/       # 001-023 (aplicar tal cual)
└── .github/workflows/    # deploy.yml
```

## Roadmap (~23 días hábiles)

```
Fase 0: Setup (2d) → Fase 1: DB (1d) → Fase 2: API Worker (5d)
                                           ├── Fase 3: Frontend público (5d)
                                           └── Fase 4: Admin SPA (5d)
                                                    └── Fase 5: Cache (2d)
                                                             └── Fase 6: Deploy (1d)
                                                                      └── Fase 7: Testing (2d)
```

Fases 3 y 4 pueden correr en paralelo (dependen de Fase 2 pero no entre sí).

## Datos sensibles del plan original

- **Migración 023** tiene URL hardcodeada de la instancia antigua de Supabase. Corregir antes de aplicar.
- **Bucket de Storage** `product-images` y `video-drops` deben crearse manualmente en Supabase Dashboard.
- **Admin user** debe crearse en Supabase Auth + tabla `admins` manualmente.
- **Rate limiting WAF** se configura desde Cloudflare Dashboard (no hay código).
- **ALLOWED_ORIGINS** debe incluir `http://localhost:4321` para dev local.

## Estado actual

✅ Planificación completada — 11 archivos escritos y verificados.
✅ 7 inconsistencias corregidas tras verificación.
✅ Listo para arrancar Fase 0 (Setup).

## Lo que NO cambia del proyecto original

- UI/UX del sitio público (Hero, About, HowToOrder, etc.)
- Schema de DB (23 migraciones tal cual)
- Carrito con useSyncExternalStore + localStorage
- Smooth scroll con Lenis
- Background removal con Cloudflare Images
- Soft-delete de productos
- Activity log
- Analytics tracking
- @dnd-kit para reordenar productos

## Lo que se elimina

- Router manual switch-case (534 líneas) → Hono
- Tipos duplicados en 4 archivos → 1 types.ts
- Cache en Map (no persiste entre isolates) → Cloudflare Cache API
- Rate limit con KV (escribe por request) → WAF
- Código muerto: `log.ts`, `PRODUCT_IMAGE_PADDING`, `use-timeline-animation.ts`
- Ruta de refresh `/admin/refresh` → simplificado

## Para empezar a implementar

1. Leer `09-roadmap-y-tareas.md` — tiene el desglose completo de tareas.
2. Arrancar con Fase 0 (Setup): crear carpetas, inicializar Astro + Hono, instalar deps.
3. Antes de cada tarea, leer la sección correspondiente del plan (referenciada en la tarea).

## Para mí (IA) en futuras sesiones

Cuando retomes este proyecto:
1. Leé este README primero para contexto general.
2. Si hay tareas en progreso, leé `09-roadmap-y-tareas.md` para saber dónde quedó.
3. Usá los archivos del plan como referencia — cada uno tiene los detalles de implementación.
4. No implementes nada sin leer la sección correspondiente del plan primero.
