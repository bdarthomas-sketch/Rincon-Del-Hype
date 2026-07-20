# 02 — Base de Datos (PostgreSQL + Supabase)

> **Archivo:** `plans/02-base-de-datos.md`
> **Propósito:** Documentar el schema completo de la base de datos, las 23 migraciones existentes, políticas RLS, storage buckets, índices y convenciones.
> **Dependencias:** `01-vision-y-arquitectura.md`

---

## 1. Esquema General

### 1.1 Relaciones entre tablas

```
brands ──┐
         │
categories ──┼── products ── product_sizes ── sizes
              │       │
              │       └── product_images
              │
              └── store_settings

admins ── activity_log

video_drops (independiente)

analytics_events (independiente, referencia opcional a products)
```

### 1.2 Lista completa de tablas (11 tablas)

| # | Tabla | Propósito | Filas estimadas |
|---|-------|-----------|----------------|
| 1 | `brands` | Catálogo de marcas | ~50 |
| 2 | `categories` | Categorías de productos | ~10 |
| 3 | `sizes` | Catálogo de talles disponibles | ~20 |
| 4 | `products` | Productos principales | ~200 |
| 5 | `product_sizes` | Relación M:N producto ↔ talle + stock | ~600 |
| 6 | `product_images` | Imágenes de cada producto | ~800 |
| 7 | `admins` | Administradores vinculados a Supabase Auth | ~3 |
| 8 | `store_settings` | Configuración clave/valor de la tienda | ~5 |
| 9 | `activity_log` | Registro de acciones de administradores | ~5000+ |
| 10 | `analytics_events` | Eventos de analytics de visitantes | ~10000+ |
| 11 | `video_drops` | Videos de la galería HypeGallery | ~10 |

---

## 2. Definición de Tablas

### 2.1 `brands` (migración 018)

```sql
CREATE TABLE brands (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);
```

**Notas:**
- Se agregó en la migración 018 como tabla independiente
- `products.brand` y `products.brands[]` (texto) coexistieron durante la migración
- `products.brand_id` (FK a brands) se agregó en la misma migración
- Las marcas existentes se migraron automáticamente con slugs deduplicados

### 2.2 `categories` (migración 002)

```sql
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2.3 `sizes` (migración 003)

```sql
CREATE TABLE sizes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL UNIQUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.4 `products` (migraciones 004, 006b, 010, 013, 014, 018, 019, 020, 021)

```sql
CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  brand               TEXT NOT NULL,
  brands              TEXT[] DEFAULT '{}',
  brand_id            UUID REFERENCES brands(id),
  price               NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  old_price           NUMERIC(10,2) CHECK (old_price IS NULL OR old_price >= 0),
  category_id         UUID REFERENCES categories(id) ON DELETE RESTRICT,
  description         TEXT,
  is_new              BOOLEAN NOT NULL DEFAULT false,
  is_featured         BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  deleted_at          TIMESTAMPTZ,
  image_padding       TEXT,
  out_of_stock_message TEXT DEFAULT NULL,
  sort_order          INT NOT NULL DEFAULT 0,
  auto_trim           BOOLEAN NOT NULL DEFAULT true,
  image_margin        INTEGER NOT NULL DEFAULT 50,
  image_scale         REAL NOT NULL DEFAULT 1.0,
  image_offset_x      REAL NOT NULL DEFAULT 0.0,
  image_offset_y      REAL NOT NULL DEFAULT 0.0,
  image_mode          TEXT NOT NULL DEFAULT 'fit',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Notas importantes:**
- `brand` y `brands[]` son legado de antes de la migración 018. La nueva arquitectura usa `brand_id`. Los campos `brand`/`brands[]` se mantienen por compatibilidad pero no se usan en código nuevo.
- `auto_trim`, `image_margin`, `image_scale`, `image_offset_x/y`, `image_mode` son valores por defecto a nivel producto, pero desde la migración 022 la fuente de verdad por imagen está en `product_images`.

### 2.5 `product_sizes` (migración 005)

```sql
CREATE TABLE product_sizes (
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_id     UUID NOT NULL REFERENCES sizes(id) ON DELETE RESTRICT,
  stock       INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  PRIMARY KEY (product_id, size_id)
);
```

### 2.6 `product_images` (migraciones 006, 014, 022)

```sql
CREATE TABLE product_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  path            TEXT,
  alt_text        TEXT,
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  sort_order      INT NOT NULL DEFAULT 0,
  image_mode      TEXT DEFAULT 'cover',
  image_scale     REAL DEFAULT 1.0,
  image_offset_x  REAL DEFAULT 0.0,
  image_offset_y  REAL DEFAULT 0.0,
  image_padding   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure only one primary image per product
CREATE UNIQUE INDEX idx_unique_primary_image
  ON product_images(product_id) WHERE is_primary = true;
```

**Nota:** Las columnas `image_mode`, `image_scale`, etc. se agregaron en la migración 022 para permitir composición por imagen individual (en vez de un único estilo para todo el producto).

### 2.7 `admins` (migración 007)

```sql
CREATE TABLE admins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Nota:** `auth.users` es una tabla interna de Supabase Auth. La relación FK asegura que un admin siempre corresponde a un usuario de Supabase Auth.

### 2.8 `store_settings` (migración 012)

```sql
CREATE TABLE store_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT UNIQUE NOT NULL,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES admins(id)
);
```

**Seed data:**
```sql
INSERT INTO store_settings (key, value) VALUES
  ('store_info', '{"name":"Rincon del Hype","logo":"","whatsapp":"541136660741","instagram":"","tiktok":"","x":"","youtube":""}');
```

### 2.9 `activity_log` (migraciones 011, 017)

```sql
CREATE TABLE activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES admins(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   UUID,
  entity_name TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.10 `analytics_events` (migración 016)

```sql
CREATE TABLE analytics_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type  TEXT NOT NULL,
  session_id  TEXT,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  metadata    JSONB DEFAULT '{}',
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 2.11 `video_drops` (migración 023)

```sql
CREATE TABLE video_drops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  thumbnail_url TEXT,
  video_url     TEXT,
  original_url  TEXT,
  youtube_url   TEXT,
  is_new        BOOLEAN DEFAULT false,
  is_active     BOOLEAN DEFAULT true,
  clicks        INTEGER DEFAULT 0,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER video_drops_updated_at BEFORE UPDATE ON video_drops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 3. Índices (migraciones 008, 010, 013, 015, 016, 017, 019, 023)

### 3.1 Índices en `products`

| Nombre | Columnas | Condición | Propósito |
|--------|----------|-----------|-----------|
| `idx_products_category` | `category_id` | `WHERE is_active = true` | Filtrar por categoría en público |
| `idx_products_brand` | `brand` | — | Búsqueda por marca (legacy) |
| `idx_products_brand_id` | `brand_id` | — | Búsqueda por marca (nuevo) |
| `idx_products_price` | `price` | — | Ordenar por precio |
| `idx_products_slug` | `slug` | — | Búsqueda por slug (único) |
| `idx_products_is_new` | `is_new` | `WHERE is_new = true` | Feature "New Arrivals" |
| `idx_products_is_featured` | `is_featured` | `WHERE is_featured = true` | Productos destacados |
| `idx_products_name_trgm` | `name` | GIN trigram | Búsqueda por texto parcial |
| `idx_products_deleted_at` | `deleted_at` | — | Soft-delete |
| `idx_products_is_active` | `is_active` | `WHERE deleted_at IS NULL` | Filtro activos + no eliminados |
| `idx_products_old_price` | `old_price` | `WHERE old_price IS NOT NULL` | Productos en oferta |
| `idx_products_sort_order` | `sort_order` | — | Orden personalizado |

### 3.2 Índices en `product_sizes`

| Nombre | Columnas | Propósito |
|--------|----------|-----------|
| `idx_product_sizes_pid` | `product_id` | JOIN con products |
| `idx_product_sizes_sid` | `size_id` | JOIN con sizes |
| `idx_product_sizes_stock` | `stock` | Filtrar por stock disponible |

### 3.3 Índices en `product_images`

| Nombre | Columnas | Propósito |
|--------|----------|-----------|
| `idx_product_images_pid` | `product_id` | JOIN con products |
| `idx_unique_primary_image` | `product_id` | UNIQUE WHERE is_primary=true |

### 3.4 Índices en otras tablas

| Tabla | Nombre | Columnas | Propósito |
|-------|--------|----------|-----------|
| `categories` | `idx_categories_slug` | `slug` | Búsqueda por slug |
| `admins` | `idx_admins_user_id` | `user_id` | JOIN con auth.users |
| `activity_log` | `idx_activity_log_created` | `created_at DESC` | Orden cronológico |
| `activity_log` | `idx_activity_log_action` | `action, created_at DESC` | Filtrar por acción |
| `activity_log` | `idx_activity_log_entity_action` | `entity, action` | Filtrar por entidad |
| `analytics_events` | `idx_ae_type_created` | `event_type, created_at DESC` | Reports por tipo |
| `analytics_events` | `idx_ae_product` | `product_id` | Events por producto |
| `analytics_events` | `idx_ae_session` | `session_id` | Events por sesión |
| `analytics_events` | `idx_ae_created` | `created_at DESC` | Orden cronológico |
| `video_drops` | `idx_video_drops_sort_order` | `sort_order` | Orden personalizado |
| `video_drops` | `idx_video_drops_active` | `is_active` | WHERE activos |

---

## 4. Row Level Security (RLS) — migración 009

### 4.1 Políticas por tabla

| Tabla | Operación | Rol | Política |
|-------|-----------|-----|----------|
| `products` | SELECT | Público | Solo `is_active = true` |
| `products` | ALL | Admin auth | `auth.role() = 'authenticated'` AND en `admins` |
| `categories` | SELECT | Público | Todos |
| `categories` | ALL | Admin auth | Misma regla |
| `sizes` | SELECT | Público | Todos |
| `sizes` | ALL | Admin auth | Misma regla |
| `product_sizes` | SELECT | Público | Solo productos activos |
| `product_sizes` | ALL | Admin auth | Misma regla |
| `product_images` | SELECT | Público | Solo productos activos |
| `product_images` | ALL | Admin auth | Misma regla |
| `admins` | SELECT | Admin auth | Todos los admins (autenticados) |
| `admins` | ALL | Superadmin | Solo `role = 'superadmin'` |
| `video_drops` | SELECT | Público | Solo `is_active = true` |
| `video_drops` | ALL | Admin auth | Misma regla |

### 4.2 Nota importante sobre RLS en la reconstrucción

El Worker de Hono usa `SUPABASE_SERVICE_ROLE_KEY` (service_role) que **bypassea** todas las políticas RLS. Esto es correcto porque:

1. El Worker es el único que accede a Supabase desde el backend
2. La autenticación se maneja en el middleware de Hono (JWT), no en RLS
3. RLS queda como capa de defensa adicional por si alguien accede directamente a Supabase

---

## 5. Storage Buckets

### 5.1 Buckets existentes

| Bucket | Propósito | Visibilidad | RLS |
|--------|-----------|-------------|-----|
| `product-images` | Imágenes de productos | Público | SELECT público, INSERT/UPDATE/DELETE solo admins |
| `video-drops` | Thumbnails y videos de HypeGallery | Público | SELECT público, INSERT/UPDATE/DELETE solo admins |

### 5.2 Convención de paths

```
product-images/{product_id}/{image_id}.{ext}
video-drops/{video_drop_id}/thumbnail.webp
video-drops/{video_drop_id}/preview.mp4
```

---

## 6. Convenciones de Base de Datos

### 6.1 Naming

- **Tablas**: snake_case, plural (`products`, `product_images`, `store_settings`)
- **Columnas**: snake_case (`is_active`, `sort_order`, `image_offset_x`)
- **PK**: Siempre `UUID` con `DEFAULT gen_random_uuid()` llamado `id`
- **FK**: `{tabla_referenciada}_id` (`product_id`, `category_id`, `brand_id`)
- **Timestamps**: `created_at`, `updated_at` (solo en tablas que se modifican)

### 6.2 Convenciones de datos

- **Soft-delete**: Solo `products` usa `deleted_at` (TIMESTAMPTZ, NULL = activo)
- **Orden**: Columnas `sort_order INT NOT NULL DEFAULT 0`
- **Precios**: `NUMERIC(10,2)` con CHECK de no negatividad
- **JSON**: Campos de configuración como `JSONB` en `store_settings` y `details`
- **UUID**: Preferir UUID sobre SERIAL para PK (seguridad, sharding futuro)

### 6.3 Lo que NO se toca

El schema de base de datos actual es correcto y no necesita cambios. Las 23 migraciones se aplican tal cual en el nuevo proyecto.

**Únicas intervenciones necesarias:**
1. Actualizar la URL de Supabase Storage en la migración 023 (tiene hardcodeada una URL vieja)
2. Agregar el seeding inicial de `store_settings` si se crea una DB desde cero

---

## 7. Funciones y Triggers

### 7.1 `update_updated_at_column()`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Se aplica en: `categories`, `products`, `video_drops`.

### 7.2 Extensiones

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Trigram search (gin_trgm_ops)
```

---

## 8. Migraciones por aplicar desde cero

Orden exacto de aplicación:

```
001_extensions.sql
002_categories.sql
003_sizes.sql
004_products.sql
005_product_sizes.sql
006_out_of_stock_message.sql  (antes de product_images por orden cronológico)
006_product_images.sql
007_admins.sql
008_indexes.sql
009_rls.sql
010_add_is_featured.sql
011_activity_log.sql
012_store_settings.sql
013_add_deleted_at.sql
014_add_product_path.sql
015_add_indexes.sql
016_analytics_events.sql
017_activity_log_indexes.sql
018_brands.sql
019_add_product_sort_order.sql
020_auto_trim.sql
021_image_composition.sql
022_image_composition_per_image.sql
023_video_drops.sql
```

> **Importante:** La migración 023 tiene hardcodeada la URL `https://cyfkggbxvxbxpqijgtlm.supabase.co/...`. Al desplegar en una instancia nueva de Supabase, hay que actualizar esas URLs antes de aplicar la migración, o simplemente eliminarlas y que cada video_drop las tenga NULL hasta que se suban los archivos.
