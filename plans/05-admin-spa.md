# 05 — Admin SPA (React + react-router-dom + Zustand)

> **Archivo:** `plans/05-admin-spa.md`
> **Propósito:** Documentar la implementación del panel administrativo como SPA de React, incluyendo autenticación, routing interno, state management con Zustand, componentes y API helpers.
> **Dependencias:** `03-api-worker.md`, `04-frontend-publico.md`

---

## 1. Arquitectura del Admin

```
AdminApp.tsx (entry point)
├── AuthGate (login/check)
│   ├── LoginPage.tsx
│   └── Dashboard.tsx (layout interno)
│       ├── StatsGrid.tsx
│       ├── ProductsList.tsx
│       ├── ProductForm.tsx
│       ├── ProductOrder.tsx (dnd-kit)
│       ├── ProductPreview.tsx
│       ├── ImageCompositionEditor.tsx
│       ├── DragDropUpload.tsx
│       ├── CategoriesManager.tsx
│       ├── SizesManager.tsx
│       ├── BrandsManager.tsx
│       ├── VideoDropsManager.tsx
│       ├── ActivityModal.tsx
│       ├── Settings.tsx
│       ├── Rendimiento.tsx
│       ├── Atributos.tsx
│       └── StatusBadge.tsx
```

### 1.1 Entry point

```typescript
// AdminApp.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../lib/store/auth-store';
import Layout from './Layout';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';
import ProductsList from './ProductsList';
import ProductForm from './ProductForm';
import ProductOrder from './ProductOrder';
import CategoriesManager from './CategoriesManager';
import SizesManager from './SizesManager';
import BrandsManager from './BrandsManager';
import VideoDropsManager from './VideoDropsManager';
import Settings from './Settings';
import Rendimiento from './Rendimiento';
import Atributos from './Atributos';
import ActivityModal from './ActivityModal';
import Analytics from './Analytics';

export default function AdminApp() {
  const { user, loading, checkSession } = useAuthStore();

  useEffect(() => { checkSession(); }, []);

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-white">Cargando...</div>;

  if (!user) return <LoginPage />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<ProductsList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductForm />} />
          <Route path="product-order" element={<ProductOrder />} />
          <Route path="categories" element={<CategoriesManager />} />
          <Route path="sizes" element={<SizesManager />} />
          <Route path="brands" element={<BrandsManager />} />
          <Route path="videos" element={<VideoDropsManager />} />
          <Route path="settings" element={<Settings />} />
          <Route path="rendimiento" element={<Rendimiento />} />
          <Route path="atributos" element={<Atributos />} />
          <Route path="activity" element={<ActivityModal />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 2. Auth Store (Zustand)

```typescript
// lib/store/auth-store.ts
import { create } from 'zustand';
import { adminApi } from '../api';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
}

interface AuthStore {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkSession: () => Promise<void>;
  scheduleRefresh: () => void;
}

const TOKEN_KEY = 'rdh_admin_token';
const REFRESH_KEY = 'rdh_admin_refresh';

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_KEY),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { access_token, refresh_token, user } = await adminApi.login(email, password);
      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(REFRESH_KEY, refresh_token);
      set({ user, token: access_token, refreshToken: refresh_token, loading: false });
      get().scheduleRefresh();
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    set({ user: null, token: null, refreshToken: null });
  },

  checkSession: async () => {
    const token = get().token;
    if (!token) { set({ loading: false }); return; }
    try {
      const user = await adminApi.checkSession(token);
      set({ user, loading: false });
      get().scheduleRefresh();
    } catch {
      // Token expired, try refresh
      const rt = get().refreshToken;
      if (rt) {
        try {
          const { access_token, refresh_token, user } = await adminApi.refresh(rt);
          localStorage.setItem(TOKEN_KEY, access_token);
          localStorage.setItem(REFRESH_KEY, refresh_token);
          set({ user, token: access_token, refreshToken: refresh_token, loading: false });
          get().scheduleRefresh();
        } catch {
          get().logout();
          set({ loading: false });
        }
      } else {
        get().logout();
        set({ loading: false });
      }
    }
  },

  scheduleRefresh: () => {
    // Refresh at 80% of token expiry (implementar con setTimeout)
  },
}));
```

### 2.1 ¿Por qué Zustand y no React Context?

1. **Acceso fuera de React**: El helper `adminApi` necesita leer el token para setear el header `Authorization`. Con Context, tendrías que pasar el token a través de la cadena de componentes. Con Zustand, `useAuthStore.getState().token` funciona desde cualquier lugar.

2. **Sin Providers**: Con Context, `AdminApp` envuelve todo en `<AuthProvider>`. Con Zustand, no hay wrapper. El store es global.

3. **Bundle size**: Zustand pesa ~1KB. Context es built-in pero requiere boilerplate.

---

## 3. Admin API Helper

```typescript
// components/admin/api.ts
import { useAuthStore } from '../../lib/store/auth-store';

const API_BASE = import.meta.env.PUBLIC_API_BASE;

async function request(path: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      useAuthStore.getState().logout();
      throw new Error('Session expired');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth
export const adminApi = {
  login: (email: string, password: string) =>
    request('/api/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  refresh: (refreshToken: string) =>
    request('/api/admin/refresh', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) }),
  checkSession: (token: string) =>
    request('/api/admin/check', { headers: { Authorization: `Bearer ${token}` } }),
  logout: () => request('/api/admin/logout', { method: 'POST' }),

  // Products
  getProducts: (params?: string) => request(`/api/admin/products?${params || ''}`),
  getProduct: (id: string) => request(`/api/admin/products/${id}`),
  createProduct: (data: any) => request('/api/admin/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => request(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request(`/api/admin/products/${id}`, { method: 'DELETE' }),
  // ... resto de endpoints
};
```

### 3.1 API_BASE en un solo lugar

```typescript
// lib/config.ts
export const API_BASE = import.meta.env.PUBLIC_API_BASE;
export const WHATSAPP_PHONE = '541136660741';
```

`admin/api.ts` importa `API_BASE` desde aquí. No más strings hardcodeados en 6 archivos.

---

## 4. Flujo de Login

```
1. Admin ingresa email + password
2. LoginPage llama useAuthStore.login(email, password)
3. authStore.login() llama adminApi.login(email, password)
4. Hono Worker:
   a. Valida body con Zod
   b. Llama a Supabase Auth: POST /auth/v1/token?grant_type=password
   c. Obtiene access_token + refresh_token
   d. Busca admin en tabla admins por user.id
   e. Devuelve { access_token, refresh_token, user: { id, email, role } }
5. authStore:
   a. Guarda tokens en localStorage
   b. Setea user en el store
   c. Programa refresh automático
6. AdminApp detecta user != null → renderiza Layout + Dashboard
```

---

## 5. Componentes Admin (manteniendo funcionalidad existente)

### 5.1 Dashboard

```
├── StatsGrid
│   ├── Total products
│   ├── Active products
│   ├── Total views (analytics)
│   └── Last update
├── ActivityFeed (últimas actividades)
└── Quick actions (crear producto, etc.)
```

### 5.2 ProductsList

- Tabla con productos (nombre, precio, stock, categoría, activo)
- Filtros por categoría, marca, estado (activo/inactivo)
- Búsqueda por nombre
- Acciones: editar, duplicar, eliminar (soft-delete), toggle activo
- Paginación

### 5.3 ProductForm

- Campos: nombre, slug (auto desde nombre), marca, brand_id, precio, old_price, categoría, descripción
- Toggles: is_new, is_featured, is_active
- Sizes: selector multicheck con stock
- Images: DragDropUpload + reordenar (dnd-kit)
- ImageCompositionEditor (por imagen)
- ProductPreview (sidebar preview)

### 5.4 DragDropUpload

- Arrastrar imágenes
- Upload a Supabase Storage via Worker
- Una vez subidas, se muestran en el ImageCompositionEditor
- Reordenar imágenes con dnd-kit
- Setear imagen primaria

### 5.5 ImageCompositionEditor

- Por imagen individual (desde migración 022)
- Ajustes: image_mode (cover/fit), image_scale, offset x/y, padding
- Preview en vivo de la composición

### 5.6 ProductOrder

- Reordenar productos con drag & drop (dnd-kit)
- Al soltar, llama POST /api/admin/products/reorder

### 5.7 CategoriesManager, SizesManager, BrandsManager

- CRUD básico en tabla
- BrandsManager incluye merge de marcas
- Todos con orden personalizable

### 5.8 VideoDropsManager

- CRUD de videos para HypeGallery
- Preview de thumbnail
- Toggle is_active

### 5.9 Settings

- Edición de store_settings (store_info: nombre, logo, WhatsApp, redes)
- Guardado → purge de cache de settings

### 5.10 Rendimiento

- Tabla de rendimiento (integración con datos del worker)

### 5.11 Atributos

- Gestión de atributos de producto

### 5.12 ActivityModal

- Modal con activity_log paginado
- Filtros por acción y entidad

---

## 6. Carrito (Zustand + localStorage)

```typescript
// lib/store/cart-store.ts
import { create } from 'zustand';

interface CartItem {
  productId: string;
  productName: string;
  productSlug: string;
  sizeId: string;
  sizeLabel: string;
  price: number;
  image?: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string, sizeId: string) => void;
  updateQuantity: (productId: string, sizeId: string, quantity: number) => void;
  clearCart: () => void;
  toggleOpen: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: JSON.parse(localStorage.getItem('rdh_cart') || '[]'),
  isOpen: false,

  addItem: (item) => {
    const items = get().items;
    const existing = items.find(i => i.productId === item.productId && i.sizeId === item.sizeId);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({ ...item, quantity: 1 });
    }
    localStorage.setItem('rdh_cart', JSON.stringify(items));
    set({ items: [...items], isOpen: true });
  },

  // ... resto de métodos
  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));
```

### 6.1 CartDrawer

Slide-in panel desde la derecha con items del carrito.
Botón "Enviar por WhatsApp" → genera mensaje con todos los items + total.
Rastreado con analytics (`trackEvent('whatsapp_cart', ...)`).

---

## 7. Analytics Tracking (público)

### 7.1 PageViewTracker

```typescript
export function PageViewTracker() {
  useEffect(() => {
    trackEvent('page_view', {
      path: window.location.pathname,
      referrer: document.referrer,
    });
  }, []);

  return null;
}
```

### 7.2 Event tracking function

```typescript
// lib/analytics.ts
export function trackEvent(eventType: string, metadata?: Record<string, unknown>) {
  const payload = {
    event_type: eventType,
    session_id: getSessionId(),
    metadata: metadata || {},
  };

  // Fire and forget (no await)
  fetch(`${API_BASE}/api/analytics/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
```

### 7.3 Eventos trackeados

| Evento | Disparador | Metadata |
|--------|-----------|----------|
| `page_view` | Cada página (PageViewTracker) | path, referrer |
| `whatsapp_click` | Click en WhatsAppIcon | — |
| `whatsapp_cart` | Click enviar carrito | items, total |
| `product_click` | Click en ProductCard | product_id, product_name |
| `whatsapp_product` | Click WhatsApp en producto | product_id, product_name, size |
