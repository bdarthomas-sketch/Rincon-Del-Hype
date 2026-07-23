import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  listProducts,
  reorderProducts,
  listCategories,
  type ProductRow,
  type Category,
} from "./api";
import {
  GripVertical,
  X,
  Check,
  Loader2,
  AlertCircle,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn, formatPrice } from "@/lib/utils";
import { getProductImageUrl } from "@/data/product-images";

type ViewMode = "desktop" | "tablet" | "mobile";

interface ProductOrderProps {
  open: boolean;
  onClose: () => void;
}

function CardContent({ product }: { product: ProductRow }) {
  // Leer composición desde product.images[0] (nivel imagen, donde guarda el editor)
  // igual que hace el catálogo público en src/lib/api.ts mapToProduct.
  // Fallback a campos de nivel producto si images no tiene datos.
  const primaryImg = product.images?.[0];
  const scale   = primaryImg?.image_scale    ?? product.image_scale    ?? 1;
  const offsetX = primaryImg?.image_offset_x ?? product.image_offset_x ?? 0;
  const offsetY = primaryImg?.image_offset_y ?? product.image_offset_y ?? 0;
  const hasAdjustments = scale !== 1 || offsetX !== 0 || offsetY !== 0;

  const imgStyle: React.CSSProperties = {
    objectFit: 'cover',
    width: '100%',
    height: '100%',
    display: 'block',
    ...(hasAdjustments && {
      transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
      transformOrigin: 'center',
    }),
  };

  return (
    <>
      <div className="flex items-center justify-center py-1 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors">
        <GripVertical size={14} />
      </div>
      <div className="relative aspect-square overflow-hidden flex items-center justify-center bg-black/10">
        <div className="card-glow-radial absolute inset-0 z-0" />
        {product.primary_image ? (
          <div className="relative z-10 size-full transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]">
            <img
              src={product.primary_image}
              alt={product.name}
              style={imgStyle}
              onError={(e) => { (e.target as HTMLImageElement).src = getProductImageUrl(""); }}
            />
          </div>
        ) : (
          <div className="relative z-10 text-center p-4">
            <div className="size-10 mx-auto rounded-full bg-surface-2 flex items-center justify-center ring-1 ring-white/5">
              <span className="font-1 text-base text-muted-foreground/40">?</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-2.5 text-center">
        <h3 className="font-1 font-bold uppercase text-[11px] leading-tight text-foreground truncate">
          {product.name}
        </h3>
        <p className="font-1 uppercase tracking-[0.2em] text-[8px] text-muted-foreground mt-0.5 truncate">
          {product.brand}
        </p>
        <div className="mt-1 font-1 font-bold text-hype text-[12px]">
          {formatPrice(product.price)}
        </div>
      </div>
    </>
  );
}

function SortableCard({ product }: { product: ProductRow }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style: React.CSSProperties = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group cursor-grab active:cursor-grabbing rounded-xl border border-border bg-surface-2 overflow-hidden transition-all duration-200",
        isDragging && "opacity-30 scale-95"
      )}
    >
      <CardContent product={product} />
    </div>
  );
}

export function ProductOrder({ open, onClose }: ProductOrderProps) {
  const { token } = useAuth();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isNewOnly, setIsNewOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [view, setView] = useState<ViewMode>("desktop");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeProduct, setActiveProduct] = useState<ProductRow | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const visibleProducts = (() => {
    let filtered = products;
    if (isNewOnly) filtered = filtered.filter((p) => p.is_new);
    if (categoryFilter) filtered = filtered.filter((p) => p.category_slug === categoryFilter);
    return filtered;
  })();

  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    setError("");
    setSaveStatus("idle");
    setCategoryFilter("");
    setIsNewOnly(false);
    setView("desktop");
    const params: Record<string, string> = { sort: "sort_order" };
    Promise.all([
      listProducts(token, 1, 100, params).then((r) => setProducts(r.data)),
      listCategories(token).then((r) => setCategories(r.data)),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, token]);

  function handleDragStart(event: DragStartEvent) {
    const product = visibleProducts.find((p) => p.id === event.active.id) ?? null;
    setActiveProduct(product);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveProduct(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sourceIndex = visibleProducts.findIndex((p) => p.id === active.id);
    const targetIndex = visibleProducts.findIndex((p) => p.id === over.id);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const list = arrayMove(visibleProducts, sourceIndex, targetIndex);

    const reorderItems = list.map((p, i) => ({
      id: p.id,
      sort_order: (i + 1) * 10,
    }));

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
    setError("");
    reorderProducts(token!, reorderItems)
      .then(() => setSaveStatus("saved"))
      .catch((e: Error) => {
        setError(e.message);
        setSaveStatus("error");
      });
  }

  const cols = view === "mobile" ? "grid-cols-2" : "grid-cols-3";
  const containerWidth =
    view === "mobile" ? "max-w-sm" : view === "tablet" ? "max-w-3xl" : "max-w-5xl";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full mx-4 bg-surface-1 border border-border rounded-2xl max-h-[90vh] flex flex-col shadow-2xl", containerWidth)}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-1 text-sm tracking-[0.15em] uppercase">Reordenar Productos</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-surface-2 p-0.5">
            {(["desktop", "tablet", "mobile"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  view === v ? "bg-hype text-white" : "text-muted-foreground hover:text-foreground"
                )}
                title={v === "desktop" ? "Escritorio" : v === "tablet" ? "Tablet" : "Móvil"}
              >
                {v === "desktop" ? <Monitor size={14} /> : v === "tablet" ? <Tablet size={14} /> : <Smartphone size={14} />}
              </button>
            ))}
          </div>

          <select
            value={isNewOnly ? "new" : "all"}
            onChange={(e) => { setIsNewOnly(e.target.value === "new"); setCategoryFilter(""); }}
            className="rounded-lg bg-surface-2 border border-border px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-hype/60 font-3"
          >
            <option value="all">Catálogo</option>
            <option value="new">Nuevos Ingresos</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg bg-surface-2 border border-border px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-hype/60 font-3"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-2">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1.5 font-3 text-[10px] text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                Guardando…
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1.5 font-3 text-[10px] text-green-500">
                <Check size={12} />
                Guardado
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 font-3 text-[10px] text-destructive">
                <AlertCircle size={12} />
                {error || "Error al guardar"}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6" style={{ overscrollBehavior: "contain" }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="size-6 border-2 border-hype/40 border-t-hype rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center gap-2 py-20 text-destructive">
              <AlertCircle size={14} />
              <span className="font-1 text-[11px]">{error}</span>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground font-1 text-[11px] tracking-[0.2em] uppercase">
              No hay productos
            </div>
          ) : (
            <div className={cn("mx-auto", containerWidth)}>
              <p className="font-1 text-[9px] tracking-[0.2em] uppercase text-muted-foreground/40 text-center mb-4">
                Arrastra los productos para reordenarlos
              </p>
              <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={visibleProducts.map((p) => p.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className={cn("grid gap-3", cols)}>
                      {visibleProducts.map((p) => (
                        <SortableCard key={p.id} product={p} />
                      ))}
                    </div>
                  </SortableContext>

                  <DragOverlay dropAnimation={null}>
                    {activeProduct ? (
                      <div className="rounded-xl border border-hype/60 bg-surface-2 overflow-hidden shadow-2xl cursor-grabbing scale-105 opacity-95">
                        <CardContent product={activeProduct} />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
