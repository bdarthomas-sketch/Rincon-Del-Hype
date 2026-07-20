# 10 — Decisiones y Riesgos

> **Archivo:** `plans/10-decisiones-y-riesgos.md`
> **Propósito:** Documentar las decisiones técnicas tomadas, las alternativas descartadas con sus justificaciones, y los riesgos identificados con sus planes de mitigación.
> **Dependencias:** Todos los archivos 01 a 09

---

## 1. Decisiones Tomadas

### 1.1 Stack tecnológico

| Decisión | Opción elegida | Alternativas descartadas | Motivo |
|----------|---------------|------------------------|--------|
| Frontend framework | **Astro 7** | Next.js, SvelteKit, Remix | Ya estábamos en Astro, SSR + islas de React es perfecto para el patrón (poco JS en público, mucho JS en admin) |
| API framework | **Hono 4** | Express, itty-router, vanilla Workers | Router declarativo, middlewares, tipado, soporte nativo Workers |
| State management | **Zustand 5** | Redux Toolkit, Jotai, React Context | 1KB, sin Providers, accesible fuera de componentes |
| Cache | **Cloudflare Cache API** | KV (lecturas), KV (Cache API manual) | Cache global, purge on-demand, no rebuilding |
| Rate limiting | **Cloudflare WAF** | KV (writes por request), Upstash | 0 latency, 0 cost, 0 código, config desde dashboard |
| DB | **Supabase PostgreSQL** | PlanetScale, Turso, Neon | Ya tenemos las migraciones, RLS, Auth y Storage integrados, no cambiar lo que funciona |
| CSS | **Tailwind CSS 4** | Vanilla CSS, CSS Modules, Styled Components | Ya estamos en Tailwind, utility-first, sin runtime |
| Autenticación admin | **JWT + localStorage** | Cookies httpOnly, Supabase SSR Auth | Es un SPA, no justifica la complejidad de cookies |

### 1.2 Decisiones de arquitectura

| Decisión | Opción | Alternativa | Motivo |
|----------|--------|-------------|--------|
| SSR vs SSG | **SSR (server)** | SSG (static) | Necesitamos datos frescos por request para precios, stock, disponibilidad |
| SSR + client data flow | **Props desde SSR** | Fetch en cliente | Elimina el doble fetch, reduce requests, mejora performance |
| Inyección de settings | **`window.__RDH_SETTINGS__`** | Fetch en cada componente | Evita N requests de settings por página |
| Validación API | **Zod en el Worker** | Validación en DB (constraints) | Mensajes de error más claros, validación antes de tocar DB |
| Tipos compartidos | **1 archivo central** | Generación automática desde DB | Simplicidad, control explícito |
| API BASE | **Variable de entorno única** | Hardcodeada en constantes | Centralizado, configurable por entorno |
| Admin como SPA | **react-router-dom** | Multi-page con Astro | La navegación interna del admin requiere estado que no se pierde entre páginas |
| Soft-delete vs hard-delete | **Soft-delete (deleted_at)** | DELETE físico | Seguridad, posibilidad de restaurar |

### 1.3 Decisiones de UI/UX

| Decisión | Opción | Motivo |
|----------|--------|--------|
| Hero con featured products | Carrusel de productos destacados | Misma funcionalidad que el original, mejor integración |
| Catálogo con filtros SPA | Filtros client-side con datos iniciales | Sin fetch extra, instantáneo al cambiar filtros |
| Carrito en localStorage | Persistencia local | No requiere sesión, funciona offline parcial |
| WhatsApp como checkout | Enlace directo | No necesitamos sistema de pagos, es un catálogo con venta por WhatsApp |

---

## 2. Decisiones NO tomadas (pospuestas)

| Decisión | Por qué se pospone | Cuándo reconsiderar |
|----------|-------------------|---------------------|
| Image optimization CDN | Cloudflare Images no es necesario para el volumen actual | Cuando el tráfico supere 10k visits/mes |
| PWA support | No hay caso de uso para offline total | Cuando haya demanda de users móviles |
| i18n | Solo español, tienda local | Si se expande a otros mercados |
| Testing unitario | Vitest config, pero sin tests obligatorios | Fase 7 (próximo milestone después del MVP) |
| E2E testing | Playwright sería ideal pero es overkill ahora | Cuando el proyecto tenga 3+ features críticos |
| Rate limiting adaptativo | WAF simple es suficiente | Si hay ataques DDoS específicos |

---

## 3. Alternativas Descartadas

### 3.1 Next.js en vez de Astro

**Motivo de descarte:** Next.js es increíble para apps complejas, pero nuestro patrón es simple: páginas con SSR + islas de interactividad. Astro hace esto de forma nativa sin el overhead conceptual de Next.js (server components, client components, server actions, etc.). Además ya estábamos en Astro.

### 3.2 tRPC en vez de Hono + REST

**Motivo de descarte:** tRPC requiere que frontend y backend compartan tipos. Nosotros tenemos frontend (Astro) y backend (Worker) en repos separados. tRPC no aporta beneficios sobre Hono + tipos manuales compartidos.

### 3.3 Redis / Upstash para rate limiting

**Motivo de descarte:** Cloudflare WAF es gratuito en el plan de Workers, no requiere infraestructura adicional, 0 latencia. Redis/Upstash agrega latency de red y un punto de fallo más.

### 3.4 Cookies httpOnly para auth admin

**Motivo de descarte:** El admin es un SPA dentro de Astro. Para usar cookies httpOnly, necesitaríamos un endpoint que setee la cookie, y el frontend tendría que hacer requests con credenciales. localStorage + JWT es más simple y no agrega riesgos de seguridad significativos (es un panel admin, no datos de usuarios).

### 3.5 Generación de tipos desde DB (supabase-js types)

**Motivo de descarte:** `supabase gen types` genera tipos enormes y difíciles de leer. Preferimos tipos manuales explícitos que sabemos exactamente qué contienen.

### 3.6 React Query / TanStack Query

**Motivo de descarte:** Con SSR como fuente única de datos, los componentes no fetchean. React Query sirve para sincronizar estado servidor-cliente, pero nosotros no tenemos ese problema porque el servidor ya nos da los datos. Para el admin (que sí fetchea), un `useEffect` + estado local es suficiente — no justifica agregar una dependencia.

---

## 4. Compensaciones (Tradeoffs)

| Tradeoff | Beneficio | Costo |
|----------|-----------|-------|
| SSR en vez de SSG | Datos siempre frescos | Mayor latency en primer render (solución: cache) |
| localStorage para tokens | Simple, sin dependencias | Vulnerable a XSS (mitigación: sanitizar HTML, CSP) |
| Solo React donde necesario | Menos JS bundle, más rendimiento | Mayor complejidad conceptual (islas vs SPA puro) |
| Sin tests en MVP | Velocidad de desarrollo | Mayor riesgo de regresiones |
| Tipos manuales | Control explícito | Posible desincronización con DB real |
| Purge manual en handlers | Control granular | Un handler olvidado = datos stale |
| 5s TTL de cache | Buen hit rate + frescura | En picos extremos puede no ser suficiente |

---

## 5. Riesgos

### 5.1 Riesgos técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **DB corrupta por falta de migraciones** | Baja | Alto | Aplicar migraciones en orden, verificar schema con queries |
| **Cache purge no funciona** | Media | Medio | Logging de purge + fallback a TTL corto (5s) |
| **Olvidar purge en algún handler** | Media | Medio | Revisión de código antes del deploy, checklist |
| **Algún componente React fetchea datos** | Media | Alto | Code review, el patrón es explícito (props vs fetch) |
| **CORS mal configurado** | Baja | Alto | Testear con requests desde frontend local y producción |
| **Token JWT expira y no refresca** | Media | Medio | El store tiene scheduleRefresh, probar el flujo completo |
| **Supabase Auth rate limiting** | Baja | Medio | Usar service_role key + auth en middleware, no en cada request |
| **Migración 023 con URLs hardcodeadas** | Alta | Medio | Ya documentado en 02-base-de-datos.md, actualizar antes de deploy |

### 5.2 Riesgos de migración

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **Migración 023 tiene URL hardcodeada** | Alta | Medio | Documentado y marcado, cambiar antes de aplicar |
| **Seed data de settings perdida** | Media | Bajo | El SQL está en la migración 012 |
| **Bucket de Storage no creado** | Baja | Alto | Paso explícito en Fase 1 |
| **Permisos de Storage incorrectos** | Baja | Medio | Verificar RLS policies en Storage |

### 5.3 Riesgos de deploy

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **DNS no propagado** | Media | Alto | Probar con workers.dev URL primero |
| **Secrets no seteados en GitHub** | Media | Alto | CI/CD falla si faltan secrets (detectable) |
| **WAF bloquea requests legítimos** | Baja | Medio | Monitorear WAF logs los primeros días |
| **Deploy frontend sin worker deployado** | Media | Alto | Orden explícito en CI/CD (Worker → Frontend) |

### 5.4 Riesgos de negocio

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **Admin no puede modificar productos** | Baja | Alto | Testing exhaustivo del admin antes del deploy |
| **Página pública muestra datos viejos** | Baja | Medio | Cache de 5s asegura frescura máxima |
| **Carrito pierde datos** | Baja | Medio | localStorage persistente, el carrito es temporal de todas formas |
| **Imágenes no cargan** | Baja | Alto | Verificar URLs de Storage, tener fallback visual |

---

## 6. Checklist Pre-Producción

Antes de ir a producción, verificar:

- [ ] Migraciones 001-023 aplicadas y verificadas
- [ ] WAF rate limiting configurado
- [ ] DNS de producción configurado (rincondelhype.com + api.rincondelhype.com)
- [ ] Secrets seteados en Cloudflare Workers (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGINS)
- [ ] Variables de entorno en Cloudflare Pages (PUBLIC_API_BASE)
- [ ] GitHub Secrets seteados (CF_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] GitHub Variables seteadas (PUBLIC_API_BASE, ALLOWED_ORIGINS)
- [ ] URL de Supabase actualizada en migración 023
- [ ] Buckets de Storage creados con RLS
- [ ] Admin user creado en Supabase Auth + tabla admins
- [ ] Seed data de store_settings insertada
- [ ] Imágenes de marca subidas a storage
- [ ] Cache purge funciona en todos los handlers de admin
- [ ] CORS configurado con ALLOWED_ORIGINS correcto
- [ ] Componentes React no fetchean datos que ya vienen de SSR
- [ ] `window.__RDH_SETTINGS__` se inyecta correctamente
- [ ] Headers de cache estáticos en `public/_headers`
- [ ] Página 404 funcional
- [ ] Sitemap generado correctamente
