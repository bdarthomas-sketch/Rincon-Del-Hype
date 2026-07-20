import { useState, useEffect, useRef, useCallback } from "react";

import { Search } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { getProductImageUrl } from "@/data/product-images";
import type { Product } from "@/data/types";
import { fetchAllProducts } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";

const MAX_RESULTS = 8;

function searchProducts(query: string, products: Product[]): Product[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  return products
    .filter((p) => {
      const name = p.name.toLowerCase();
      const brand = p.brand.toLowerCase();
      const brands = (p.brands ?? []).map((b) => b.toLowerCase());
      return name.includes(q) || brand.includes(q) || brands.some((b) => b.includes(q));
    })
    .slice(0, MAX_RESULTS);
}

interface SearchBarProps {
  onNavigate?: () => void;
  className?: string;
  inputClassName?: string;
}

export function SearchBar({ onNavigate, className, inputClassName }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (productsLoaded || productsLoading || !query.trim()) return;
    setProductsLoading(true);
    setSearchError(false);
    fetchAllProducts()
      .then((products) => {
        setAllProducts(products);
        setProductsLoaded(true);
        setProductsLoading(false);
      })
      .catch(() => {
        setSearchError(true);
        setProductsLoading(false);
      });
  }, [query, productsLoaded, productsLoading]);

  const results = searchProducts(query, allProducts);
  const showDropdown = isOpen && query.trim().length > 0;

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [results.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigateToCatalog = useCallback(async () => {
    if (query.trim()) {
      await trackEvent({
        event_type: "search",
        metadata: { query: query.trim() },
      });
      window.location.href = "/catalogo?q=" + encodeURIComponent(query.trim());
      setIsOpen(false);
      onNavigate?.();
    }
  }, [query, onNavigate]);

  const navigateToProduct = useCallback(
    async (slug: string) => {
      if (query.trim()) {
        await trackEvent({
          event_type: "search",
          metadata: { query: query.trim(), selected_slug: slug },
        });
      }
      window.location.href = "/producto/" + slug;
      setQuery("");
      setIsOpen(false);
      onNavigate?.();
    },
    [query, onNavigate],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || results.length === 0) {
      if (e.key === "Enter") {
        navigateToCatalog();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          navigateToProduct(results[highlightedIndex].slug);
        } else {
          navigateToCatalog();
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/40 pointer-events-none" />
      <input
        ref={inputRef}
        aria-label="Buscar productos"
        placeholder="BUSCAR..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (query.trim()) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full rounded-full bg-white/[0.06] border border-white/10 text-white text-[10px] tracking-[0.18em] uppercase pl-10 pr-4 py-2 placeholder:text-white/40 outline-none focus:border-hype/60 focus:bg-white/[0.08] transition",
          inputClassName,
        )}
      />

      {showDropdown && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute z-50 left-0 right-0 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl",
            "top-full mt-2",
          )}
        >
          {productsLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6">
              <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="font-1 uppercase text-[10px] tracking-[0.2em] text-white/40">Buscando…</span>
            </div>
          ) : searchError ? (
            <div className="px-4 py-6 text-center">
              <p className="font-1 uppercase text-[11px] tracking-[0.2em] text-destructive/70">
                Error al cargar productos
              </p>
            </div>
          ) : results.length > 0 ? (
            <ul className="py-2 max-h-80 overflow-y-auto">
              {results.map((product, index) => (
                <li key={product.id}>
                  <button
                    onClick={() => navigateToProduct(product.slug)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      index === highlightedIndex ? "bg-white/10" : "hover:bg-white/5",
                    )}
                  >
                    <div className="size-10 shrink-0 rounded-md overflow-hidden bg-white/5">
                      <img
                        src={getProductImageUrl(product.image)}
                        alt=""
                        className="size-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = getProductImageUrl(""); }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-1 font-bold text-white text-[11px] tracking-[0.15em] truncate">
                        {product.name}
                      </p>
                      <p className="font-1 uppercase text-[9px] tracking-[0.2em] text-white/40 truncate">
                        {product.brand}
                      </p>
                    </div>
                    <span className="font-1 font-bold text-hype text-[11px] shrink-0">
                      {formatPrice(product.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="font-1 uppercase text-[11px] tracking-[0.2em] text-white/30">
                No se encontraron productos
              </p>
            </div>
          )}

          {query.trim() && (
            <button
              onClick={navigateToCatalog}
              className="w-full px-4 py-3 min-h-[44px] border-t border-white/10 font-1 uppercase text-[10px] tracking-[0.2em] text-hype hover:text-hype-glow transition-colors text-center"
            >
              Ver todos los resultados →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
