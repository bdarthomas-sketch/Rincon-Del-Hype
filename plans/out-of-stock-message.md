# Plan: Mensaje personalizado sin stock

## Propósito

Agregar un campo opcional `out_of_stock_message` al producto. Cuando un producto está sin stock (todos sus sizes tienen stock === 0):

- Si `out_of_stock_message` está vacío/null → se muestra el label genérico configurable (`outOfStockLabel`, default "¡Sin stock!"). Comportamiento actual, sin cambios.
- Si tiene valor → se muestra **ese texto** en lugar del label genérico, con el mismo estilo, posición y badge.

Campo visible únicamente en el editor de productos del admin. Opcional al crear y al editar.

---

## Regla de oro — NO se toca

- ❌ Store settings (`out_of_stock_label` en DB)
- ❌ Backend CRUD firmas (`listProducts`, `getProduct`, `createProduct`, `updateProduct`)
- ❌ DB migrations existentes (solo nueva migración)
- ❌ `src/components/site/SizePicker.tsx` (hardcodea "Sin stock" per-size, no aplica)
- ❌ `src/components/admin/StatusBadge.tsx` (solo tooltip genérico en tabla, no aplica)
- ❌ `src/components/admin/Settings.tsx` (no tocar settings globales)
- ❌ `src/lib/api.ts` (público, no se modifica)
- ❌ `src/data/product-images.ts`, `src/lib/utils.ts`, `src/lib/image-composition.ts`
- ❌ Cart store, analytics, dashboard

---

## Paso 1: Migración SQL — nuevo archivo

`supabase/migrations/006_out_of_stock_message.sql`:

```sql
ALTER TABLE products ADD COLUMN out_of_stock_message TEXT DEFAULT NULL;
```

Aplicar:
```bash
supabase migration up
```

---

## Paso 2: Backend — types

`worker/src/types.ts` — agregar en `ProductRow`:

```typescript
out_of_stock_message?: string;
```

No se toca `Env`, `ProductImageComposition`, ni ninguna otra interface.

---

## Paso 3: Backend — validación

### `worker/src/lib/validate.ts`

En `CreateProductSchema`, agregar:

```typescript
out_of_stock_message: z.string().max(200).optional(),
```

`UpdateProductSchema` hereda automáticamente por `CreateProductSchema.partial()`.

---

## Paso 4: Backend — route handlers

### `worker/src/routes/products.ts`

En `mapProductRow()` (línea 571), agregar:

```typescript
out_of_stock_message: row.out_of_stock_message || null,
```

En `mapProductDetail()` (línea 619), el campo viaja automáticamente por el `...row` spread. Pero para ser explícitos — verificar que se incluya. Si el spread lo pisa con el valor de `row`, está bien. Si no, agregar igual que en `mapProductRow`.

No se toca `createProduct`, `updateProduct`, `duplicateProduct` — el campo se pasa en el body y se inserta/actualiza directamente porque no tiene lógica especial (no es una foreign key ni requiere transformación).

---

## Paso 5: Frontend — types

### `src/data/types.ts` — en `Product`:

```typescript
out_of_stock_message?: string;
```

### `src/components/admin/api.ts` — en `ProductRow` y `ProductDetail`:

```typescript
out_of_stock_message?: string | null;
```

Ambos tipos, la misma línea.

---

## Paso 6: Frontend — formulario (ProductForm.tsx)

### 6.1 — Estado inicial

Agregar en el `form` state (línea 28):

```typescript
out_of_stock_message: "",
```

### 6.2 — Carga de datos en edición

En el bloque de `getProduct` (línea 54-62), agregar:

```typescript
out_of_stock_message: d.out_of_stock_message || "",
```

### 6.3 — UI: campo de texto

En la sección "Información" (`<Section><SectionTitle>Información</SectionTitle>`), después del `Toggle` de "Nuevo ingreso", agregar:

```tsx
<Field
  label="Mensaje sin stock (opcional)"
  value={form.out_of_stock_message}
  onChange={(v) => handleChange("out_of_stock_message", v)}
  placeholder="Ej: Reposición el viernes"
/>
```

Con un hint debajo opcional:
```tsx
<p className="font-1 text-[10px] text-muted-foreground/40 -mt-2">
  Si está vacío, se muestra "{outOfStockLabel}" por defecto.
</p>
```

### 6.4 — Payload de envío

En `handleSubmit` (línea 115-128), agregar en el payload:

```typescript
out_of_stock_message: form.out_of_stock_message || null,
```

No se manda string vacío — se manda `null` para que la DB tenga `NULL` y no `""`.

---

## Paso 7: Frontend — reemplazar en display

### `src/components/catalogo/CatalogoPage.tsx` (línea 189-192)

De:

```tsx
{p.sizes && p.sizes.every((sz) => sz.stock === 0) && (
  <div className="absolute top-2 left-2 z-20 bg-black/70 backdrop-blur-sm text-white font-1 text-[9px] tracking-[0.15em] uppercase px-2 py-1 rounded-full">
    {outOfStockLabel}
  </div>
)}
```

A:

```tsx
{p.sizes && p.sizes.every((sz) => sz.stock === 0) && (
  <div className="absolute top-2 left-2 z-20 bg-black/70 backdrop-blur-sm text-white font-1 text-[9px] tracking-[0.15em] uppercase px-2 py-1 rounded-full">
    {p.out_of_stock_message || outOfStockLabel}
  </div>
)}
```

### `src/components/producto/ProductoPage.tsx` (línea 255-258)

Cambiar:

```tsx
{outOfStockLabel}
```

A:

```tsx
{product.out_of_stock_message || outOfStockLabel}
```

Misma línea, mismo estilo.

---

## Resumen de cambios archivo por archivo

| Archivo | Tipo de cambio |
|---------|---------------|
| `supabase/migrations/006_out_of_stock_message.sql` | **NUEVO** — 1 línea SQL |
| `worker/src/types.ts` | +1 línea (`out_of_stock_message?: string`) |
| `worker/src/lib/validate.ts` | +1 línea (`out_of_stock_message: z.string().max(200).optional()`) |
| `worker/src/routes/products.ts` | +2 líneas (maps), sin tocar handlers |
| `src/data/types.ts` | +1 línea (`out_of_stock_message?: string`) |
| `src/components/admin/api.ts` | +2 líneas (ProductRow + ProductDetail) |
| `src/components/admin/ProductForm.tsx` | ~+10 líneas (estado, carga, campo UI, payload) |
| `src/components/catalogo/CatalogoPage.tsx` | 1 línea cambiada |
| `src/components/producto/ProductoPage.tsx` | 1 línea cambiada |

**Total: 9 archivos tocados (1 nuevo, 8 modificados) — ~20 líneas netas.**

---

## Rollback

```bash
supabase migration down 006
git checkout -- \
  worker/src/types.ts \
  worker/src/lib/validate.ts \
  worker/src/routes/products.ts \
  src/data/types.ts \
  src/components/admin/api.ts \
  src/components/admin/ProductForm.tsx \
  src/components/catalogo/CatalogoPage.tsx \
  src/components/producto/ProductoPage.tsx
```

Sin migraciones complejas, sin dependencias nuevas, sin refactors.