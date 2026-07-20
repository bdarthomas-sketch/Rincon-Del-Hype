import { useState, useMemo, useEffect, useRef } from "react";

import { CatalogFilters } from "@/components/site/CatalogFilters";
import { cn, formatPrice, getResponsiveSrcSet, getResponsiveSizes } from "@/lib/utils";
import { getProductImageUrl } from "@/data/product-images";
import { getImageCompositionStyle } from "@/lib/image-composition";
import { trackEvent } from "@/lib/analytics";
import { useSettingsStore } from "@/lib/store/settings-store";
import type { Category, Product } from "@/data/types";

interface CatalogoProps {
  products: Product[];
  categories: Category[];
  brands: string[];
  sizes: string[];
  searchQuery: string;
}

function Catalogo({ products, categories, brands, sizes, searchQuery }: CatalogoProps) {
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"relevance" | "price-asc" | "price-desc" | "name-asc">("relevance");
  const [outOfStockLabel, setOutOfStockLabel] = useState("¡Sin stock!");
  const searchTracked = useRef(false);

  useEffect(() => {
    useSettingsStore.getState().load();
    const s = useSettingsStore.getState().settings;
    if (s.out_of_stock_label?.text) setOutOfStockLabel(s.out_of_stock_label.text);
  }, []);

  useEffect(() => {
    if (searchTracked.current) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q && q.trim()) {
      searchTracked.current = true;
      trackEvent({
        event_type: "search",
        metadata: { query: q.trim(), source: "catalog_page" },
      });
    }
  }, []);

  const normalizedQuery = searchQuery.toLowerCase().trim();

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(p.category as Category))
        return false;

      if (selectedBrands.length > 0) {
        const productBrands = [p.brand, ...(p.brands ?? [])];
        if (!selectedBrands.some((b) => productBrands.includes(b))) return false;
      }

      if (selectedSizes.length > 0) {
        const productSizes = p.sizes ?? [];
        if (!selectedSizes.some((s) => productSizes.some((sz) => sz.label === s))) return false;
      }

      if (normalizedQuery) {
        const name = p.name.toLowerCase();
        const brand = p.brand.toLowerCase();
        const brands = (p.brands ?? []).map((b) => b.toLowerCase());
        if (
          !name.includes(normalizedQuery) &&
          !brand.includes(normalizedQuery) &&
          !brands.some((b) => b.includes(normalizedQuery))
        )
          return false;
      }

      return true;
    });
  }, [effectiveProducts, selectedCategories, selectedBrands, selectedSizes, normalizedQuery]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortBy) {
      case "price-asc":
        return list.sort((a, b) => a.price - b.price);
      case "price-desc":
        return list.sort((a, b) => b.price - a.price);
      case "name-asc":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return list;
    }
  }, [filtered, sortBy]);

  function toggleCategory(cat: Category) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  function toggleBrand(brand: string) {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand],
    );
  }

  function toggleSize(size: string) {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  }

  function clearFilters() {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedSizes([]);
  }

  return (
    <div>
        <section className="relative pt-32 pb-16 md:pb-20 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              maskImage: "radial-gradient(ellipse 75% 60% at center, transparent 35%, black 60%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 75% 60% at center, transparent 35%, black 60%)",
            }}
          >
            <div className="absolute -top-32 -left-20 size-[380px] rounded-full bg-hype/20 blur-[140px] animate-drift" />
            <div className="absolute top-20 -right-24 size-[420px] rounded-full bg-hype/18 blur-[160px] animate-pulse-glow delay-neg-2" />
            <div className="absolute top-1/3 -left-32 size-[350px] rounded-full bg-hype/15 blur-[150px] animate-pulse-glow" />
            <div className="absolute top-2/3 -right-20 size-[400px] rounded-full bg-hype/15 blur-[170px] animate-drift delay-neg-4" />
            <div className="absolute bottom-0 -left-16 size-[320px] rounded-full bg-hype/18 blur-[130px] animate-pulse-glow delay-neg-2" />
            <div className="absolute bottom-[-40px] -right-24 size-[380px] rounded-full bg-hype/15 blur-[150px] animate-drift" />
          </div>
          <div className="container-x relative z-10">
            <div className="flex items-end justify-between mb-10 gap-8">
              <div>
                <h1 className="font-1 font-bold uppercase text-xl sm:text-2xl lg:text-4xl leading-[1.2] tracking-tight text-white whitespace-nowrap text-balance overflow-wrap-break-word">
                  {searchQuery ? `Resultados para "${searchQuery}"` : "Todos los productos"}
                </h1>
                <p className="mt-2 font-1 uppercase tracking-[0.2em] text-[11px] text-white/45">
                  {sorted.length} producto{sorted.length !== 1 ? "s" : ""} encontrado
                  {sorted.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <CatalogFilters
              categories={categories}
              brands={brands}
              sizes={sizes}
              selectedCategories={selectedCategories}
              selectedBrands={selectedBrands}
              selectedSizes={selectedSizes}
              onToggleCategory={toggleCategory}
              onToggleBrand={toggleBrand}
              onToggleSize={toggleSize}
              onClearFilters={clearFilters}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />

            {sorted.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-16 xl:gap-20">
                  {sorted.map((p, index) => {
                  const baseDelay = Math.min(index, 5) * 0.1;
                  const catImgStyle = getImageCompositionStyle({
                    scale: p.image_scale ?? 1.0,
                    offsetX: p.image_offset_x ?? 0,
                    offsetY: p.image_offset_y ?? 0,
                    mode: (p.image_mode as 'fit' | 'cover') ?? 'fit',
                    image_padding: (p as any).image_padding ?? 0,
                  });
                  const catIsStatic = catImgStyle.position === 'static';
                  return (
                  <a
                    key={p.id}
                    href={"/producto/" + p.slug}
                    className="group flex flex-col h-full sm:block"
                  >
                    <div
                      className="fade-enter relative aspect-square overflow-hidden flex items-center justify-center rounded-xl"
                      style={{ animationDelay: `${baseDelay}s` }}
                    >
                      {p.sizes && p.sizes.every((sz) => sz.stock === 0) && (
                        <div className="absolute top-2 left-2 z-20 bg-black/70 backdrop-blur-sm text-white font-1 text-[9px] tracking-[0.15em] uppercase px-2 py-1 rounded-full">
                          {p.out_of_stock_message || outOfStockLabel}
                        </div>
                      )}
                      <div className="card-glow-radial absolute inset-0 z-0" />
                      <div className="absolute inset-[30%] rounded-full bg-hype/0 blur-2xl group-hover:bg-hype/45 transition-all duration-700" />
                      <div className="relative z-10 size-full transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]">
                        <img
                          src={getProductImageUrl(p.image)}
                          alt={`${p.name} - ${p.brand}`}
                          width={1024}
                          height={1024}
                          loading="lazy"
                          srcSet={getResponsiveSrcSet(getProductImageUrl(p.image))}
                          sizes={getResponsiveSizes()}
                          className={cn(catIsStatic ? "size-full" : "")}
                          style={catImgStyle as React.CSSProperties}
                          onError={(e) => { (e.target as HTMLImageElement).src = getProductImageUrl(""); }}
                        />
                      </div>
                    </div>
                    <div
                      className="fade-enter flex flex-col flex-1 gap-1 py-3 items-center text-center"
                      style={{ animationDelay: `${baseDelay + 0.1}s` }}
                    >
                      <h3 className="font-1 font-bold uppercase leading-[1.2] tracking-wide text-white text-sm text-balance overflow-wrap-break-word">
                        {p.name}
                      </h3>
                      <p className="font-1 uppercase tracking-[0.2em] text-[9px] text-white/45">
                        {p.brand}
                      </p>
                      <div className="font-1 font-bold text-hype text-[15px] sm:text-base">
                        {formatPrice(p.price)}
                      </div>
                    </div>
                  </a>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="font-1 uppercase tracking-[0.2em] text-sm text-white/30">
                  No hay productos con esos filtros
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 font-1 uppercase text-[11px] tracking-[0.22em] text-hype hover:text-hype-glow transition-colors"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

  );
}

export { Catalogo };

