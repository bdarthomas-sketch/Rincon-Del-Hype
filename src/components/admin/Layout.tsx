import { type ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { LayoutDashboard, Package, Tags, LogOut, AlertCircle, Menu, X, Settings2, Film } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/products", label: "Productos", icon: Package },
  { path: "/attributes", label: "Atributos", icon: Tags },
  { path: "/videodrops", label: "VideoDrops", icon: Film },
  { path: "/settings", label: "Configuración", icon: Settings2 },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(path: string) {
    return path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/4 top-1/4 size-[700px] rounded-full bg-hype/10 blur-[160px]" />
        <div className="absolute -top-20 right-1/4 size-[400px] rounded-full bg-hype/15 blur-[140px] animate-drift" />
        <div className="absolute bottom-1/3 left-1/3 size-[500px] rounded-full bg-hype/10 blur-[160px] animate-pulse-glow delay-neg-2" />
        <div
          aria-hidden
          className="bg-grid-subtle absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-surface-1/60 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 md:px-8 h-16 md:h-20">
          <h1 className="font-1 text-xl md:text-2xl tracking-[0.02em] uppercase text-foreground">
            Panel <span className="text-hype">Admin</span>
          </h1>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            className="md:hidden touch-target px-2 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <div className="relative z-10 flex">
        {/* Left sidebar (desktop) */}
        <div className="hidden md:block w-56 shrink-0 p-3 md:p-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-3 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 rounded-full text-[11px] tracking-[0.1em] font-1 transition-colors ${
                  isActive(item.path)
                    ? "bg-hype/15 text-hype font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                }`}
              >
                <item.icon size={15} />
                {item.label}
              </button>
            ))}
            <div className="border-t border-white/10 my-2 pt-2 space-y-2">
              <div className="px-1">
                <p className="font-1 text-[10px] tracking-[0.1em] text-muted-foreground truncate">
                  {user?.email}
                </p>
                <p className="font-1 text-[9px] tracking-[0.2em] uppercase text-hype">
                  {user?.role || "admin"}
                </p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 rounded-full text-[11px] tracking-[0.1em] font-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={14} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 md:p-6">
          {error && (
            <div className="flex items-center gap-2 rounded-full bg-destructive/10 border border-destructive/30 px-4 py-2 mb-6">
              <AlertCircle size={14} className="text-destructive shrink-0" />
              <span className="font-1 text-[11px] text-destructive flex-1">{error}</span>
              <button onClick={clearError} className="text-destructive/60 hover:text-destructive text-[13px] leading-none">&times;</button>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-20 pt-16 md:pt-20">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación admin"
            tabIndex={-1}
            className="absolute left-0 top-16 md:top-20 bottom-0 w-64 bg-surface-1 border-r border-border p-4 space-y-0.5 overflow-y-auto"
          >

            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMenuOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-full min-h-[44px] text-[11px] tracking-[0.1em] font-1 transition-colors ${
                  isActive(item.path)
                    ? "bg-hype/15 text-hype font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                }`}
              >
                <item.icon size={15} />
                {item.label}
              </button>
            ))}
            <div className="border-t border-white/10 my-2 pt-2 space-y-2 px-1">
              <div>
                <p className="font-1 text-[10px] tracking-[0.1em] text-muted-foreground truncate">
                  {user?.email}
                </p>
                <p className="font-1 text-[9px] tracking-[0.2em] uppercase text-hype">
                  {user?.role || "admin"}
                </p>
              </div>
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full min-h-[44px] text-[11px] tracking-[0.1em] font-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={14} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
