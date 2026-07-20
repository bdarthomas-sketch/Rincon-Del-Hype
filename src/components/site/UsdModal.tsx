import { useState, useEffect } from "react";
import { TriangleAlert } from "lucide-react";

const STORAGE_KEY = "usd-accepted";

function isUsdAccepted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export default UsdModal;

export function UsdModal() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return isUsdAccepted();
  });

  useEffect(() => {
    if (dismissed) return;
    document.documentElement.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [dismissed]);

  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4 bg-[#171616]/87 ring-1 ring-white/[0.06] rounded-[28px] px-4 sm:px-6 py-8 text-center shadow-2xl">
        <div className="mb-5">
          <TriangleAlert className="size-10 text-hype mx-auto animate-icon-pulse" />
        </div>

        <p className="font-1 font-bold uppercase tracking-[0.08em] text-lg text-white mb-7 leading-tight">
          PRECIOS EN USD
        </p>

        <div className="space-y-2.5 text-center">
          <p className="font-2 font-bold text-white/90 text-sm leading-relaxed">
            Los valores de todos los productos en la tienda se muestran en{" "}
            <span className="text-hype font-semibold lowercase">dólares estadounidenses (USD)</span>
            .
          </p>
          <p className="font-2 font-bold text-white/70 text-sm leading-relaxed">
            Al completar la compra, tenés la opción de pagar en{" "}
            <span className="text-hype font-semibold lowercase">pesos argentinos (ARS)</span> según
            la cotización vigente del día, o utilizar{" "}
            <span className="text-white/90 font-semibold">
              otra moneda que coordinemos previamente por WhatsApp
            </span>
            .
          </p>
        </div>

        <button
          onClick={handleAccept}
          className={[
            "mt-8 px-8 sm:px-12 py-4.5",
            "font-1 font-bold text-[14px] tracking-[0.22em] uppercase",
            "text-white bg-hype rounded-full",
            "transition-all duration-300",
            "hover:brightness-90",
            "active:scale-[0.97] active:brightness-75",
          ].join(" ")}
        >
          ACEPTAR
        </button>
      </div>
    </div>
  );
}
