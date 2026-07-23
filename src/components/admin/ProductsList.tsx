import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { listProducts, deleteProduct, duplicateProduct, listBrands, type ProductRow, type BrandRow } from "./api";
import { Plus, Search, Pencil, Trash2, Copy, AlertCircle, Package, ChevronDown, SlidersHorizontal, X, ArrowUpDown } from "lucide-react";
import { ProductOrder } from "./ProductOrder";
import { StatusBadge } from "./StatusBadge";

export function ProductsList() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("sort_order");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ brand: "", is_new: "" });
  const [brandsList, setBrandsList] = useState<BrandRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [orderOpen, setOrderOpen] = useState(false);
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false);

  const perPage = 25;

  function load() {
    if (!token) return;
    setLoading(true);
    setError("");
    const params: Record<string, string> = { sort };
    if (filters.brand) params.brand = filters.brand;
    if (filters.is_new) params.is_new = filters.is_new;
    listProducts(token, page, perPage, params)
      .then((res) => {
        setProducts(res.data);
        setTotal(res.meta.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load() }, [token, page, sort, filters]);

  useEffect(() => {
    if (!token) return;
    listBrands(token).then((res) => setBrandsList(res.data)).catch((e) => console.error("Error loading brands:", e));
  }, [token]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"? Se marcará como eliminado (soft delete).`)) return;
    if (!token) return;
    try {
      await deleteProduct(token, id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  async function handleDuplicate(id: string) {
    if (!token) return;
    try {
      await duplicateProduct(token, id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al duplicar");
    }
  }

  const filtered = search
    ? products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
    )
    : products;

  const allBrands = brandsList.map((b) => b.name).sort();

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h1 className="font-1 text-xl sm:text-lg tracking-[0.15em] uppercase">Productos</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOrderOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-surface-2 text-muted-foreground hover:text-foreground font-1 text-[11px] sm:text-[13px] tracking-[0.2em] uppercase px-3 py-1.5 font-bold hover:bg-surface-2/80 transition-all min-h-[44px]"
          >
            <ArrowUpDown size={14} />
            Ordenar
          </button>
          <button
            onClick={() => navigate("/products/new")}
            className="flex items-center gap-1.5 rounded-lg bg-hype text-white font-1 text-[11px] sm:text-[13px] tracking-[0.2em] uppercase px-3 py-1.5 font-bold hover:brightness-110 transition-all min-h-[44px]"
          >
            <Plus size={14} />
            Nuevo
          </button>
        </div>
      </div>

      <div className="sm:hidden border-t border-white/5 pt-3 mb-4">
        <button
          onClick={() => setToolsPanelOpen(!toolsPanelOpen)}
          className={`flex items-center justify-center gap-2 w-full rounded-lg border px-3 py-1.5 font-1 text-[11px] tracking-[0.15em] uppercase transition-colors min-h-[44px] ${
            toolsPanelOpen || search || filters.brand || filters.is_new
              ? "border-hype/40 bg-hype/10 text-hype"
              : "border-white/5 bg-transparent text-muted-foreground/60 hover:text-foreground hover:border-white/8"
          }`}
        >
          <SlidersHorizontal size={14} />
          Buscar / Filtros / Orden
          {(search || filters.brand || filters.is_new) && (
            <span className="size-1.5 rounded-full bg-hype" />
          )}
        </button>
        {toolsPanelOpen && (
          <div className="mt-2 rounded-xl border border-white/8 bg-surface-2 p-3 flex flex-col gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar productos…"
                className="w-full rounded-lg bg-surface-1 border border-white/8 pl-9 pr-3.5 py-2 text-sm text-foreground outline-none focus:border-hype/60 transition-colors font-3 text-[12px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 font-1 text-[12px] tracking-[0.15em] uppercase transition-colors min-h-[44px] ${
                  filtersOpen || filters.brand || filters.is_new
                    ? "border-hype/40 bg-hype/10 text-hype"
                    : "border-white/8 bg-surface-1 text-muted-foreground hover:text-foreground"
                }`}
              >
                <SlidersHorizontal size={13} />
                Filtros
                {(filters.brand || filters.is_new) && (
                  <span className="size-1.5 rounded-full bg-hype" />
                )}
              </button>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg bg-surface-1 border border-white/8 px-3 py-2 text-[12px] text-foreground outline-none focus:border-hype/60 transition-colors font-3 min-h-[44px]"
              >
                <option value="sort_order">Orden catálogo</option>
                <option value="newest">Más nuevos</option>
                <option value="oldest">Más antiguos</option>
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
                <option value="name_asc">A-Z</option>
                <option value="name_desc">Z-A</option>
              </select>
            </div>
          </div>
        )}
      </div>
      <div className="hidden sm:flex sm:items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos…"
            className="w-full rounded-lg bg-surface-2 border border-white/8 pl-9 pr-3.5 py-2 text-sm text-foreground outline-none focus:border-hype/60 transition-colors font-3 text-[12px] sm:text-[13px]"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 font-1 text-[12px] sm:text-[13px] tracking-[0.15em] uppercase transition-colors min-h-[44px] ${filtersOpen || filters.brand || filters.is_new
            ? "border-hype/40 bg-hype/10 text-hype"
            : "border-white/8 bg-surface-2 text-muted-foreground hover:text-foreground"
            }`}
        >
          <SlidersHorizontal size={13} />
          Filtros
          {(filters.brand || filters.is_new) && (
            <span className="size-1.5 rounded-full bg-hype" />
          )}
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-lg bg-surface-2 border border-white/8 px-3 py-2 text-[12px] sm:text-[13px] text-foreground outline-none focus:border-hype/60 transition-colors font-3 min-h-[44px]"
        >
          <option value="sort_order">Orden catálogo</option>
          <option value="newest">Más nuevos</option>
          <option value="oldest">Más antiguos</option>
          <option value="price_asc">Menor precio</option>
          <option value="price_desc">Mayor precio</option>
          <option value="name_asc">A-Z</option>
          <option value="name_desc">Z-A</option>
        </select>
      </div>

      {filtersOpen && (
        <div className="rounded-xl border border-white/8 bg-surface-2 p-3 mb-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="font-3 text-[11px] sm:text-[12px] tracking-[0.15em] uppercase text-muted-foreground block mb-1">Marca</label>
            <select
              value={filters.brand}
              onChange={(e) => { setFilters((f) => ({ ...f, brand: e.target.value })); setPage(1); }}
              className="rounded-lg bg-surface-1 border border-white/8 px-2.5 py-1.5 text-[12px] sm:text-[13px] text-foreground outline-none focus:border-hype/60 transition-colors font-3 min-h-[44px]"
            >
              <option value="">Todas</option>
              {allBrands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="font-3 text-[11px] sm:text-[12px] tracking-[0.15em] uppercase text-muted-foreground block mb-1">Nuevo</label>
            <select
              value={filters.is_new}
              onChange={(e) => { setFilters((f) => ({ ...f, is_new: e.target.value })); setPage(1); }}
              className="rounded-lg bg-surface-1 border border-white/8 px-2.5 py-1.5 text-[12px] sm:text-[13px] text-foreground outline-none focus:border-hype/60 transition-colors font-3 min-h-[44px]"
            >
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
          <button
            onClick={() => { setFilters({ brand: "", is_new: "" }); setPage(1); }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground font-3 text-[11px] sm:text-[12px] tracking-[0.15em] uppercase transition-colors min-h-[44px]"
          >
            <X size={12} />
            Limpiar
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 mb-4">
          <AlertCircle size={14} className="text-destructive shrink-0" />
          <span className="font-1 text-[11px] text-destructive">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-6 border-2 border-hype/40 border-t-hype rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Package size={40} className="mb-3 opacity-30" />
          <p className="font-1 text-[11px] tracking-[0.2em] uppercase">No hay productos</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-card border border-white/8 rounded-xl px-2 sm:px-[13px] py-2 sm:py-[13px]">
          <table className="w-full sm:min-w-[480px] text-left">
            <thead>
              <tr className="font-1 text-[10px] sm:text-[11px] tracking-widest uppercase text-muted-foreground">
                <th className="px-0.5 sm:px-[10px] py-1 font-medium text whitespace-nowrap">Nombre</th>
                <th className="px-0.5 sm:px-[10px] py-1 font-medium hidden sm:table-cell text-left whitespace-nowrap">Marca</th>
                <th className="pl-0 pr-0.5 sm:pl-[6px] sm:pr-[10px] py-1 font-medium text-left indent-[-5px] sm:indent-0 whitespace-nowrap">Precio</th>
                <th className="px-0.5 sm:px-[10px] py-1 font-medium hidden md:table-cell text-left whitespace-nowrap">Categoría</th>
                <th className="px-0.5 sm:px-[10px] py-1 font-medium text-center whitespace-nowrap">Estado</th>
                <th className="px-0.5 sm:px-[10px] py-1 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.03] transition-colors font-1 text-[12px] sm:text-[13px] group">
                  <td className="px-0.5 sm:px-[10px] py-[8px]">
                    <div className="flex items-center gap-1.5">
                      <div className="size-7 sm:size-8 rounded-md bg-[#1e1e1e] overflow-hidden shrink-0">
                        {p.primary_image ? (
                          <img src={p.primary_image} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="size-full flex items-center justify-center">
                            <Package size={13} className="text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <span className="font-3 text-[11.5px] text-foreground truncate max-w-[78px] sm:max-w-[210px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-0.5 sm:px-[10px] py-[8px] text-muted-foreground hidden sm:table-cell">{p.brand}</td>
                  <td className="px-0.5 sm:px-[10px] py-[8px]">
                    <span className="text-hype font-bold">${Number(p.price).toLocaleString()}</span>
                    {p.old_price && Number(p.old_price) > Number(p.price) && (
                      <span className="text-muted-foreground line-through ml-1 text-[11px] sm:text-[12px]">${Number(p.old_price).toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-0.5 sm:px-[10px] py-[8px] text-muted-foreground hidden md:table-cell">{p.category_name || "—"}</td>
                  <td className="px-0.5 sm:px-[10px] py-[8px] text-center">
                    <StatusBadge isActive={p.is_active} deletedAt={p.deleted_at}
                      outOfStock={!p.sizes?.length || p.sizes.every(s => s.stock === 0)} />
                  </td>
                  <td className="px-0.5 sm:px-[10px] py-[8px] text-right">
                    <div className="flex items-center justify-end gap-0 sm:gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => navigate(`/products/${p.id}`)}
                        className="min-w-[28px] min-h-[28px] sm:min-w-[44px] sm:min-h-[44px] inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors shrink-0"
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDuplicate(p.id)}
                        className="min-w-[28px] min-h-[28px] sm:min-w-[44px] sm:min-h-[44px] inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors shrink-0"
                        title="Duplicar"
                        aria-label="Duplicar"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="min-w-[28px] min-h-[28px] sm:min-w-[44px] sm:min-h-[44px] inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        title="Eliminar"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg bg-surface-2 border border-white/8 min-h-[44px] min-w-[44px] px-3 py-1.5 font-1 text-[12px] sm:text-[13px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            Anterior
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`size-8 rounded-lg font-1 text-[12px] sm:text-[13px] transition-colors ${pageNum === page ? "bg-hype text-white" : "bg-surface-2 border border-white/8 text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg bg-surface-2 border border-white/8 min-h-[44px] min-w-[44px] px-3 py-1.5 font-1 text-[12px] sm:text-[13px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            Siguiente
          </button>
        </div>
      )}

      <p className="text-center font-1 text-[11px] sm:text-[12px] text-muted-foreground/50 mt-2">
        {total} producto{(total !== 1 ? "s" : "")} · Pág. {page} de {totalPages || 1}
      </p>

      <ProductOrder open={orderOpen} onClose={() => setOrderOpen(false)} />
    </div>
  );
}
