import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "./AuthContext";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,

} from "lucide-react";

export function LoginPage() {
  const { login, error: authError, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(authError || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authError) {
      setError(authError);
      clearError();
    }
  }, [authError, clearError]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-2 flex flex-col md:flex-row relative overflow-hidden">
      {/* Background — same as main site */}
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

      {/* LEFT PANEL - Hero / Info */}
      <div className="flex-1 relative z-10 p-8 md:p-16 pl-10 md:pl-30 flex flex-col justify-center         text-left">
        <div className="space-y-6">
          {/* Admin Panel tag */}
          <div className="flex items-center gap-2">
            <div className="h-3 w-0.5 bg-hype" />
            <span className="font-1 text-[11px] tracking-[0.4em] uppercase text-hype/80">Admin Panel</span>
            <span className="font-1 text-[11px] tracking-[0.4em] uppercase text-white">• Rincón del Hype</span>
          </div>

          {/* Main Title */}
          <div className="max-w-xl">
            <h1 className="font-1 text-5xl md:text-[5rem] font-black tracking-tight leading-[0.9] uppercase">
              ADMINISTRÁ.
              <br />
              ACTUALIZÁ.
              <br />
              <span className="text-stroke-hype mt-[0.1rem] block">PUBLICÁ.</span>
            </h1>
          </div>

          {/* Description */}
          <p className="max-w-md text-muted-foreground text-sm md:text-[15px] leading-relaxed opacity-70">
            Controlá cada detalle. Gestioná productos, actualiza stock, y seguí métricas en tiempo real.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL - Auth Form */}
      <div className="flex-1 relative z-10 flex flex-col justify-center items-center p-8 md:p-16">
        <div className="w-full max-w-[305px] bg-black/60 border border-white/10 rounded-2xl px-8 md:px-10 shadow-[0_0_80px_-12px_color-mix(in_oklab,var(--hype)_10%,transparent)] py-6 md:py-8">
          <div className="space-y-5 fade-enter">
            <div className="space-y-2">
              <h2 className="font-1 text-xl md:text-2xl font-black                 uppercase">
                Iniciar Sesión
              </h2>
              <p className="text-muted-foreground text-xs tracking-wide">
                Ingresá tus credenciales para continuar
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                {/* Email Input */}
                <div className="space-y-1 group/input">
                  <label className="font-1 text-[10px] tracking-[0.3em] uppercase text-muted-foreground block ml-1 transition-colors group-focus-within/input:text-hype">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1 border-r border-white/10 group-focus-within/input:border-hype/30 transition-colors">
                      <Mail
                        size={14}
                        className="text-muted-foreground group-focus-within/input:text-hype transition-colors"
                      />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-2/40 border border-white/10 rounded-2xl py-2.5 pl-12 pr-3 text-xs outline-none focus:border-hype/50 focus:ring-4 focus:ring-hype/5 transition-all"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1 group/input">
                  <label className="font-1 text-[10px] tracking-[0.3em] uppercase text-muted-foreground block ml-1 transition-colors group-focus-within/input:text-hype">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1 border-r border-white/10 group-focus-within/input:border-hype/30 transition-colors">
                      <Lock
                        size={14}
                        className="text-muted-foreground group-focus-within/input:text-hype transition-colors"
                      />
                    </div>
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-surface-2/40 border border-white/10 rounded-2xl py-2.5 pl-12 pr-10 text-xs outline-none focus:border-hype/50 focus:ring-4 focus:ring-hype/5 transition-all"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-hype transition-colors"
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 border border-destructive/20 p-2.5 animate-fade-in">
                  <AlertCircle size={14} className="text-destructive shrink-0" />
                  <span className="text-[11px] text-destructive font-medium">
                    {error}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full relative group/btn overflow-hidden rounded-2xl bg-hype py-3 px-6 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50"
              >
                <span className="font-1 text-xs tracking-[0.2em] uppercase font-black text-white relative z-10">
                  {busy ? "Ingresando..." : "IR AL PANEL"}
                </span>
                {!busy && (
                  <ArrowRight
                    size={14}
                    className="text-white relative z-10 transition-transform group-hover/btn:translate-x-1"
                  />
                )}
              </button>
            </form>

            {/* Footer Info */}
            <div className="flex items-center justify-center opacity-20">
              <span className="font-2 text-[7px] font-normal tracking-[0.2em] uppercase text-nowrap">
                Acceso exclusivo para administradores
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
