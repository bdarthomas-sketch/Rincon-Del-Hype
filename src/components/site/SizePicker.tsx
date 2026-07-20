import { Plus, Minus } from "lucide-react";
import type { ProductSize } from "@/data/types";

interface SizePickerProps {
  sizes: ProductSize[];
  selectedSize: string;
  onSelectSize: (size: string) => void;
  onAddToCart: () => void;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  isSneakers?: boolean;
}

export function SizePicker({
  sizes,
  selectedSize,
  onSelectSize,
  onAddToCart,
  quantity,
  onQuantityChange,
  isSneakers,
}: SizePickerProps) {
  const selectedStock = sizes.find((s) => s.label === selectedSize)?.stock ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="font-1 uppercase tracking-[0.2em] text-[10px] text-white/50">
          {isSneakers ? "Número" : "Talle(s)"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {sizes.map((size) => (
            <button
              key={size.label}
              onClick={() => onSelectSize(size.label)}
              disabled={size.stock === 0}
              className={`font-1 uppercase text-[10px] tracking-[0.18em] px-3 py-2 min-h-[44px] rounded-full border transition-all duration-300 ${
                size.stock === 0
                  ? "bg-transparent text-white/15 border-white/5 cursor-not-allowed line-through"
                  : selectedSize === size.label
                    ? "bg-hype text-white border-hype cursor-pointer"
                    : "bg-transparent text-white/60 border-white/15 hover:text-white hover:border-white/30 cursor-pointer"
              }`}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>

      {selectedStock === 1 && (
        <p className="font-1 uppercase tracking-[0.2em] text-[10px] text-red-500">¡Última unidad!</p>
      )}

      {selectedStock === 0 && selectedSize && (
        <p className="font-1 uppercase tracking-[0.2em] text-[10px] text-red-500/60">Sin stock</p>
      )}

      <div className="flex items-center gap-3">
        {selectedStock > 0 && (
          <div className="flex items-center border border-white/20 rounded-full overflow-hidden shrink-0">
            <button
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="size-11 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-lock cursor-pointer"
              aria-label="Reducir cantidad"
            >
              <Minus className="size-3" />
            </button>
            <span className="w-6 text-center font-1 text-xs text-white tabular-nums select-none">
              {quantity}
            </span>
            <button
              onClick={() => onQuantityChange(quantity + 1)}
              disabled={quantity >= selectedStock}
              className="size-11 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-lock cursor-pointer"
              aria-label="Aumentar cantidad"
            >
              <Plus className="size-3" />
            </button>
          </div>
        )}

        <button
          onClick={onAddToCart}
          disabled={!selectedSize || selectedStock === 0}
          className="flex-1 min-w-0 inline-flex items-center justify-center gap-2 font-1 uppercase text-[11px] sm:text-[12px] tracking-[0.22em] bg-hype text-white px-4 sm:px-6 py-3 rounded-full hover:hype-glow transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          <Plus className="size-4 shrink-0" />
          <span className="truncate">Agregar al carrito</span>
        </button>
      </div>
    </div>
  );
}
