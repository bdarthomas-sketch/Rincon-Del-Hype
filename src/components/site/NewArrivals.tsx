import { cn, formatPrice, getResponsiveSrcSet, getResponsiveSizes } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { getProductImageUrl } from "@/data/product-images";
import { getImageCompositionStyle } from "@/lib/image-composition";
import type { Product } from "@/data/types";

interface NewArrivalsProps {
  products: Product[];
}

export default NewArrivals;

export function NewArrivals({ products }: NewArrivalsProps) {
  const { ref, visible } = useScrollReveal();

  return (
    <section
      ref={ref}
      id="nuevos"
      className={cn(
        "relative pt-12 md:pt-20 pb-12 md:pb-20 px-0 scroll-reveal",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
      )}
    >
      <div className="container-x">
        <div className="delay-1 mb-8 md:mb-16">
          <h2 className="font-1 font-bold uppercase text-xl sm:text-xl lg:text-3xl leading-[1.2] tracking-tight text-white text-balance overflow-wrap-break-word">
            Nuevos Ingresos
          </h2>
          <div className="mt-4 h-[3px] w-20 bg-hype" />
        </div>

        {products.length > 0 ? (
          <div className="delay-2 grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-16 xl:gap-20">
            {products.map((p) => (
              <a
                key={p.id}
                href={"/producto/" + p.slug}
                className="group flex flex-col h-full sm:block"
              >
                <div className="relative aspect-square overflow-hidden flex items-center justify-center rounded-xl">
                  <div className="card-glow-radial absolute inset-0 z-0" />
                  <div className="absolute inset-[30%] rounded-full bg-hype/0 blur-2xl group-hover:bg-hype/45 transition-all duration-700" />
                  {(() => {
                    const naStyle = getImageCompositionStyle({
                      scale: p.image_scale ?? 1.0,
                      offsetX: p.image_offset_x ?? 0,
                      offsetY: p.image_offset_y ?? 0,
                      mode: (p.image_mode as 'fit' | 'cover') ?? 'fit',
                      image_padding: p.image_padding ?? 0,
                    });
                    const naIsStatic = naStyle.position === 'static';
                    return (
                      <div className="relative z-10 size-full transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]">
                        <img
                          src={getProductImageUrl(p.image)}
                          alt={`${p.name} - ${p.brand}`}
                          width={1024}
                          height={1024}
                          loading="lazy"
                          srcSet={getResponsiveSrcSet(getProductImageUrl(p.image))}
                          sizes={getResponsiveSizes()}
                          className={cn(naIsStatic ? "size-full" : "")}
                          style={naStyle as React.CSSProperties}
                          onError={(e) => { (e.target as HTMLImageElement).src = getProductImageUrl(""); }}
                        />
                      </div>
                    );
                  })()}
                </div>
                <div className="flex flex-col flex-1 gap-1 py-3 items-center text-center">
                  <h3 className="font-1 font-bold uppercase leading-[1.2] tracking-wide text-white text-sm product-card-name text-balance overflow-wrap-break-word">
                    {p.name}
                  </h3>
                  <p className="font-1 uppercase tracking-[0.2em] text-[9px] text-white/45">
                    {p.brand}
                  </p>
                  <div className="font-1 font-bold text-hype text-sm sm:text-[15px]">
                    {formatPrice(p.price)}
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="delay-2 text-center py-12">
            <p className="font-1 uppercase text-[11px] tracking-[0.2em] text-muted-foreground">
              No hay novedades por ahora
            </p>
          </div>
        )}
      </div>
    </section>
  );
}


