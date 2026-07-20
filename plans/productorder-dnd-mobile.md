# Plan: Arreglar drag & drop en ProductOrder para mobile

## ⚠️ REGLA DE ORO — LEER ANTES DE TOCAR CÓDIGO

**NO se toca NADA de esto:**
- ❌ ProductsList.tsx — ni una línea
- ❌ AdminApp.tsx, Layout.tsx, AuthContext, api.ts — nada
- ❌ CSS del grid, márgenes, padding, colores, tipografía de las cards
- ❌ La función `reorderProducts()` y su firma (no cambia en el backend)
- ❌ Los filtros (`isNewOnly`, `categoryFilter`) y su lógica
- ❌ La vista previa desktop/tablet/mobile — los botones de view mode no se tocan
- ❌ El modal en sí — fondo, backdrop, animaciones, scroll, nada

**Solo se modifica:**
- ✅ `src/components/admin/ProductOrder.tsx`
- ✅ `package.json` (agregar dependencias)
- ✅ Ejecutar `npm install`

**No se crean archivos nuevos.** `SortableCard` vive dentro de `ProductOrder.tsx`.

---

## Diagnóstico (ya verificado)

El componente `ProductOrder.tsx` usa HTML5 Drag and Drop API (`draggable` + `onDragStart`, `onDragOver`, `onDrop`). Esta API **no funciona en dispositivos táctiles** — ningún navegador mobile dispara estos eventos con el dedo. El modal y los filtros funcionan perfecto, solo el arrastre está roto.

---

## Paso 1: Instalar @dnd-kit

```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

Sin flag `--save` ni `--save-dev` — son dependencias de producción, se usan en runtime.

Verificar que `package.json` tenga `"@dnd-kit/core"` y `"@dnd-kit/sortable"` en `dependencies`.

---

## Paso 2: Identificar el código a eliminar en ProductOrder.tsx

### 2.1 — Eliminar ESTADO (líneas 40-41):
```tsx
const [dragIndex, setDragIndex] = useState<number | null>(null);
const [overIndex, setOverIndex] = useState<number | null>(null);
```
@dnd-kit maneja esto internamente. No necesitamos tracking manual de qué se arrastra.

### 2.2 — Eliminar MANEJADORES COMPLETOS (líneas 67-131):
```tsx
function handleDragStart(e: React.DragEvent, index: number) { ... }
function handleDragOver(e: React.DragEvent, index: number) { ... }
function handleDragLeave() { ... }
function handleDrop(e: React.DragEvent, targetIndex: number) { ... }
function handleDragEnd() { ... }
```
Todo este bloque se reemplaza por el `onDragEnd` de @dnd-kit.

### 2.3 — Eliminar ATRIBUTOS DRAG del JSX (líneas 235-240):
```tsx
draggable
onDragStart={(e) => handleDragStart(e, i)}
onDragOver={(e) => handleDragOver(e, i)}
onDragLeave={handleDragLeave}
onDrop={(e) => handleDrop(e, i)}
onDragEnd={handleDragEnd}
```

### 2.4 — Eliminar CSS de "arrastre activo" manual (líneas 242-244):
```tsx
dragIndex === i && "opacity-40 scale-95",
overIndex === i && dragIndex !== i && "ring-2 ring-hype scale-[1.02]"
```
Esto se reemplaza por el `isDragging` de useSortable.

### 2.5 — Eliminar IMPORTS de React.DragEvent:
No se usa más `React.DragEvent`. Se elimina del type hint de los handlers borrados.

**REGLA:** si después de borrar todo esto TypeScript no tira error, bien. Si tira error de algo no usado, borrar eso también. Si tira error de algo FALTANTE, es porque se borró de más — REVISAR antes de agregar código nuevo.

---

## Paso 3: Agregar imports de @dnd-kit

Arriba de todo, con los otros imports:

```tsx
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
```

### Explicación de cada import:
- `DndContext` — envoltura del grid
- `closestCenter` — algoritmo de colisión (fallback, ver paso 6)
- `PointerSensor` — detecta tanto mouse como touch con pointer events
- `useSensor`, `useSensors` — configura los sensores (distancia mínima para activar drag, etc.)
- `DragEndEvent` — type del evento que da @dnd-kit al soltar
- `SortableContext` — le dice a @dnd-kit que estos items son reordenables
- `useSortable` — hook que se llama dentro de cada card
- `rectSortingStrategy` — estrategia que respeta posiciones reales (funciona con CSS Grid)

---

## Paso 4: Crear componente `SortableCard`

DENTRO del mismo archivo `ProductOrder.tsx`, antes del `ProductOrder` function component (o después, da igual mientras esté declarado antes de usarse).

### Lo que recibe:
```tsx
interface SortableCardProps {
  product: ProductRow;
  children: React.ReactNode;
}
```

### Lo que hace:
```tsx
function SortableCard({ product, children }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
    scale: isDragging ? 0.95 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group cursor-grab active:cursor-grabbing rounded-xl border border-border bg-surface-2 overflow-hidden transition-all duration-200"
    >
      {children}
    </div>
  );
}
```

### ⚠️ CRÍTICO — lo que NO debe cambiar:
- El `className` del div debe mantener **exactamente** las mismas clases que hoy tiene el card original (sin `dragIndex === i && "..."` etc.)
- `cursor-grab` y `active:cursor-grabbing` se quedan igual
- Los children son EXACTAMENTE el contenido actual de la card: Gripper + imagen + nombre + marca + precio

---

## Paso 5: Envolver el grid con DndContext + SortableContext

Donde hoy está el `.map()` (línea 232), reemplazar la estructura para que quede:

```tsx
<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={ids} strategy={rectSortingStrategy}>
    <div className={cn("grid gap-3", cols)}>
      {visibleProducts.map((p) => (
        <SortableCard key={p.id} product={p}>
          {/* === CONTENIDO ACTUAL DE LA CARD (sin cambios) === */}
          <div className="flex items-center justify-center py-1 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors">
            <GripVertical size={14} />
          </div>
          <div className="relative aspect-square overflow-hidden ...">
            {/* TODO: imagen, fallback, glow, etc. IGUAL QUE HOY */}
          </div>
          <div className="p-2.5 text-center">
            {/* TODO: nombre, marca, precio IGUAL QUE HOY */}
          </div>
          {/* === FIN DEL CONTENIDO ACTUAL === */}
        </SortableCard>
      ))}
    </div>
  </SortableContext>
</DndContext>
```

### Los `ids` se calculan arriba:
```tsx
const ids = visibleProducts.map((p) => p.id);
```

---

## Paso 6: Implementar `handleDragEnd` (reemplaza a `handleDrop`)

```tsx
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const oldIndex = visibleProducts.findIndex((p) => p.id === active.id);
  const newIndex = visibleProducts.findIndex((p) => p.id === over.id);
  if (oldIndex === -1 || newIndex === -1) return;

  const list = [...visibleProducts];
  const [moved] = list.splice(oldIndex, 1);
  list.splice(newIndex, 0, moved);

  const reorderItems = list.map((p, i) => ({
    id: p.id,
    sort_order: (i + 1) * 10,
  }));

  // Ponytail: mismo merge que el handleDrop actual para filtros activos
  if (categoryFilter || isNewOnly) {
    const filteredIds = new Set(visibleProducts.map((p) => p.id));
    const otherProducts = products.filter((p) => !filteredIds.has(p.id));
    const reorderMap = new Map(reorderItems.map((r) => [r.id, r.sort_order]));
    setProducts(
      [...otherProducts, ...list].sort((a, b) => {
        const aOrder = reorderMap.get(a.id);
        const bOrder = reorderMap.get(b.id);
        if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
        if (aOrder !== undefined) return -1;
        if (bOrder !== undefined) return 1;
        return a.sort_order - b.sort_order;
      })
    );
  } else {
    setProducts(list);
  }

  setSaveStatus("saving");
  reorderProducts(token!, reorderItems)
    .then(() => setSaveStatus("saved"))
    .catch(() => setSaveStatus("error"));
}
```

### ⚠️ CRÍTICO — esta función debe ser IDÉNTICA en lógica a la `handleDrop` actual (líneas 83-126). La única diferencia:
- Recibe `DragEndEvent` en vez de `React.DragEvent + targetIndex`
- Calcula `oldIndex` y `newIndex` en vez de recibir `sourceIndex` y `targetIndex` de los estados manuales
- No necesita limpiar `dragIndex`/`overIndex` porque ya no existen

---

## Paso 7: Configurar PointerSensor

Agregar justo antes del `return` del componente:

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 8px antes de activar el drag — evita falsos positivos al scrollear
    },
  })
);
```

Y pasar `sensors={sensors}` al `<DndContext>`.

---

## Paso 8: Verificar comportamiento visual

### 8.1 — Desktop (mouse):
- Abrir modal Ordenar
- Agarrar una card, arrastrar a otra posición
- La card debe moverse visualmente, las demás deben reacomodarse (animación de @dnd-kit)
- Al soltar, debe aparecer "Guardando…" y luego "Guardado"
- Recargar el modal y verificar que el orden persista

### 8.2 — Mobile (touch):
- Testear en Chrome DevTools modo dispositivo o en un celular real
- Pulsar una card, arrastrar con el dedo
- Exactamente mismo comportamiento que en desktop
- El scroll dentro del modal debe seguir funcionando (para eso está `distance: 8`)

### 8.3 — Con filtros activos:
- Probar arrastre con "Nuevos Ingresos" activado
- Probar arrastre con filtro de categoría
- La lógica de merge debe ser idéntica a la actual (se copió sin cambios)

### 8.4 — Grid visual:
- Las cards deben verse EXACTAMENTE igual que antes
- Mismo tamaño, misma separación, mismo responsive (grid-cols-2 en mobile, grid-cols-3 en desktop)
- El cambio es solo interno (cómo se mueven), no visual

---

## Paso 9: Si algo no funciona — orden de troubleshooting

1. `rectSortingStrategy` no funciona con el grid → cambiar a `verticalListSortingStrategy` y reemplazar `grid-cols-3` por `flex flex-wrap` con `w-1/3` (visualmente igual). Solo si es necesario.
2. Animación rara en mobile (Safari) → revisar que `transition` de `useSortable` se esté pasando correctamente al `style`.
3. Drag se activa al scrollear → aumentar `distance` en el `PointerSensor` (12, 16).
4. No detecta colisión en grid → cambiar `collisionDetection` a `rectIntersection`.

---

## Paso 10: Eliminar código muerto

Después de implementar todo y verificar que funciona, revisar:
- ¿Quedaron imports sin usar? (`GripVertical` se sigue usando, `Loader2`, `Check`, `AlertCircle` también, los íconos de view mode también)
- ¿Quedaron variables o estados sin usar? El `cols` y `containerWidth` se siguen usando para el grid
- Nada de lo que se importa de `react` (useEffect, useState) se fue — todo se sigue usando

Si TypeScript no tira warnings, está limpio.

---

## Resumen de cambios archivo por archivo

| Archivo | Cambio |
|---------|--------|
| `package.json` | + `@dnd-kit/core`, `@dnd-kit/sortable` en dependencies |
| `package-lock.json` | regenerado por npm install (no tocar manualmente) |
| `src/components/admin/ProductOrder.tsx` | Reemplazar drag nativo por @dnd-kit. Eliminar ~65 líneas de drag manual, agregar ~50 líneas de @dnd-kit. Neto: -15 líneas. |

**Total: 3 archivos tocados, 1 edited, 1 added config, 1 regenerado.**

---

## Rollback

Si algo sale mal:
```bash
git checkout -- src/components/admin/ProductOrder.tsx package.json
rm -rf node_modules package-lock.json && npm install
```
Esto revierte todo exactamente al estado anterior. No hay migraciones de DB ni cambios de backend.
