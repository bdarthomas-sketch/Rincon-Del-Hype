import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/cart/store";

export function CartTrigger() {
  const { totalItems, openDrawer } = useCartStore();

  return (
    <button
      aria-label="Abrir carrito"
      className="touch-target text-white relative"
      onClick={openDrawer}
    >
      <ShoppingBag className="size-5" />
      {totalItems > 0 && (
        <span className="absolute -top-2 -right-2 bg-hype text-white text-[9px] font-bold font-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full leading-none tracking-normal">
          {totalItems > 9 ? "9+" : totalItems}
        </span>
      )}
    </button>
  );
}
