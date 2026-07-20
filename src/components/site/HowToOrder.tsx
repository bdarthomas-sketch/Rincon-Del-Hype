import { useRef, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useTimelineAnimation } from "@/hooks/use-timeline-animation";
import { MessageCircle, FileText, CheckCircle2 } from "lucide-react";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { WHATSAPP_PHONE } from "@/config";
import { useSettingsStore } from "@/lib/store/settings-store";
import { trackEvent } from "@/lib/analytics";

const STEPS = [
  {
    n: "01",
    icon: MessageCircle,
    title: "Contactanos",
    body: "Envianos nombre y foto del producto que buscás por WhatsApp o Instagram. Te respondemos al instante.",
  },
  {
    n: "02",
    icon: FileText,
    title: "Cotización",
    body: "Te pasamos el presupuesto final con envío incluido y medios de pago disponibles. Sin sorpresas.",
  },
  {
    n: "03",
    icon: CheckCircle2,
    title: "Confirmación",
    body: "Una vez confirmado el pago, recibís tu pedido en un plazo de 15 a 20 días hábiles en tu puerta.",
  },
];

export default HowToOrder;

export function HowToOrder() {
  const [whatsappPhone, setWhatsappPhone] = useState(WHATSAPP_PHONE);

  useEffect(() => {
    useSettingsStore.getState().load();
    const s = useSettingsStore.getState().settings;
    if (s.store_info?.whatsapp) setWhatsappPhone(s.store_info.whatsapp);
  }, []);

  const { ref: sectionRef, visible } = useScrollReveal();
  const containerRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const stepRefCb = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const idx = parseInt(el.dataset.step || "0", 10);
    stepRefs.current[idx] = el;
  }, []);

  const activeIndex = useTimelineAnimation(visible, containerRef, ballRef, STEPS.length, stepRefs);

  return (
    <section
      ref={sectionRef}
      id="como-encargar"
      className={cn(
        "relative pt-16 pb-8 md:pt-20 md:pb-12 overflow-hidden scroll-reveal scroll-mt-[100px]",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
      )}
    >
      <div className="container-x relative">
        <div className="grid md:grid-cols-12 gap-16 lg:gap-20 items-start">
          {/* LEFT — title + big CTA */}
          <div className="md:col-span-5 md:sticky md:top-[76px] lg:col-span-5 lg:sticky lg:top-[76px]">
            <h2 className="font-1 font-black uppercase text-[clamp(1.85rem,9vw,2.5rem)] sm:text-5xl lg:text-7xl leading-[1.2] tracking-tight text-white text-center sm:text-left sm:-ml-[2px] md:-mt-10 lg:-mt-10 text-balance overflow-wrap-break-word">
              Cómo{" "}
              <span className="text-stroke-hype md:block md:-mt-4 lg:block lg:-mt-4">Encargar</span>
            </h2>
            <p className="mt-4 lg:mt-2 text-white/55 max-w-md px-2 sm:px-0 text-center sm:text-left">
              Tres pasos simples para traer cualquier pieza del mundo a tu puerta.
            </p>

            <div className="hidden md:block mt-10 lg:mt-6">
              <a
                href={`https://api.whatsapp.com/send?phone=${whatsappPhone}&text=Hola%2C%20tengo%20inter%C3%A9s%20en%20realizar%20un%20encargo%20%F0%9F%93%A9%F0%9F%A9%B8%0A%0AProducto%3A%0ATalle%3A%0AConsulta%3A`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent({ event_type: "whatsapp_click", metadata: { source: "howtoorder_desktop", page: window.location.pathname } })}
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-4 px-5 py-3.5 md:px-12 md:py-5 lg:px-20 font-1 font-bold text-[12px] md:text-[14px] tracking-[0.22em] uppercase text-white bg-hype rounded-full transition-all duration-500 hover:bg-hype/90 hover:shadow-[0_10px_40px_-5px var(--hype-glow)]"
              >
                Encargar
                <WhatsAppIcon className="size-[clamp(0.875rem,4vw,1.25rem)] animate-whatsapp-hover" />
              </a>
              <p className="mt-3 lg:mt-4 font-1 uppercase tracking-[0.22em] text-[10px] text-white/40 max-w-sm">
                * Sujeto a disponibilidad de stock internacional y aduana
              </p>
            </div>
          </div>

          {/* RIGHT — timeline */}
          <div ref={containerRef} className="md:col-span-7 lg:col-span-7 relative -mt-6 lg:-mt-10">
            {/* spine */}
            <div
              className="absolute left-[23.25px] top-0 bottom-0 w-[1.5px] z-10 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 0%, color-mix(in oklab, var(--hype) 25%, transparent) 12%, color-mix(in oklab, var(--hype) 25%, transparent) 88%, transparent 100%)",
              }}
            />

            {/* traveling ball */}
            <div
              ref={ballRef}
              className="absolute left-6 -translate-x-1/2 z-30 pointer-events-none will-change-transform"
              style={{ top: 0 }}
            >
              <div
                className="size-[14px] rounded-full"
                style={{
                  backgroundColor: "color-mix(in oklab, var(--hype) 85%, black 15%)",
                  boxShadow:
                    "0 0 2px 1px rgba(255,70,70,0.12), 0 0 6px 2px color-mix(in oklab, var(--hype) 40%, transparent), 0 0 16px 6px color-mix(in oklab, var(--hype) 12%, transparent)",
                }}
              />
            </div>

            {/* steps */}
            <div className="space-y-14 md:space-y-20">
              {STEPS.map((s, i) => {
                const isActive = i === activeIndex;
                const isPassed = i < activeIndex;
                const Icon = s.icon;
                return (
                  <div
                    key={s.n}
                    data-step={i}
                    ref={stepRefCb}
                    className="relative pl-16 md:pl-20 timeline-step-mobile"
                    style={{
                      opacity: isPassed ? 1 : isActive ? 0.85 : 0.2,
                      transition: "opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    {/* node */}
                    <div className="absolute left-6 -translate-x-1/2 top-2 z-20">
                      <div
                        className={cn(
                          "size-12 rounded-full grid place-items-center font-1 font-bold text-[11px] tracking-[0.18em]",
                        )}
                        style={{
                          backgroundColor:
                            isActive || isPassed ? "var(--hype)" : "rgba(255,255,255,0.04)",
                          color: isActive || isPassed ? "white" : "rgba(255,255,255,0.25)",
                          border:
                            isActive || isPassed ? "none" : "1px solid rgba(255,255,255,0.06)",
                          boxShadow: isActive
                            ? "0 0 20px var(--hype-glow), 0 0 40px var(--hype)"
                            : isPassed
                              ? "0 0 8px var(--hype-glow)"
                              : "none",
                          transition:
                            "background-color 0.8s ease, color 0.8s ease, box-shadow 0.8s ease, border 0.8s ease",
                        }}
                      >
                        {s.n}
                      </div>
                    </div>

                    <div>
                      <div className="inline-flex items-center gap-2 mb-3">
                        <Icon
                          className="size-[clamp(0.75rem,3.5vw,1rem)]"
                          style={{
                            color: isActive || isPassed ? "var(--hype)" : "rgba(255,255,255,0.25)",
                            transition: "color 0.6s ease",
                          }}
                        />
                        <span
                          className="font-1 font-bold uppercase tracking-[0.2em] text-[10px]"
                          style={{
                            color:
                              isActive || isPassed
                                ? "rgba(255,255,255,0.5)"
                                : "rgba(255,255,255,0.2)",
                            transition: "color 0.6s ease",
                          }}
                        >
                          Paso {s.n}
                        </span>
                      </div>
                      <h3
                        className="font-1 font-bold uppercase text-2xl md:text-3xl leading-[1.2] tracking-tight"
                        style={{
                          color: isActive || isPassed ? "white" : "rgba(255,255,255,0.35)",
                          transition: "color 0.6s ease",
                        }}
                      >
                        {s.title}
                      </h3>
                      <p
                        className="mt-3 leading-relaxed max-w-lg"
                        style={{
                          color:
                            isActive || isPassed
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(255,255,255,0.25)",
                          transition: "color 0.6s ease",
                        }}
                      >
                        {s.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MOBILE CTA — below timeline */}
        <div className="md:hidden mt-14">
          <a
            href={`https://api.whatsapp.com/send?phone=${whatsappPhone}&text=Hola%2C%20tengo%20inter%C3%A9s%20en%20realizar%20un%20encargo%20%F0%9F%93%A9%F0%9F%A9%B8%0A%0AProducto%3A%0ATalle%3A%0AConsulta%3A`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent({ event_type: "whatsapp_click", metadata: { source: "howtoorder_mobile", page: window.location.pathname } })}
            className="group w-full inline-flex items-center justify-center gap-4 px-5 py-3.5 font-1 font-bold text-[12px] tracking-[0.22em] uppercase text-white bg-hype rounded-full transition-all duration-500 hover:bg-hype/90 hover:shadow-[0_10px_40px_-5px_var(--hype-glow)]"
          >
            Encargar
            <WhatsAppIcon className="size-[clamp(0.875rem,4vw,1.25rem)] animate-whatsapp-hover" />
          </a>
          <p className="mt-2 font-1 uppercase tracking-[0.22em] text-[8px] text-white/40 max-w-sm text-center timeline-disclaimer-mobile">
            * Sujeto a disponibilidad de stock internacional y aduana
          </p>
        </div>
      </div>
    </section>
  );
}
