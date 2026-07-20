
import { Truck } from "lucide-react";
import { scrollToHash, isHomePage, cn, formatPrice, getResponsiveSrcSet, getResponsiveSizes } from "@/lib/utils";
import { getProductImageUrl } from "@/data/product-images";
import { getImageCompositionStyle } from "@/lib/image-composition";
import type { Product } from "@/data/types";

interface HeroProps {
  products?: Product[];
}

export default Hero;

export function Hero({ products }: HeroProps) {
  return (
    <section id="inicio" className="relative pt-40 sm:pt-48 md:pt-48 pb-8 md:pb-32 overflow-hidden">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-32 left-1/4 size-[300px] rounded-full bg-hype/30 blur-[120px] animate-drift" />
        <div className="absolute top-20 right-[-80px] size-[380px] rounded-full bg-hype/30 blur-[140px] animate-pulse-glow delay-neg-2" />
        <div
          aria-hidden
          className="bg-grid-subtle absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.65) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage: "linear-gradient(to bottom, black 85%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 85%, transparent 100%)",
          }}
        />
      </div>

      <div className="container-x relative z-10">
        <p className="delay-1 font-1 font-bold uppercase tracking-[0.45em] text-[9px] sm:text-[13px] text-hype mb-2 md:mb-6">
          ◢ Desde 2024
        </p>

        <h1 className="delay-2 font-1 font-black uppercase leading-[1.05] tracking-[-0.03em] text-[clamp(36px,13vw,64px)] sm:text-[85px] lg:text-[115px] hero-title break-normal">
          <span className="block text-white">LA CULTURA</span>
          <span className="block sm:-mt-2 text-stroke-hype opacity-50 sm:opacity-100">EL HYPE</span>
        </h1>

        <p className="delay-3 mt-4 md:mt-6 text-sm sm:text-base text-white/45 max-w-md leading-relaxed">
          Sneakers &amp; streetwear exclusivos — 100% auténticos
        </p>

        <div className="delay-4 mt-10 md:mt-8 flex flex-col sm:flex-row gap-3 md:gap-4">
          <a
            href="/catalogo"
            className="group inline-flex items-center justify-center w-full sm:w-auto px-5 md:px-12 py-3.5 md:py-5 font-1 font-bold text-[12px] md:text-[14px] tracking-[0.22em] uppercase text-black bg-white rounded-full transition-all duration-500 hover:bg-white/90 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] active:scale-[0.97] hero-cta-primary"
          >
            Ver catálogo
          </a>
          <a
            href="/#como-encargar"
            onClick={(e) => {
              if (isHomePage()) {
                e.preventDefault();
                scrollToHash("#como-encargar");
              }
            }}
            className="group inline-flex items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto px-4 md:px-12 py-2.5 md:py-5 font-1 font-bold text-[11px] md:text-[14px] tracking-[0.22em] uppercase text-white bg-transparent border border-hype/50 md:border-hype rounded-full transition-all duration-500 hover:text-white md:hover:bg-hype/10 md:hover:shadow-[0_0_30px_-5px var(--hype-glow)] active:scale-[0.97] hero-cta-secondary"
          >
            <span>Encargar</span>
            <Truck className="size-[clamp(0.75rem,3.5vw,1.25rem)] text-current transition-transform duration-500 group-hover:translate-x-1" />
          </a>
        </div>

        {products && products.length > 0 && (
          <div className="delay-4 mt-16 md:mt-24">
            <p className="font-1 uppercase tracking-[0.3em] text-[10px] text-hype mb-6">Destacados</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {products.slice(0, 4).map((p) => {
                const hStyle = getImageCompositionStyle({
                  scale: p.image_scale ?? 1.0,
                  offsetX: p.image_offset_x ?? 0,
                  offsetY: p.image_offset_y ?? 0,
                  mode: (p.image_mode as 'fit' | 'cover') ?? 'fit',
                  image_padding: p.image_padding ?? 0,
                });
                return (
                  <a key={p.id} href={"/producto/" + p.slug} className="group">
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-black/20">
                      <div className="absolute inset-[25%] rounded-full bg-hype/0 blur-2xl group-hover:bg-hype/30 transition-all duration-700" />
                      <img
                        src={getProductImageUrl(p.image)}
                        alt={p.name}
                        width={512}
                        height={512}
                        loading="lazy"
                        srcSet={getResponsiveSrcSet(getProductImageUrl(p.image))}
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="relative z-10 size-full object-contain transition-transform duration-700 group-hover:scale-105"
                        style={hStyle as React.CSSProperties}
                        onError={(e) => { (e.target as HTMLImageElement).src = getProductImageUrl(""); }}
                      />
                    </div>
                    <p className="mt-2 font-1 font-bold text-sm text-white truncate">{p.name}</p>
                    <p className="font-1 text-hype text-xs">{formatPrice(p.price)}</p>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
