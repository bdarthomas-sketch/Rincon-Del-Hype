# 08 — Convenciones y Estándares

> **Archivo:** `plans/08-convenciones-y-estandares.md`
> **Propósito:** Definir las reglas de código, convenciones de naming, estándares de componentes, reglas de importación y estilo para mantener el proyecto consistente y mantenible.
> **Dependencias:** `01-vision-y-arquitectura.md`

---

## 1. Naming Conventions

### 1.1 Archivos y carpetas

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Componentes React | PascalCase | `ProductCard.tsx`, `SiteHeader.tsx` |
| Hooks | camelCase con prefijo `use` | `useScrollReveal.ts` |
| Stores (Zustand) | kebab-case con sufijo `-store` | `auth-store.ts`, `cart-store.ts` |
| Páginas Astro | kebab-case | `catalogo.astro`, `[slug].astro` |
| Layouts Astro | PascalCase | `Layout.astro` |
| Middlewares Hono | kebab-case | `cors.ts`, `error-handler.ts` |
| Rutas Hono | kebab-case | `products.ts`, `video-drops.ts` |
| Migraciones SQL | numérico + nombre | `001_extensions.sql` |
| Tipos | PascalCase | `ProductWithImages.ts` (o dentro de `types.ts`) |
| Utilidades | camelCase | `formatPrice.ts`, `cn.ts` |

### 1.2 Código

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Variables | camelCase | `productCount`, `storeInfo` |
| Funciones | camelCase | `getProducts()`, `logActivity()` |
| Constantes | UPPER_SNAKE_CASE | `API_BASE`, `TOKEN_KEY` |
| Clases CSS | kebab-case (Tailwind utility) | `flex items-center gap-4` |
| Interfaces/Type aliases | PascalCase | `Product`, `ProductImage` |
| Props de componentes | PascalCase (interface) | `ProductCardProps` |
| Enums | PascalCase | `ImageMode { Cover, Fit }` |
| Tipos de union | PascalCase | `type Role = 'admin' \| 'superadmin'` |

---

## 2. Reglas de Componentes

### 2.1 Tamaño máximo

- **Componentes React < 300 líneas.** Si un componente supera 300 líneas, se divide.

### 2.2 Props tipadas

```typescript
// ✅ Correcto
interface ProductCardProps {
  product: Product;
  onWhatsAppClick?: (productId: string) => void;
}

export function ProductCard({ product, onWhatsAppClick }: ProductCardProps) {
  // ...
}
```

```typescript
// ❌ Incorrecto
export function ProductCard(props: any) {
  // ...
}
```

### 2.3 Componentes de servidor vs cliente (Astro)

| Tipo | Extensión | ¿Renderiza en SSR? | ¿Hidrata en cliente? |
|------|-----------|-------------------|---------------------|
| Componente Astro | `.astro` | Sí | No (sin JS) |
| Componente React | `.tsx` | Sí (SSR) | Sí (si tiene `client:*`) |

### 2.4 Patrón de componentes con datos SSR

```typescript
// ✅ Correcto: recibe datos desde SSR, NO fetchea
interface NewArrivalsProps {
  products: Product[];
}

export function NewArrivals({ products }: NewArrivalsProps) {
  // Usa products, no fetchea
}
```

```typescript
// ❌ Incorrecto: fetchea datos que ya vienen de SSR
export function NewArrivals() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    fetchProducts().then(setProducts); // DOBLE FETCH!
  }, []);
}
```

---

## 3. Reglas de Importación

### 3.1 Orden

```typescript
// 1. Dependencias externas
import { Hono } from 'hono';
import { create } from 'zustand';
import { clsx } from 'clsx';

// 2. Componentes
import { ProductCard } from '../public/ProductCard';
import { CartDrawer } from '../cart/CartDrawer';

// 3. Stores
import { useAuthStore } from '../../lib/store/auth-store';

// 4. Utilidades
import { cn } from '../../lib/utils';
import { trackEvent } from '../../lib/analytics';

// 5. Tipos
import type { Product, Category } from '../../data/types';
```

### 3.2 Path aliases

```typescript
// En vez de:
import { formatPrice } from '../../../../lib/utils';

// Usar:
import { formatPrice } from '@/lib/utils';
```

Configurado en `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 4. TypeScript Estrictos

### 4.1 Configuración

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false,
    "forceConsistentCasingInFileNames": true
  }
}
```

### 4.2 Reglas

- **No `any`.** Usar `unknown` si el tipo es incierto, luego castear con guardias.
- **No `// @ts-ignore`.** Si TypeScript se queja, el problema es real.
- **Tipos en `types.ts`** no en los componentes.
- **Props siempre tipadas** con interface exportable.

---

## 5. Estilos con Tailwind CSS 4

### 5.1 Estrategia

- Tailwind utility-first. Sin CSS modules, sin styled-components.
- Clases Tailwind directamente en JSX.
- `cn()` (clsx + tailwind-merge) para combinaciones condicionales.

### 5.2 Theme customization

```css
/* src/styles/global.css */
@import "tailwindcss";

@theme {
  --color-hype: #000;
  --color-hype-secondary: #111;
  --color-accent: #f59e0b;
  --font-heading: "Font 1", sans-serif;
  --font-body: "Font 2", sans-serif;
  --font-light: "Font 3", sans-serif;
}
```

### 5.3 Utility `cn()`

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 5.4 Animaciones

```css
@theme {
  --animate-fade-in: fade-in 0.5s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 6. Git y Commits

### 6.1 Convención de commits

```
feat: agregar CRUD de marcas
fix: corregir encoding en upload de imágenes
refactor: migrar router a Hono
chore: actualizar dependencias
docs: agregar plan de arquitectura
perf: implementar cache API
style: ajustar espaciado en ProductCard
```

### 6.2 Branch strategy

```
main (producción)
  └── develop (integración)
       ├── feature/api-worker
       ├── feature/frontend-catalogo
       ├── fix/cors-headers
       └── refactor/settings-store
```

### 6.3 Pull Requests

- Máximo 300 líneas por PR
- Description con qué y por qué
- Links a issues si existen

---

## 7. Reglas de Base de Datos

### 7.1 Migraciones

- Una migración por cambio, numerada secuencialmente
- Migraciones irreversibles: se agregan columnas, no se eliminan (a menos que sea explícito)
- Seed data va en migraciones (como `023_video_drops.sql`)

### 7.2 Naming

Ver `02-base-de-datos.md` sección 6.

---

## 8. ESLint y Prettier (opcional, recomendado)

```json
{
  "plugins": ["@typescript-eslint", "react-hooks"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### 8.1 Prettier

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100
}
```

---

## 9. Lo que NO se hace

| Práctica | Motivo |
|----------|--------|
| `any` en TypeScript | Pierde el tipado, la razón de ser de TS |
| Componentes de 500+ líneas | Ilegibles, imposibles de testear |
| Fetch duplicado (SSR + cliente) | El principal bug del proyecto original |
| Código muerto | Si no se usa, se elimina |
| Comentarios que explican qué (en vez de por qué) | El código ya dice qué hace |
| Dependencias nuevas sin evaluar | Cada dependencia es deuda potencial |
| CSS modules o styled-components | Tailwind alcanza, menos complejidad |
