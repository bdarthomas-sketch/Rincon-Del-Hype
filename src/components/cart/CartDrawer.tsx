import { useEffect, useState } from "react";
import { X, Trash2, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/cart/store";
import type { CartItem } from "@/lib/cart/types";
import { formatPrice, getResponsiveSrcSet } from "@/lib/utils";
import { getProductImageUrl } from "@/data/product-images";
import { cn } from "@/lib/utils";
import { WHATSAPP_PHONE } from "@/config";
import { useSettingsStore } from "@/lib/store/settings-store";
import { trackEvent } from "@/lib/analytics";

function buildWhatsAppMessage(items: CartItem[]): string {
  const lines = items.map((item, i) => {
    const qty = item.quantity > 1 ? ` x${item.quantity}` : "";
    return `${i + 1}. ${item.name} (${item.brand})\n   Talle: ${item.size}${qty} - ${formatPrice(item.price * item.quantity)}`;
  });

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const text = `NUEVO PEDIDO DESDE LA PAGINA WEB 🩸\n\n¡Hola! Quiero hacer este pedido:\n\n-----\n${lines.join("\n")}\n-----\n\nTOTAL: ${formatPrice(totalPrice)}`;

  return encodeURIComponent(text);
}

export default CartDrawer;

export function CartDrawer() {
  const [whatsappPhone, setWhatsappPhone] = useState(WHATSAPP_PHONE);

  useEffect(() => {
    useSettingsStore.getState().load();
    const s = useSettingsStore.getState().settings;
    if (s.store_info?.whatsapp) setWhatsappPhone(s.store_info.whatsapp);
  }, []);

  const { items, totalItems, isDrawerOpen, closeDrawer, removeItem, clearCart } = useCartStore();

  const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${buildWhatsAppMessage(items)}`;

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={closeDrawer} />
      )}

      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-md z-50 bg-black/95 backdrop-blur-xl max-sm:bg-black max-sm:backdrop-blur-0 border-l border-white/10 max-sm:border-l-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col",
          isDrawerOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-6 h-[56px] border-b border-white/10 shrink-0">
          <span className="font-1 font-bold uppercase text-sm tracking-[0.22em] text-white">
            Carrito ({totalItems})
          </span>
          <button
            aria-label="Cerrar carrito"
            onClick={closeDrawer}
            className="touch-target text-white/60 hover:text-white transition-colors"
          >
            <X className="size-6" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag className="size-12 text-white/20" />
            <p className="font-1 uppercase text-xs tracking-[0.22em] text-white/40">
              Tu carrito está vacío
            </p>
            <button
              onClick={closeDrawer}
              className="font-1 uppercase text-[11px] tracking-[0.22em] text-hype hover:text-hype-glow transition-colors cursor-pointer"
            >
              Seguir comprando
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {items.map((item) => (
              <div
                key={`${item.slug}-${item.size}`}
                className="flex gap-4 py-4 border-b border-white/5"
              >
                <div className="size-16 shrink-0 rounded-sm overflow-hidden bg-black/40">
                  <img
                    src={getProductImageUrl(item.image)}
                    alt={item.name}
                    srcSet={getResponsiveSrcSet(getProductImageUrl(item.image))}
                    sizes="64px"
                    className="size-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = getProductImageUrl(""); }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-1 uppercase text-[9px] tracking-[0.2em] text-white/40 truncate">
                    {item.brand}
                  </p>
                  <p className="font-1 font-bold uppercase text-sm tracking-tight text-white truncate">
                    {item.name}
                  </p>
                  <p className="font-1 text-[11px] tracking-[0.18em] text-white/50 mt-0.5">
                    Talle: {item.size}
                    {item.quantity > 1 && (
                      <span className="text-white/30 ml-1.5">x{item.quantity}</span>
                    )}
                  </p>
                  <p className="font-1 font-bold text-sm text-hype mt-1">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => removeItem(item.slug, item.size)}
                    className="touch-target text-white/30 hover:text-red-400 transition-colors cursor-pointer"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="border-t border-white/10 px-6 py-4 space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-1 uppercase text-xs tracking-[0.22em] text-white/60">
                Total
              </span>
              <span className="font-1 font-bold text-lg text-hype">{formatPrice(totalPrice)}</span>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent({ event_type: "whatsapp_click", metadata: { source: "cart_checkout", page: window.location.pathname } })}
              className="flex items-center justify-center gap-2 font-1 uppercase text-[12px] tracking-[0.22em] bg-hype text-white px-8 py-4 rounded-full hover:hype-glow transition-all duration-300 w-full"
            >
              Enviar por WhatsApp
            </a>
            <button
              onClick={clearCart}
              className="w-full text-center font-1 uppercase text-[10px] tracking-[0.22em] text-white/40 hover:text-red-400 transition-colors cursor-pointer"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </div>
    </>
  );
}
