# Índice del Plan Maestro — Rincón del Hype

> **Proyecto:** Rincón del Hype — Tienda online de sneakers y streetwear
> **Propósito:** Reconstrucción completa del proyecto desde cero con arquitectura limpia
> **Fecha del plan:** Julio 2026
> **Estado:** Planificación completada, listo para implementación

---

## Archivos del plan

| # | Archivo | Contenido |
|---|---------|-----------|
| 00 | `00-indice.md` | Este archivo — índice general del plan maestro |
| 01 | `01-vision-y-arquitectura.md` | Visión general del proyecto, stack tecnológico, arquitectura, justificación de cada decisión, estructura de carpetas, flujo de datos |
| 02 | `02-base-de-datos.md` | Schema completo de la base de datos (23 migraciones), tablas, relaciones, RLS, índices, triggers, storage buckets |
| 03 | `03-api-worker.md` | API con Hono, definición de rutas (públicas y admin), middlewares (CORS, auth, cache, error handling), validación con Zod, integración con Supabase |
| 04 | `04-frontend-publico.md` | Frontend con Astro 7, páginas (home, catálogo, producto, 404), componentes públicos, layout, estilos, data flow SSR a componentes React |
| 05 | `05-admin-spa.md` | Panel administrativo SPA, autenticación con Zustand, dashboard, ABM completo de productos/categorías/talles/marcas/video-drops, drag & drop upload, editor de composición de imágenes |
| 06 | `06-cache-y-rendimiento.md` | Estrategia de caché (Cloudflare Cache API + purge on-demand), SSR con datos frescos, eliminación del doble fetch, optimización de KV reads, lazy hydration |
| 07 | `07-despliegue-y-cicd.md` | Configuración de Cloudflare Pages + Workers + Supabase, variables de entorno, DNS, CI/CD con GitHub Actions, entornos dev/prod |
| 08 | `08-convenciones-y-estandares.md` | Convenciones de código, naming, estructura de archivos, reglas de TypeScript, manejo de errores, logs, estándares de commits |
| 09 | `09-roadmap-y-tareas.md` | Roadmap de implementación en fases, lista de tareas detallada por fase, dependencias entre tareas, estimaciones |
| 10 | `10-decisiones-y-riesgos.md` | Decisiones arquitectónicas tomadas, decisiones descartadas con motivos, riesgos identificados, deuda técnica evitada |

---

## Cómo usar este plan

### Para un desarrollador humano

Leer en orden: 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10.
Cada archivo asume que leíste los anteriores.

### Para una IA (Claude, Copilot, etc.)

Usar el archivo `09-roadmap-y-tareas.md` como guía de implementación. Cada tarea referencia las secciones relevantes de los otros archivos. No implementar sin leer la sección correspondiente del plan.

### Para onboardear a un nuevo miembro

Leer 01 (visión general), 08 (convenciones) y 09 (roadmap). Los demás archivos son referencia para consultar cuando se necesiten.

---

## Resumen ejecutivo del plan

**Problema original:** El proyecto actual fue desarrollado completamente con IA mediante instrucciones incrementales sin planificación arquitectónica. Esto generó: tipos duplicados en 4 archivos, API_BASE hardcodeada en 6 lugares, router manual con switch-case de 534 líneas, doble fetch SSR+cliente que genera hasta 7 KV reads por visita, cache en Map que no persiste entre isolates de Cloudflare, rate limit que escribe a KV por request, código muerto, y un bug activo de encoding ("Â¡Sin stock!").

**Solución:** Reconstrucción completa desde cero con arquitectura definida antes de escribir código. Se mantiene la funcionalidad existente (todo el ABM de productos/categorías/talles/marcas/video-drops, dashboard, drag & drop upload, editor de imágenes, analytics, activity log, etc.) pero con estructura limpia y patrones que no permiten que los problemas originales reaparezcan.

**Stack:** Astro 7 + React 19 + TypeScript 6 + Tailwind CSS 4 (frontend) + Hono (API Worker) + Supabase PostgreSQL (DB) + Cloudflare Pages + Workers (infraestructura).

**Diferencias clave con el proyecto actual:**
- Router artesanal → Hono con rutas declarativas y middlewares
- Tipos en 4 archivos → Un solo types.ts en frontend
- Cache Map aislado → Cloudflare Cache API + purge on-demand
- Rate limit con KV → Cloudflare WAF (dashboard, 0 código)
- 7 KV reads por catálogo → 0 KV reads (cache + SSR)
- Doble fetch SSR+cliente → SSR como fuente única
- Settings fetcheados 3 veces → Inyectados desde Layout via `window.__RDH_SETTINGS__`
- Componentes admin de 600+ líneas → Componentes modulares < 300 líneas
- Sin .env → Variables de entorno centralizadas

**Fases de implementación (~23 días hábiles):**
0. Setup (inicialización de proyectos + dependencias)
1. Base de datos (aplicar migraciones, buckets, auth)
2. API Worker con Hono (rutas, middlewares, auth)
3. Frontend público (páginas Astro + componentes React)
4. Admin SPA (React + react-router-dom + Zustand)
5. Cache y rendimiento (purge, verificar eliminación doble fetch)
6. Despliegue y CI/CD (Cloudflare + GitHub Actions)
7. Testing y QA
