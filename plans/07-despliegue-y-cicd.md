# 07 — Despliegue y CI/CD

> **Archivo:** `plans/07-despliegue-y-cicd.md`
> **Propósito:** Documentar el setup completo de Cloudflare (Pages, Workers, DNS, WAF), las variables de entorno, secrets y el pipeline de CI/CD con GitHub Actions.
> **Dependencias:** `01-vision-y-arquitectura.md`, `03-api-worker.md`

---

## 1. Arquitectura de Despliegue

```
GitHub (main branch)
    │
    └── GitHub Actions
        ├── Build frontend (Astro)
        │   └── Deploy a Cloudflare Pages
        └── Deploy Worker (Hono)
            └── Publish a Cloudflare Workers
```

### 1.1 URLs finales

| Propósito | URL |
|-----------|-----|
| Sitio público | `https://rincondelhype.com` |
| API Worker | `https://api.rincondelhype.com` |
| Admin | `https://rincondelhype.com/admin` |
| Preview (PR) | `https://{branch}.rincondelhype.pages.dev` |

---

## 2. Cloudflare Setup

### 2.1 DNS

| Tipo | Nombre | Valor | Proxy |
|------|--------|-------|-------|
| CNAME | `@` | `rincondelhype.pages.dev` | Proxied (orange cloud) |
| CNAME | `api` | `rdh-api.{account}.workers.dev` | Proxied (orange cloud) |

### 2.2 Cloudflare Pages

| Configuración | Valor |
|--------------|-------|
| Proyecto | `rincon-del-hype` |
| Build command | `cd frontend && npm run build` |
| Build output | `frontend/dist/` |
| Root directory | — |
| Node.js version | 22 |

**Environment variables (Pages):**

| Variable | Valor |
|----------|-------|
| `PUBLIC_API_BASE` | `https://api.rincondelhype.com` |

### 2.3 Cloudflare Workers

| Configuración | Valor |
|--------------|-------|
| Nombre del Worker | `rdh-api` |
| Entry point | `worker/src/index.ts` |
| Ruta | `api.rincondelhype.com/*` |
| Zona | `rincondelhype.com` |

**Variables de entorno (secrets):**

| Secret | Fuente | Descripción |
|--------|--------|-------------|
| `SUPABASE_URL` | Supabase Dashboard | URL del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard | Service role key |
| `ALLOWED_ORIGINS` | Config | Orígenes permitidos para CORS |

### 2.4 Cloudflare WAF (Rate Limiting)

| Configuración | Valor |
|--------------|-------|
| Nombre de regla | `rdh-api-rate-limit` |
| Campo | `IP` |
| Requests | `100` |
| Período | `60 seconds` |
| Action | `Block` |
| URL | `api.rincondelhype.com/*` |

Esto elimina la necesidad de KV para rate limiting. 0 latencia, 0 cost, 0 código.

---

## 3. Variables de Entorno

### 3.1 Frontend (`.env` o Pages env vars)

```bash
PUBLIC_API_BASE=https://api.rincondelhype.com
```

Solo una variable pública. Nada secreto en el frontend.

### 3.2 Worker (`wrangler secret`)

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ALLOWED_ORIGINS
```

### 3.3 Desarrollo local

```bash
# worker/.dev.vars
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=eyJ... # anon key local
ALLOWED_ORIGINS=http://localhost:4321
```

---

## 4. CI/CD con GitHub Actions

### 4.1 Pipeline completo (`.github/workflows/deploy.yml`)

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Build
        run: cd frontend && npm run build
        env:
          PUBLIC_API_BASE: ${{ vars.PUBLIC_API_BASE }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: pages deploy frontend/dist --project-name=rincon-del-hype
          workingDirectory: frontend

  deploy-worker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
          cache-dependency-path: worker/package-lock.json

      - name: Install dependencies
        run: cd worker && npm ci

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: deploy
          workingDirectory: worker
          secrets: |
            SUPABASE_URL
            SUPABASE_SERVICE_ROLE_KEY
            ALLOWED_ORIGINS
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          ALLOWED_ORIGINS: ${{ vars.ALLOWED_ORIGINS }}
```

### 4.2 GitHub Secrets necesarios

| Secret | Ejemplo |
|--------|---------|
| `CF_API_TOKEN` | Cloudflare API token con permisos de Pages + Workers |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |

### 4.3 GitHub Variables necesarias

| Variable | Ejemplo |
|----------|---------|
| `PUBLIC_API_BASE` | `https://api.rincondelhype.com` |
| `ALLOWED_ORIGINS` | `https://rincondelhype.com` |

---

## 5. Scripts de package.json

### 5.1 Frontend (`frontend/package.json`)

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  }
}
```

### 5.2 Worker (`worker/package.json`)

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "types": "wrangler types"
  }
}
```

---

## 6. Desarrollo Local

### 6.1 Requisitos

- Node.js 22+
- Wrangler (`npm install -g wrangler`)
- Supabase CLI (opcional, para DB local)

### 6.2 Iniciar entorno local

```bash
# Terminal 1: API Worker
cd worker
wrangler dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 6.3 Flujo de desarrollo

```
1. Haces cambios en worker/src/
2. wrangler dev detecta cambios, recarga automáticamente
3. Haces cambios en frontend/src/
4. astro dev detecta cambios, recarga (HMR)
5. Todo corre en localhost
```

### 6.4 Base de datos local

Si tenés Supabase CLI y acceso al proyecto:

```bash
supabase start          # Inicia Postgres + Auth + Storage local
supabase db reset       # Resetea DB aplicando todas las migraciones
```

Si no tenés acceso a Supabase CLI, podés apuntar a la DB de producción (con service_role key) desde `.dev.vars`:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ALLOWED_ORIGINS=http://localhost:4321
```

---

## 7. Supabase Setup

### 7.1 Pasos para crear una instancia nueva

1. Crear proyecto en `supabase.com/dashboard`
2. Aplicar migraciones (ver `02-base-de-datos.md` sección 8)
3. Crear buckets de Storage:
   - `product-images` (público)
   - `video-drops` (público)
4. Configurar Auth:
   - Habilitar email/password auth
   - Crear usuario admin desde SQL Editor
5. Insertar admin en tabla `admins`:
   ```sql
   INSERT INTO admins (user_id, role)
   VALUES ('<uuid-de-auth.users>', 'superadmin');
   ```
6. Insertar seed de `store_settings`:
   ```sql
   INSERT INTO store_settings (key, value) VALUES
     ('store_info', '{"name":"Rincon del Hype","logo":"","whatsapp":"541136660741","instagram":"","tiktok":"","x":"","youtube":""}');
   ```
7. Subir imágenes de marca a `product-images`:
   - Logo, imágenes de categoría

### 7.2 Notas sobre la migración 023

La migración 023 tiene hardcodeada la URL `https://cyfkggbxvxbxpqijgtlm.supabase.co/...`. **Esta URL debe cambiarse** por la URL de la nueva instancia de Supabase antes de aplicar la migración.

Si no querés modificar la migración, simplemente aplicá la migración y luego actualizá los registros con las URLs correctas:

```sql
UPDATE video_drops SET
  thumbnail_url = 'https://<tu-proyecto>.supabase.co/storage/v1/object/public/video-drops/' || id || '/thumbnail.webp',
  video_url = 'https://<tu-proyecto>.supabase.co/storage/v1/object/public/video-drops/' || id || '/preview.mp4';
```

---

## 8. Monitoreo y Observabilidad

### 8.1 Cloudflare Analytics

- **Workers**: Dashboard de Cloudflare → Workers → rdh-api → Analytics
- **Pages**: Dashboard de Cloudflare → Pages → rincon-del-hype → Analytics
- **WAF**: Dashboard de Cloudflare → Security → Events

### 8.2 Logs del Worker

Wrangler deploy con `[observability] enabled = true` (ver `03-api-worker.md` sección 10) permite ver logs desde el dashboard de Cloudflare.

### 8.3 Errores 500

El middleware `error-handler.ts` logea errores no manejados:

```typescript
console.error('Unhandled error:', err);
```

Estos aparecen en los logs del Worker en Cloudflare Dashboard.
