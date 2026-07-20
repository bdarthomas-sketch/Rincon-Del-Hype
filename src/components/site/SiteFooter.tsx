import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { MapPin } from "lucide-react";
import { WHATSAPP_PHONE } from "@/config";
import { trackEvent } from "@/lib/analytics";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useEffect, useState } from "react";

const SOCIAL_DEFAULTS: Record<string, string> = {
  instagram: "rincondelhype",
  x: "rincondelhype",
  tiktok: "rincondelhype",
  youtube: "rincondelhype",
};

const SOCIAL_DEFS = [
  { img: "/social/instagram.webp", label: "Instagram", platform: "instagram" as const },
  { img: "/social/X.webp", label: "X (Twitter)", platform: "x" as const },
  { img: "/social/tiktok.webp", label: "TikTok", platform: "tiktok" as const },
  { img: "/social/youtube.webp", label: "YouTube", platform: "youtube" as const },
  { img: "/social/whatsapp.webp", label: "WhatsApp", platform: "whatsapp" as const },
];

function buildSocialUrl(platform: string, value: string): string | null {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  switch (platform) {
    case "instagram": return `https://www.instagram.com/${value}`;
    case "x": return `https://x.com/${value}`;
    case "tiktok": return `https://www.tiktok.com/@${value}`;
    case "youtube": return `https://www.youtube.com/@${value}`;
    case "whatsapp": return `https://api.whatsapp.com/send?phone=${value}`;
    default: return value;
  }
}

export default SiteFooter;

export function SiteFooter() {
  const [storeInfo, setStoreInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    useSettingsStore.getState().load();
    const s = useSettingsStore.getState().settings;
    if (s.store_info) setStoreInfo(s.store_info);
  }, []);

  const socials = SOCIAL_DEFS
    .map(({ img, label, platform }) => {
      let value = platform === "whatsapp"
        ? (storeInfo[platform] || WHATSAPP_PHONE)
        : (storeInfo[platform] || SOCIAL_DEFAULTS[platform]);
      const href = buildSocialUrl(platform, value || "");
      return href ? { img, label, href, platform } : null;
    })
    .filter(Boolean) as { img: string; label: string; href: string; platform: string }[];
  const { ref, visible } = useScrollReveal();
  return (
    <footer className="relative border-t border-white/10 mt-10">
      <div
        ref={ref}
        className={cn(
          "container-x py-12 lg:py-10 flex flex-col items-center gap-8 lg:flex-row lg:justify-between scroll-reveal footer-top-container",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        )}
      >
        <a href="/" className="flex items-center group">
          <img
            src="/brand/rincon-del-hype.webp"
            alt="Rincón del Hype"
            width={240}
            height={240}
            loading="lazy"
            className="h-[36px] md:h-[40px] w-auto object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
          />
        </a>

        <div className="flex items-center gap-5 md:gap-4">
          {socials.map(({ img, label, href, platform }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              onClick={platform === "whatsapp" ? () => trackEvent({ event_type: "whatsapp_click", metadata: { source: "footer", page: window.location.pathname } }) : undefined}
              className="group flex items-center justify-center min-w-[44px] min-h-[44px] transition-transform duration-300 hover:scale-110 footer-social-link"
            >
              <div
                aria-hidden
                className="size-[clamp(1.125rem,5vw,1.5rem)] bg-white transition-all duration-300 group-hover:bg-hype group-hover:drop-shadow-[0_0_6px_var(--hype-glow)] footer-social-icon"
                style={{
                  maskImage: `url(${img})`,
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  WebkitMaskImage: `url(${img})`,
                  WebkitMaskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                }}
              />
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="w-full max-w-[1440px] mx-auto px-2 md:px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-[12px] font-1 uppercase tracking-[0.12em] md:tracking-[0.22em] text-white/35 footer-legal">
          <span className="text-center md:text-left">
            &copy; Rincon Del Hype - 2026. Todos los derechos reservados.
          </span>
          <span className="flex items-center justify-center gap-1 md:justify-end text-[9px] md:text-[12px]">
            <MapPin className="hidden md:inline size-3" /> Zona Oeste, Buenos Aires, Argentina
          </span>
        </div>
      </div>
    </footer>
  );
}
