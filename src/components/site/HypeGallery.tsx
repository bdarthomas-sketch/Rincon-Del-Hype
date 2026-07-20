import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { fetchVideoDrops, incrementVideoDropClick, type VideoDropItem } from "@/lib/api";

const STORAGE_BASE = "https://cyfkggbxvxbxpqijgtlm.supabase.co/storage/v1/object/public/video-drops";

const FALLBACK_ITEMS = [
  { img: { src: `${STORAGE_BASE}/afdf9732-42d0-4a50-a5cd-b96047e47b4f/thumbnail.webp` }, video: `${STORAGE_BASE}/afdf9732-42d0-4a50-a5cd-b96047e47b4f/preview.mp4`, url: "https://youtu.be/JSXq-vfGYHw?si=Bl2gjepNdGODZ6if" },
  { img: { src: `${STORAGE_BASE}/9eb9e7b3-4523-4d6c-b7d7-d13b8ad4fabb/thumbnail.webp` }, video: `${STORAGE_BASE}/9eb9e7b3-4523-4d6c-b7d7-d13b8ad4fabb/preview.mp4`, url: "https://youtu.be/2EmNCa2J8lE?si=uF5Zi1Ai4c2lutsg" },
  { img: { src: `${STORAGE_BASE}/82147438-9677-40ab-b648-bbae0e141231/thumbnail.webp` }, video: `${STORAGE_BASE}/82147438-9677-40ab-b648-bbae0e141231/preview.mp4`, url: "https://youtu.be/MqNySCr1oMY?si=_8Xm5QVLXOjGqt6w" },
];

interface GalleryItem {
  img: { src: string };
  video: string;
  url: string;
  id?: string;
  isNew?: boolean;
}

function mapToGalleryItem(item: VideoDropItem): GalleryItem {
  return {
    img: { src: item.thumbnail_url || `${STORAGE_BASE}/afdf9732-42d0-4a50-a5cd-b96047e47b4f/thumbnail.webp` },
    video: item.video_url || `${STORAGE_BASE}/afdf9732-42d0-4a50-a5cd-b96047e47b4f/preview.mp4`,
    url: item.youtube_url || "#",
    id: item.id,
    isNew: item.is_new || undefined,
  };
}

export default HypeGallery;

export function HypeGallery() {
  const { ref, visible } = useScrollReveal();
  const [items, setItems] = useState<GalleryItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchVideoDrops();
        if (cancelled) return;

        if (data.length > 0) {
          setItems(data.map(mapToGalleryItem));
        } else {
          // Empty data from API — use fallback
          setItems(FALLBACK_ITEMS);
        }
      } catch {
        // API failed — use fallback silently
        if (!cancelled) setItems(FALLBACK_ITEMS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Don't render anything while loading or if no items after load
  if (loading || !items || items.length === 0) return null;

  const displayItems = [...items, ...items, ...items, ...items]; // 4x for seamless infinite scroll

  function handleClick(id?: string) {
    if (id) incrementVideoDropClick(id);
  }

  return (
    <section
      ref={ref}
      id="videodrops"
      className={cn(
        "relative pt-14 md:pt-28 -mb-8 md:-mb-0 scroll-reveal",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
      )}
    >
      <div className="container-x relative z-10">
        <div className="flex justify-center">
          <h2 className="font-1 font-black uppercase text-[1.75rem] sm:text-3xl md:text-5xl leading-[1.2] tracking-tight text-white md:-ml-3 text-balance overflow-wrap-break-word">
            <span className="text-white">#VIDEO</span>
            <span className="text-stroke-hype">DROPS</span>
          </h2>
        </div>
      </div>

      {/* Infinite horizontal scroll */}
      <div className="relative w-full overflow-hidden z-10 -mt-4 md:mt-0 gallery-track-mobile">
        {/* edge fades */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="flex animate-gallery-scroll w-max">
          {displayItems.map((item, i) => (
            <a
              key={`${item.id || i}-${Math.floor(i / items.length)}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleClick(item.id)}
              className="group relative flex items-center justify-center w-[140px] sm:w-[200px] md:w-[280px] aspect-[2/3] shrink-0 cursor-pointer mr-3 md:mr-5"
            >
              {/* Imagen base */}
              <img
                src={item.img.src}
                alt={`Galería ${(i % items.length) + 1}`}
                width={1024}
                height={1024}
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const container = target.closest("a");
                  if (container) {
                    const fallback = container.querySelector(".gallery-img-fallback");
                    if (fallback) (fallback as HTMLElement).style.display = "flex";
                  }
                }}
                className={cn(
                  "block shrink-0 max-h-full w-auto object-contain transition-opacity duration-300 group-hover:opacity-0",
                  item.isNew && "outline-2 outline-[#660A0A] -outline-offset-2 shadow-[0_0_14px_4px_rgba(102,10,10,0.7)] rounded-lg",
                )}
              />

              {/* Video preview — visible solo en hover */}
              <video
                src={item.video}
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                className="absolute inset-0 m-auto max-h-full w-auto object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />

              {/* Fallback cuando la imagen no carga */}
              <div className="gallery-img-fallback absolute inset-0 hidden items-center justify-center bg-surface-1 text-muted-foreground/40 text-[10px] font-1">
                N/A
              </div>

              {/* Overlay gradiente en hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
