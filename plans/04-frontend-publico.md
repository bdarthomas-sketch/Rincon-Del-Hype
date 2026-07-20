# 04 — Frontend Público (Astro + React)

> **Archivo:** `plans/04-frontend-publico.md`
> **Propósito:** Documentar la implementación del frontend público con Astro + React, incluyendo páginas, componentes, layouts, data flow SSR, y eliminación del doble fetch.
> **Dependencias:** `01-vision-y-arquitectura.md`, `03-api-worker.md`

---

## 1. Estructura de Páginas

```
frontend/src/pages/
├── index.astro           # Home: Hero + NewArrivals + HypeGallery + About + HowToOrder
├── catalogo.astro        # Catálogo completo con filtros
├── producto/
│   └── [slug].astro      # Página dinámica de producto individual
├── admin/
│   └── index.astro       # Admin SPA (entry point mínimo)
├── 404.astro             # Página 404 personalizada
└── sitemap.xml.ts        # Sitemap dinámico con todos los productos
```

---

## 2. Layout Principal (`layouts/Layout.astro`)

```astro
---
import SiteHeader from '../components/public/SiteHeader';
import SiteFooter from '../components/public/SiteFooter';
import CartDrawer from '../components/cart/CartDrawer';
import CartTrigger from '../components/cart/CartTrigger';
import SmoothScroll from '../components/public/SmoothScroll';
import WhatsAppIcon from '../components/public/WhatsAppIcon';
import UsdModal from '../components/public/UsdModal';
import PageViewTracker from '../components/public/PageViewTracker';
import '../styles/global.css';

export interface Props {
  title?: string;
  description?: string;
  image?: string;
}

// SSR: fetch settings una sola vez
const apiBase = import.meta.env.PUBLIC_API_BASE;
const settingsResponse = await fetch(`${apiBase}/api/settings`);
const settings = await settingsResponse.json();
const storeInfo = settings.store_info || {};
const canonical = Astro.url.toString();
---

<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title ? `${title} | ${storeInfo.name}` : storeInfo.name}</title>
  <meta name="description" content={description || 'Tienda de sneakers y streetwear auténticos'} />
  <link rel="canonical" href={canonical} />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

  <!-- Open Graph -->
  <meta property="og:title" content={title || storeInfo.name} />
  <meta property="og:description" content={description || 'Tienda de sneakers y streetwear auténticos'} />
  <meta property="og:image" content={image || '/social/og-default.jpg'} />
  <meta property="og:url" content={canonical} />

  <!-- Preload fonts -->
  <link rel="preload" href="/fonts/1.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/fonts/2.woff2" as="font" type="font/woff2" crossorigin />

  <!-- Settings inline (evita fetch extra del cliente) -->
  <script>
    window.__RDH_SETTINGS__ = JSON.parse('{JSON.stringify(settings)}');
  </script>
</head>
<body>
  <SiteHeader storeName={storeInfo.name} />
  <main>
    <slot />
  </main>
  <SiteFooter storeInfo={storeInfo} />

  <!-- Componentes globales (client:load) -->
  <CartTrigger client:load />
  <CartDrawer client:load />
  <SmoothScroll client:load />
  <WhatsAppIcon phone={storeInfo.whatsapp} client:load />
  <UsdModal client:load />
  <PageViewTracker client:load />
</body>
</html>
```

### 2.1 Inyección de settings

```html
<script>
  window.__RDH_SETTINGS__ = JSON.parse('{JSON.stringify(settings)}');
</script>
```

Componentes React que necesitan settings (como el WhatsAppIcon o el footer) leen de `window.__RDH_SETTINGS__` en vez de llamar `fetchSettings()`.

### 2.2 Estados que requieren settings

| Componente | Fuente de settings |
|-----------|-------------------|
| `SiteFooter` | Prop `storeInfo` (SSR) |
| `WhatsAppIcon` | `window.__RDH_SETTINGS__` |
| `CartDrawer` | `window.__RDH_SETTINGS__` (teléfono WhatsApp) |

---

## 3. Páginas Públicas

### 3.1 Home (`index.astro`)

```astro
---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/public/Hero';
import NewArrivals from '../components/public/NewArrivals';
import HypeGallery from '../components/public/HypeGallery';
import About from '../components/public/About';
import HowToOrder from '../components/public/HowToOrder';

const apiBase = import.meta.env.PUBLIC_API_BASE;

// SSR: un solo fetch a la API
const productsResponse = await fetch(`${apiBase}/api/products?limit=50`);
const { products } = await productsResponse.json();

const newArrivals = products.filter(p => p.is_new);
const featured = products.filter(p => p.is_featured);
---

<Layout>
  <Hero client:load products={featured} />
  <NewArrivals client:load products={newArrivals} />
  <HypeGallery client:visible />
  <About />
  <HowToOrder />
</Layout>
```

**Data flow SSR:**
1. Layout fetchea settings → `window.__RDH_SETTINGS__`
2. `index.astro` fetchea products → pasa como props a componentes
3. `NewArrivals` recibe `products` por props, NO fetchea
4. `Hero` recibe `featured` por props, NO fetchea
5. `HypeGallery` usa `client:visible` porque necesita fetch de video drops (cambia poco)

### 3.2 Catálogo (`catalogo.astro`)

```astro
---
import Layout from '../layouts/Layout.astro';
import CatalogoPage from '../components/catalogo/CatalogoPage';

const apiBase = import.meta.env.PUBLIC_API_BASE;

// SSR: fetch de productos + categorías
const [productsRes, categoriesRes] = await Promise.all([
  fetch(`${apiBase}/api/products?limit=100`),
  fetch(`${apiBase}/api/categories`),
]);

const { products } = await productsRes.json();
const categories = await categoriesRes.json();

// Derivar brands y sizes de los productos (0 requests extra)
const brands = [...new Set(products.map(p => p.brand))].sort();
const sizes = [...new Set(products.flatMap(p => p.sizes || []).map(s => s.label))].sort();
---

<Layout title="Catálogo">
  <CatalogoPage
    client:load
    initialProducts={products}
    initialCategories={categories}
    brands={brands}
    sizes={sizes}
  />
</Layout>
```

### 3.3 Producto (`producto/[slug].astro`)

```astro
---
import Layout from '../../layouts/Layout.astro';
import ProductoPage from '../../components/producto/ProductoPage';

const apiBase = import.meta.env.PUBLIC_API_BASE;
const { slug } = Astro.params;

const response = await fetch(`${apiBase}/api/products/${slug}`);
if (!response.ok) {
  return Astro.redirect('/404', 404);
}

const { product, sizes } = await response.json();
---

<Layout
  title={product.name}
  description={product.description || `${product.name} en ${storeInfo.name}`}
  image={product.images?.find(i => i.is_primary)?.url}
>
  <!-- JSON-LD para SEO -->
  <script type="application/ld+json" set:html={JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": product.images?.map(i => i.url),
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "ARS",
    }
  })} />
  <ProductoPage client:load initialProduct={product} initialSizes={sizes} />
</Layout>
```

**SEO:**
- Meta tags dinámicos (title, description, og:image) generados en SSR
- JSON-LD para rich snippets en Google
- Se generan por slug, no hay páginas estáticas pre-renderizadas

### 3.4 Admin (`admin/index.astro`)

```astro
---
import Layout from '../../layouts/Layout.astro';
---
<Layout title="Admin">
  <AdminApp client:only="react" />
</Layout>
```

Página mínima. Todo el contenido del admin se renderiza client-side con react-router-dom.

---

## 4. Data Flow: Cómo se elimina el doble fetch

### 4.1 Patrón SSR → Props

```
1. Page .astro se ejecuta en el edge (SSR)
2. Hace fetch a la API
3. Convierte datos a string JSON
4. Pasa como props al componente React
5. Componente React usa las props, NO hace fetch
```

### 4.2 Comparación detallada

| Página | Antes (requests cliente) | Después | Diferencia |
|--------|-------------------------|---------|------------|
| `/` | 3 (products, settings, video-drops) | 1 (video-drops en HypeGallery) | -66% |
| `/catalogo` | 4 (products, categories, brands, sizes) | 0 | -100% |
| `/producto/:slug` | 3 (product, sizes, settings) | 0 | -100% |

### 4.3 `client:load` vs `client:visible`

| Directiva | Cuándo se hidrata | Componentes |
|-----------|-------------------|-------------|
| `client:load` | Inmediatamente al cargar | Hero, NewArrivals, CatalogoPage, ProductoPage, CartTrigger, CartDrawer |
| `client:visible` | Cuando entra en viewport | HypeGallery |
| `client:only` | Solo cliente (sin SSR) | AdminApp |

### 4.4 Settings desde window

Los componentes que necesitan settings en el cliente usan un store de Zustand:

```typescript
// store/settings-store.ts
import { create } from 'zustand';

interface SettingsStore {
  settings: Record<string, any>;
  load: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {},
  load: () => {
    const s = (window as any).__RDH_SETTINGS__;
    if (s) set({ settings: s });
  },
}));
```

Se llama `load()` en el mount del componente. Sin fetch, solo lectura de la variable global.

---

## 5. Componentes Públicos

### 5.1 Componentes con interactividad (client:load o client:visible)

| Componente | Props desde SSR | ¿Fetch propio? | Store |
|-----------|----------------|----------------|-------|
| `Hero` | `products: Product[]` | No | No |
| `NewArrivals` | `products: Product[]` | No | No |
| `HypeGallery` | Nada (client:visible) | Sí, GET /api/video-drops | Sí, video drops |
| `CatalogoPage` | `initialProducts, initialCategories, brands, sizes` | No | Sí, filtros |
| `ProductoPage` | `initialProduct, initialSizes` | No | No |
| `CartDrawer` | Nada | No | cart-store |
| `CartTrigger` | Nada | No | cart-store |
| `WhatsAppIcon` | Nada | No | settings-store |
| `UsdModal` | Nada | No | No |
| `SmoothScroll` | Nada | No | No |
| `PageViewTracker` | Nada | Sí, POST analytics/track | No |

### 5.2 Componentes estáticos (solo HTML, sin JS)

| Componente | Rendering |
|-----------|-----------|
| `SiteHeader` | SSR, HTML puro |
| `SiteFooter` | SSR, HTML puro |
| `About` | SSR, HTML puro |
| `HowToOrder` | SSR, HTML puro |
| `ProductCard` | SSR como parte de NewArrivals/CatalogoPage |

### 5.3 `ProductCard` — componente compartido

```typescript
interface ProductCardProps {
  product: Product;
}
```

Renderizado por SSR dentro de NewArrivals y CatalogoPage. Se usa en sito público y como preview en admin.

---

## 6. Tipos Compartidos (`data/types.ts`)

```typescript
// Único archivo de tipos del frontend

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brands: string[];
  brand_id?: string;
  price: number;
  old_price?: number | null;
  category_id: string;
  description?: string | null;
  is_new: boolean;
  is_featured: boolean;
  is_active: boolean;
  deleted_at?: string | null;
  sort_order: number;
  image_padding?: string | null;
  out_of_stock_message?: string | null;
  image_mode?: string;
  image_scale?: number;
  image_offset_x?: number;
  image_offset_y?: number;
  auto_trim?: boolean;
  image_margin?: number;
  primary_image_url?: string;
  images?: ProductImage[];
  sizes?: ProductSize[];
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  path?: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
  image_mode?: string;
  image_scale?: number;
  image_offset_x?: number;
  image_offset_y?: number;
  image_padding?: number;
}

export interface ProductSize {
  size_id: string;
  label: string;
  stock: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order: number;
}

export interface Size {
  id: string;
  label: string;
  sort_order: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
}

export interface VideoDrop {
  id: string;
  title: string;
  thumbnail_url?: string;
  video_url?: string;
  original_url?: string;
  youtube_url?: string;
  is_new: boolean;
  is_active: boolean;
  clicks: number;
  sort_order: number;
}

export interface StoreSettings {
  [key: string]: any;
}

export interface AnalyticsEvent {
  id: string;
  event_type: string;
  session_id?: string;
  product_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}
```

---

## 7. Caché del Frontend

### 7.1 Headers de respuesta (`public/_headers`)

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/favicon.*
  Cache-Control: public, max-age=86400

/*.html
  Cache-Control: public, max-age=0, s-maxage=5
```

### 7.2 Notas

- Assets con hash (JS, CSS, imágenes compiladas) → inmutable, 1 año
- Páginas HTML → `s-maxage=5` (5 segundos en edge cache de Cloudflare)
- La frescura real viene del Cache API del Worker, no de los headers HTML

---

## 8. Astro Config (`astro.config.mjs`)

```javascript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',              // SSR mode
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

### 8.1 TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
