import { useState, useEffect } from "react";

import { ArrowLeft, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { SizePicker } from "@/components/site/SizePicker";

import { cn, formatPrice, getResponsiveSrcSet, getResponsiveSizes } from "@/lib/utils";
import { getProductImageUrl } from "@/data/product-images";
import { getImageCompositionStyle } from "@/lib/image-composition";
import { useCartStore } from "@/lib/cart/store";
import { trackEvent } from "@/lib/analytics";
import { useSettingsStore } from "@/lib/store/settings-store";
import type { Product } from "@/data/types";

interface ProductoDetalleProps {
  initialProduct: Product;
  initialSizes?: { label: string; stock: number }[];
}

function ProductoDetalle({ initialProduct }: ProductoDetalleProps) {
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [animState, setAnimState] = useState<{ prev: string; direction: "left" | "right" } | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [outOfStockLabel, setOutOfStockLabel] = useState("¡Sin stock!");
  const [showAddedMessage, setShowAddedMessage] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const { addItem, items } = useCartStore();

  useEffect(() => {
    useSettingsStore.getState().load();
    const s = useSettingsStore.getState().settings;
    if (s.out_of_stock_label?.text) setOutOfStockLabel(s.out_of_stock_label.text);
    trackEvent({
      event_type: "product_view",
      product_id: initialProduct.id,
      metadata: { product_name: initialProduct.name },
    });
  }, [initialProduct.id]);

  useEffect(() => {
    setSelectedImage(initialProduct.image);
  }, [initialProduct]);

  const product = initialProduct;

  const imgStyle = getImageCompositionStyle({
    scale: product.image_scale ?? 1.0,
    offsetX: product.image_offset_x ?? 0,
    offsetY: product.image_offset_y ?? 0,
    mode: (product.image_mode as 'fit' | 'cover') ?? 'fit',
    image_padding: product.image_padding ?? 0,
  });
  const isImgAbsolute = imgStyle.position === 'absolute';

  const allImages = [product.image, ...(product.images ?? [])];

  const sizes = product.sizes?.length
    ? product.sizes
    : product.category === "Sneakers"
      ? ["39", "40", "41", "42", "43", "44", "45"].map((label) => ({ label, stock: 0 }))
      : ["S", "M", "L", "XL", "XXL"].map((label) => ({ label, stock: 0 }));

  function handleImageChange(next: string, direction: "left" | "right") {
    if (next === selectedImage || animState) return;
    setAnimState({ prev: selectedImage, direction });
    setSelectedImage(next);
    setTimeout(() => setAnimState(null), 300);
  }

  function handleAddToCart() {
    if (!selectedSize) {
      setMessageType("error");
      setMessageText(
        product.category === "Sneakers"
          ? "Seleccioná un número primero"
          : "Seleccioná un talle primero",
      );
      setShowAddedMessage(true);
      setTimeout(() => setShowAddedMessage(false), 2500);
      return;
    }
    setMessageType("success");
    const alreadyIn = items.some(
      (item) => item.slug === product.slug && item.size === selectedSize,
    );
    if (!alreadyIn) {
      addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        price: product.price,
        image: product.image,
        size: selectedSize,
        quantity,
      });
      setQuantity(1);
    }
    setMessageText(alreadyIn ? "Ya está en tu carrito" : `${product.name} se agregó al carrito`);
    setShowAddedMessage(true);
    setTimeout(() => setShowAddedMessage(false), 2500);
  }

  return (
    <>
    <div>
        <section className="relative pt-32 pb-16 md:pb-20 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              maskImage: "radial-gradient(ellipse 90% 75% at center, transparent 65%, black 85%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 90% 75% at center, transparent 65%, black 85%)",
            }}
          >
            <div className="absolute -top-24 -left-16 size-[300px] rounded-full bg-hype/30 blur-[120px] animate-drift" />
            <div className="absolute top-10 -right-20 size-[340px] rounded-full bg-hype/28 blur-[140px] animate-pulse-glow delay-neg-2" />
            <div className="absolute bottom-10 -left-16 size-[280px] rounded-full bg-hype/28 blur-[130px] animate-pulse-glow delay-neg-2" />
            <div className="absolute bottom-[-30px] -right-20 size-[320px] rounded-full bg-hype/28 blur-[140px] animate-drift" />
          </div>
          <div className="container-x relative z-10">
            <nav className="flex items-center gap-2 mb-8 font-1 uppercase text-[10px] tracking-[0.22em] text-white/35 product-breadcrumb overflow-x-auto scrollbar-none">
              <a href="/catalogo" className="hover:text-hype transition-colors shrink-0">
                Catálogo
              </a>
              <ChevronRight className="size-3 shrink-0" />
              <span className="text-white/60 shrink-0">{product.category}</span>
              <ChevronRight className="size-3 shrink-0" />
              <span className="text-white/80 truncate">{product.name}</span>
            </nav>

            <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">
              <div className="flex flex-col gap-3">
                <div className="relative aspect-square overflow-hidden bg-black/10 ring-1 ring-white/[0.03] rounded-sm">
                      <div
                      key={selectedImage}
                      className={cn(
                        "absolute inset-0",
                        animState?.direction === "right" && "animate-slideInRight",
                        animState?.direction === "left" && "animate-slideInLeft",
                      )}
                    >
                      <img
                        src={getProductImageUrl(selectedImage)}
                        alt={`${product.name} - ${product.brand}`}
                        width={1024}
                        height={1024}
                        srcSet={getResponsiveSrcSet(getProductImageUrl(selectedImage))}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className={cn(isImgAbsolute ? "" : "size-full")}
                        style={imgStyle as React.CSSProperties}
                        onError={(e) => { (e.target as HTMLImageElement).src = getProductImageUrl(""); }}
                      />
                    </div>

                  {animState && (
                    <div
                      className={cn(
                        "absolute inset-0",
                        animState.direction === "right"
                          ? "animate-slideOutLeft"
                          : "animate-slideOutRight",
                      )}
                    >
                      <img
                        src={getProductImageUrl(animState.prev)}
                        alt=""
                        width={1024}
                        height={1024}
                        loading="lazy"
                        srcSet={getResponsiveSrcSet(getProductImageUrl(animState.prev))}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className={cn(isImgAbsolute ? "" : "size-full")}
                        style={imgStyle as React.CSSProperties}
                        onError={(e) => { (e.target as HTMLImageElement).src = getProductImageUrl(""); }}
                      />
                    </div>
                  )}

                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={() => {
                          const idx = allImages.indexOf(selectedImage);
                          handleImageChange(
                            allImages[(idx - 1 + allImages.length) % allImages.length],
                            "left",
                          );
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/70 transition-all cursor-pointer"
                        aria-label="Imagen anterior"
                      >
                        <ChevronLeft className="size-5" />
                      </button>
                      <button
                        onClick={() => {
                          const idx = allImages.indexOf(selectedImage);
                          handleImageChange(allImages[(idx + 1) % allImages.length], "right");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/70 transition-all cursor-pointer"
                        aria-label="Imagen siguiente"
                      >
                        <ChevronRight className="size-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 md:pt-20">
                <div className="flex flex-col gap-1">
                  <span className="inline-block self-start font-1 uppercase text-[8px] tracking-[0.22em] px-2 py-0.5 rounded-full border border-white/15 text-white/40">
                    {product.category}
                  </span>
                  {product.sizes && product.sizes.every((sz) => sz.stock === 0) && (
                    <span className="inline-block self-start font-1 uppercase text-[8px] tracking-[0.22em] px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400">
                      {product.out_of_stock_message || outOfStockLabel}
                    </span>
                  )}
                  <h1 className="font-1 font-bold uppercase text-2xl sm:text-3xl lg:text-4xl leading-[1.2] tracking-tight text-white text-balance overflow-wrap-break-word">
                    {product.name}
                  </h1>
                  <p className="font-1 uppercase tracking-[0.2em] text-[11px] text-white/55">
                    {product.brand}
                  </p>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <p className="font-1 font-bold text-3xl sm:text-4xl text-hype">
                    {formatPrice(product.price)}
                  </p>
                </div>

                <SizePicker
                  sizes={sizes}
                  selectedSize={selectedSize}
                  onSelectSize={setSelectedSize}
                  onAddToCart={handleAddToCart}
                  quantity={quantity}
                  onQuantityChange={setQuantity}
                  isSneakers={product.category === "Sneakers"}
                />

                <a
                  href="/catalogo"
                  className="inline-flex items-center gap-2 font-1 uppercase text-[11px] tracking-[0.22em] text-white/40 hover:text-hype transition-colors self-start"
                >
                  <ArrowLeft className="size-3.5" />
                  Volver al catálogo
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div
        className={`fixed z-[60] rounded-full backdrop-blur-xl px-5 py-3 flex items-center gap-2 transition-all duration-300 ${
          messageType === "error"
            ? "top-32 left-1/2 -translate-x-1/2 bg-black/80 border border-white/20 px-4 py-2"
            : "bottom-8 left-1/2 -translate-x-1/2 bg-white/[0.06] border border-white/10"
        } ${
          showAddedMessage
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {messageType === "error" ? (
          <span className="font-1 uppercase text-[10px] tracking-[0.2em] text-white whitespace-nowrap">
            {messageText}
          </span>
        ) : (
          <>
            <Check className="size-3.5 shrink-0 text-red-600" />
            <span className="font-1 uppercase text-[11px] tracking-[0.22em] text-red-600 whitespace-nowrap">
              {messageText}
            </span>
          </>
        )}
      </div>
    </>
  );
}

export default ProductoDetalle;


