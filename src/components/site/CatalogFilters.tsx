import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/data/types";

type DropdownId = "category" | "brand" | "size";

const SORT_LABELS: Record<string, string> = {
  relevance: "Relevancia",
  "price-asc": "Precio: menor a mayor",
  "price-desc": "Precio: mayor a menor",
  "name-asc": "Nombre A-Z",
};

interface CatalogFiltersProps {
  categories: Category[];
  brands: string[];
  sizes: string[];
  selectedCategories: Category[];
  selectedBrands: string[];
  selectedSizes: string[];
  onToggleCategory: (cat: Category) => void;
  onToggleBrand: (brand: string) => void;
  onToggleSize: (size: string) => void;
  onClearFilters: () => void;
  sortBy: string;
  onSortChange: (value: "relevance" | "price-asc" | "price-desc" | "name-asc") => void;
}

function FilterDropdown({
  label,
  open,
  count,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  count: number;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative shrink-0">
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 font-1 uppercase text-[11px] tracking-[0.18em] px-3 py-2 sm:px-4 sm:py-2.5 rounded-full border transition-all duration-300 whitespace-nowrap text-[10px] sm:text-[11px]",
          open || count > 0
            ? "bg-hype text-white border-hype"
            : "bg-transparent text-white/60 border-white/15 hover:text-white hover:border-white/30",
              "min-h-[44px]",
        )}
      >
        <span>{label}</span>
        {count > 0 && <span className="text-white/80 text-[10px]">({count})</span>}
        <ChevronDown
          className={cn("size-3 transition-transform duration-300", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 min-w-[200px] bg-surface-1 border border-white/10 rounded-xl shadow-2xl py-2 max-h-[280px] overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

function OptionRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left font-1 uppercase text-[11px] tracking-[0.18em] px-4 py-2.5 transition-colors duration-200 flex items-center gap-3",
        selected ? "text-hype bg-hype/5" : "text-white/70 hover:text-white hover:bg-white/5",
      )}
    >
      <span
        className={cn(
          "size-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
          selected ? "bg-hype border-hype" : "border-white/20",
        )}
      >
        {selected && <span className="text-white text-[10px] leading-none">✓</span>}
      </span>
      {label}
    </button>
  );
}

export function CatalogFilters({
  categories,
  brands,
  sizes,
  selectedCategories,
  selectedBrands,
  selectedSizes,
  onToggleCategory,
  onToggleBrand,
  onToggleSize,
  onClearFilters,
  sortBy,
  onSortChange,
}: CatalogFiltersProps) {
  const [activeDropdown, setActiveDropdown] = useState<DropdownId | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("prenda");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }
    if (activeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown]);

  useEffect(() => {
    if (mobileDrawerOpen) {
      const scrollY = window.scrollY;
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.position = "fixed";
      document.documentElement.style.top = `-${scrollY}px`;
      document.documentElement.style.width = "100%";
    } else {
      const top = parseFloat(document.documentElement.style.top || "0");
      document.documentElement.style.overflow = "";
      document.documentElement.style.position = "";
      document.documentElement.style.top = "";
      document.documentElement.style.width = "";
      if (top) window.scrollTo(0, -top);
    }
    return () => {
      const top = parseFloat(document.documentElement.style.top || "0");
      document.documentElement.style.overflow = "";
      document.documentElement.style.position = "";
      document.documentElement.style.top = "";
      document.documentElement.style.width = "";
      if (top) window.scrollTo(0, -top);
    };
  }, [mobileDrawerOpen]);

  function toggleDropdown(id: DropdownId) {
    setActiveDropdown((prev) => (prev === id ? null : id));
  }

  const activeFilterTags: { label: string; onRemove: () => void }[] = [];

  selectedCategories.forEach((cat) => {
    activeFilterTags.push({ label: cat, onRemove: () => onToggleCategory(cat) });
  });
  selectedBrands.forEach((brand) => {
    activeFilterTags.push({ label: brand, onRemove: () => onToggleBrand(brand) });
  });
  selectedSizes.forEach((size) => {
    activeFilterTags.push({ label: size, onRemove: () => onToggleSize(size) });
  });

  return (
    <>
      <div ref={containerRef} className="relative mb-8">
        {/* Mobile: single filter button */}
        <div className="flex sm:hidden items-center gap-2 pb-4 border-b border-white/10">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className={cn(
              "flex items-center gap-2 font-1 uppercase text-[11px] tracking-[0.18em] px-4 py-2 rounded-full border transition-all duration-300 whitespace-nowrap",
              activeFilterTags.length > 0
                ? "bg-hype text-white border-hype"
                : "bg-transparent text-white/60 border-white/15",
              "min-h-[44px] min-w-[44px]",
            )}
          >
            <span>Filtros</span>
            {activeFilterTags.length > 0 && (
              <span className="text-white/80 text-[10px]">({activeFilterTags.length})</span>
            )}
            <ChevronDown className="size-3" />
          </button>
        </div>

        {/* Desktop: 3 filter dropdowns */}
        <div className="hidden sm:flex items-center gap-2 pb-4 border-b border-white/10 flex-wrap">
          <FilterDropdown
            label="Prenda"
            open={activeDropdown === "category"}
            count={selectedCategories.length}
            onToggle={() => toggleDropdown("category")}
          >
            {categories.map((cat) => (
              <OptionRow
                key={cat}
                label={cat}
                selected={selectedCategories.includes(cat)}
                onClick={() => onToggleCategory(cat)}
              />
            ))}
          </FilterDropdown>

          <FilterDropdown
            label="Marca"
            open={activeDropdown === "brand"}
            count={selectedBrands.length}
            onToggle={() => toggleDropdown("brand")}
          >
            {brands.map((brand) => (
              <OptionRow
                key={brand}
                label={brand}
                selected={selectedBrands.includes(brand)}
                onClick={() => onToggleBrand(brand)}
              />
            ))}
          </FilterDropdown>

          <FilterDropdown
            label="Talle"
            open={activeDropdown === "size"}
            count={selectedSizes.length}
            onToggle={() => toggleDropdown("size")}
          >
            {sizes.map((size) => (
              <OptionRow
                key={size}
                label={size}
                selected={selectedSizes.includes(size)}
                onClick={() => onToggleSize(size)}
              />
            ))}
          </FilterDropdown>
        </div>

        {/* Active filter tags - all screens */}
        {activeFilterTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {activeFilterTags.map((tag) => (
              <span
                key={tag.label}
                className="inline-flex items-center gap-1.5 font-1 uppercase text-[10px] tracking-[0.18em] px-3 py-1.5 rounded-full bg-hype/15 text-hype border border-hype/30"
              >
                {tag.label}
                <button
                  onClick={tag.onRemove}
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] hover:text-white transition-colors"
                  aria-label={`Quitar filtro ${tag.label}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <button
              onClick={onClearFilters}
              className="font-1 uppercase text-[10px] tracking-[0.18em] px-3 py-1.5 text-white/40 hover:text-hype transition-colors"
            >
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Mobile filter drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-black/60 animate-fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="absolute top-0 left-0 bottom-0 w-[85vw] max-w-[320px] bg-surface-1 border-r border-white/10 shadow-2xl overflow-y-auto animate-slideInLeft">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className="font-1 uppercase text-sm tracking-wide text-white">Filtros</span>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] text-white/60 hover:text-white transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="py-7">
              <div className="border-b border-white/10">
                <button
                  onClick={() => setOpenSection(openSection === "prenda" ? null : "prenda")}
                  className="w-full flex items-center justify-between px-4 py-3 font-1 uppercase text-[11px] tracking-[0.18em] text-white/70 hover:text-white transition-colors"
                >
                  <span>Prenda</span>
                  <ChevronDown className={cn("size-3 transition-transform duration-300", openSection === "prenda" && "rotate-180")} />
                </button>
                {openSection === "prenda" && (
                  <div className="pb-1">
                    {categories.map((cat) => (
                      <OptionRow
                        key={cat}
                        label={cat}
                        selected={selectedCategories.includes(cat)}
                        onClick={() => onToggleCategory(cat)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-b border-white/10">
                <button
                  onClick={() => setOpenSection(openSection === "marca" ? null : "marca")}
                  className="w-full flex items-center justify-between px-4 py-3 font-1 uppercase text-[11px] tracking-[0.18em] text-white/70 hover:text-white transition-colors"
                >
                  <span>Marca</span>
                  <ChevronDown className={cn("size-3 transition-transform duration-300", openSection === "marca" && "rotate-180")} />
                </button>
                {openSection === "marca" && (
                  <div className="pb-1">
                    {brands.map((brand) => (
                      <OptionRow
                        key={brand}
                        label={brand}
                        selected={selectedBrands.includes(brand)}
                        onClick={() => onToggleBrand(brand)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-b border-white/10">
                <button
                  onClick={() => setOpenSection(openSection === "talle" ? null : "talle")}
                  className="w-full flex items-center justify-between px-4 py-3 font-1 uppercase text-[11px] tracking-[0.18em] text-white/70 hover:text-white transition-colors"
                >
                  <span>Talle</span>
                  <ChevronDown className={cn("size-3 transition-transform duration-300", openSection === "talle" && "rotate-180")} />
                </button>
                {openSection === "talle" && (
                  <div className="pb-1">
                    {sizes.map((size) => (
                      <OptionRow
                        key={size}
                        label={size}
                        selected={selectedSizes.includes(size)}
                        onClick={() => onToggleSize(size)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-b border-white/10">
                <button
                  onClick={() => setOpenSection(openSection === "orden" ? null : "orden")}
                  className="w-full flex items-center justify-between px-4 py-3 font-1 uppercase text-[11px] tracking-[0.18em] text-white/70 hover:text-white transition-colors"
                >
                  <span>Ordenar por</span>
                  <ChevronDown className={cn("size-3 transition-transform duration-300", openSection === "orden" && "rotate-180")} />
                </button>
                {openSection === "orden" && (
                  <div className="pb-1">
                    {Object.entries(SORT_LABELS).map(([value, label]) => (
                      <OptionRow
                        key={value}
                        label={label}
                        selected={sortBy === value}
                        onClick={() => {
                          onSortChange(value as "relevance" | "price-asc" | "price-desc" | "name-asc");
                          setMobileDrawerOpen(false);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="py-4 px-4">
                <button
                  onClick={() => {
                    onClearFilters();
                    setMobileDrawerOpen(false);
                  }}
                  className="w-full font-1 uppercase text-[11px] tracking-[0.18em] py-3 text-white/30 hover:text-hype transition-colors text-center"
                >
                  Limpiar todo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
