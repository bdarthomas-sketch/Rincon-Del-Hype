import { useEffect, useState, useRef } from "react";

import { Menu, X } from "lucide-react";
import { cn, scrollToHash, isHomePage } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { CartTrigger } from "@/components/cart/CartTrigger";
import { SearchBar } from "@/components/ui/SearchBar";
import logo from "@/assets/brand/logo-rdhype.webp";

const NAV: ({ label: string; to: string } | { label: string; href: string })[] = [
  { label: "Catálogo", to: "/catalogo" },
  { label: "Encargar", href: "/#como-encargar" },
  { label: "Nosotros", href: "/#quienes-somos" },
];

const TICKER =
  "Envíos a todo el país • Encargos por WhatsApp • Ropa exclusiva • Autenticidad garantizada";

export default SiteHeader;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      drawerRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (window.location.hash && isHomePage()) {
      setTimeout(() => scrollToHash(window.location.hash), 150);
    }
  }, []);

  const { handleKeyDown: handleDrawerKeyDown } = useFocusTrap(drawerRef, menuOpen, () => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  });

  function closeMenu() {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <header className="fixed top-0 z-50 left-0 right-0">
      {/* Announcement marquee */}
      <div className="bg-hype text-white overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-[2px] md:py-1">
          {Array.from({ length: 2 }).map((_, i) => (
            <span
              key={i}
              className="font-1 font-bold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-[clamp(8px,2vw,10px)] px-6 sm:px-10 shrink-0"
            >
              {TICKER}
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav
        className={cn(
          "border-b border-white/10 transition-all duration-500",
          scrolled ? "bg-black/85 backdrop-blur-xl" : "bg-black/40 backdrop-blur-md",
        )}
      >
        <div className="container-x flex items-center h-[70px] md:h-[80px]">
          {/* Hamburger */}
          <button
            ref={menuButtonRef}
            aria-label="Menú"
            aria-expanded={menuOpen}
            className="touch-target text-white md:invisible shrink-0"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <Menu className="size-6" />
          </button>

          {/* Logo - centered on mobile via mx-auto */}
          <a href="/" className="flex items-center group select-none mx-auto md:mx-0">
            <img
              src={logo.src}
              alt="Rincón del Hype"
              width={200}
              height={200}
              fetchPriority="high"
              className="h-[78px] sm:h-[58px] md:h-[92px] w-auto object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
            />
          </a>

          {/* Center: nav links (desktop) */}
          <ul className="hidden md:flex items-center justify-center gap-12 font-1 font-bold text-[13px] tracking-[0.18em] uppercase md:flex-1">
            {NAV.map((item) => {
              const href = "to" in item ? item.to : item.href;
              return (
                <li key={item.label} className="relative group">
                  <a
                    href={href}
                    onClick={(e) => {
                      if (href.startsWith("/#") && isHomePage()) {
                        e.preventDefault();
                        scrollToHash(href);
                      }
                    }}
                    className="relative inline-flex items-center gap-1 py-1 text-white hover:text-hype transition-all duration-300 group-hover:hype-glow"
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* Right: search + cart */}
          <div className="flex items-center gap-2 md:gap-5">
            <div className="hidden lg:block w-72 xl:w-80">
              <SearchBar />
            </div>
            <CartTrigger />
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Mobile drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        tabIndex={-1}
        onKeyDown={handleDrawerKeyDown}
        className={cn(
          "fixed top-0 left-0 h-full w-80 max-w-[90vw] z-50 md:hidden bg-black/95 backdrop-blur-xl border-r border-white/10 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full pt-4">
          {/* Drawer header */}
          <div className="flex items-center justify-between px-6 h-[56px] border-b border-white/10 shrink-0">
            <span className="font-1 font-bold uppercase text-lg tracking-[0.22em] text-white">
              Menú
            </span>
            <button
              aria-label="Cerrar menú"
              onClick={closeMenu}
              className="touch-target text-white/60 hover:text-white transition-colors"
            >
              <X className="size-6" />
            </button>
          </div>

          {/* Search */}
          <div className="px-6 pt-5 pb-4 shrink-0">
            <SearchBar onNavigate={closeMenu} inputClassName="py-2.5" />
          </div>

          {/* Secciones title */}
          <div className="px-6 pb-3 shrink-0">
            <span className="font-1 font-bold uppercase text-[11px] tracking-[0.25em] text-white/40">
              SECCIONES
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-6 pb-8 overflow-y-auto">
            <ul className="space-y-5">
              {NAV.map((item) => {
                const href = "to" in item ? item.to : item.href;
                return (
                  <li key={item.label}>
                  <a
                    href={href}
                    onClick={(e) => {
                      closeMenu();
                      if (href.startsWith("/#") && isHomePage()) {
                        e.preventDefault();
                        scrollToHash(href);
                      }
                    }}
                    className="font-1 font-bold uppercase text-lg tracking-[0.18em] text-white hover:text-hype transition-colors"
                  >
                    {item.label}
                  </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
