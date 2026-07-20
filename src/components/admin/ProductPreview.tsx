import { cn } from "@/lib/utils";
import { getProductImageUrl } from "@/data/product-images";
import { formatPrice } from "@/lib/utils";
import { getImageCompositionStyle } from "@/lib/image-composition";

interface ProductPreviewData {
  name: string;
  brand: string;
  category: string;
  price: string;
  sizes?: string[];
  image?: string;
  auto_trim?: boolean;
  image_margin?: number;
  image_scale?: number;
  image_offset_x?: number;
  image_offset_y?: number;
  image_mode?: string;
  image_padding?: number;
}

export function ProductPreview({ data }: { data: ProductPreviewData }) {
  const price = parseFloat(data.price) || 0;

  const imgStyle = getImageCompositionStyle({
    scale: data.image_scale ?? 1.0,
    offsetX: data.image_offset_x ?? 0,
    offsetY: data.image_offset_y ?? 0,
    mode: (data.image_mode as 'fit' | 'cover') ?? 'fit',
    image_padding: data.image_padding ?? 0,
  });

  const isAbsolute = imgStyle.position === 'absolute';

  return (
    <div>
      <div className="group flex flex-col">
        <div className="relative aspect-square overflow-hidden flex items-center justify-center rounded-xl">
          <div className="card-glow-radial absolute inset-0 z-0" />
          <div className="absolute inset-[30%] rounded-full bg-hype/0 blur-2xl group-hover:bg-hype/45 transition-all duration-700" />
          {data.image ? (
            <div className={cn("relative z-10 transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]", isAbsolute ? "size-full" : "size-full")}>
              <img
                src={data.image}
                alt={data.name || "Producto"}
                width={1024}
                height={1024}
                className={cn(isAbsolute ? "" : "size-full")}
                style={imgStyle as React.CSSProperties}
                onError={(e) => { (e.target as HTMLImageElement).src = getProductImageUrl(""); }}
              />
            </div>
          ) : (
            <div className="relative z-10 text-center p-6">
              <div className="size-12 mx-auto mb-2 rounded-full bg-surface-2 flex items-center justify-center ring-1 ring-white/5">
                <span className="font-1 text-lg text-muted-foreground/40">?</span>
              </div>
              <p className="font-1 text-[9px] tracking-[0.15em] text-muted-foreground/40">
                Sin imagen
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 py-2 sm:py-3 items-center text-center">
          <h3 className="font-1 font-bold uppercase leading-[1.2] tracking-wide text-white text-sm text-balance break-words">
            {data.name || "Nombre del producto"}
          </h3>
          <p className="font-1 uppercase tracking-[0.2em] text-[9px] text-white/45">
            {data.brand || "Marca"}
          </p>
          <div className="font-1 font-bold text-hype text-sm sm:text-base">
            {price ? formatPrice(price) : "$0"}
          </div>
        </div>
      </div>
    </div>
  );
}
