import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { ShieldCheck, Package, Plane } from "lucide-react";
const showroomUrl = "/about/about-showroom.webp";

const STATS = [
  { icon: Package, value: "200+", label: "Prendas" },
  { icon: ShieldCheck, value: "100%", label: "Autenticidad" },
  { icon: Plane, value: "200+", label: "Envíos Gratis" },
];

export default About;

export function About() {
  const { ref, visible } = useScrollReveal();

  return (
    <section id="quienes-somos" className="relative pt-16 md:pt-20 pb-6 md:pb-20">
      <div className="pointer-events-none absolute -left-32 top-1/3 size-[400px] rounded-full bg-hype/10 blur-[120px]" />

      <div ref={ref} className="container-x grid md:grid-cols-12 gap-12 lg:gap-20 items-center">
        <div
          className={cn(
            "md:col-span-7 lg:col-span-7 transition-all duration-500",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          <h2 className="font-1 font-black uppercase text-[clamp(2.1rem,9vw,2.5rem)] sm:text-5xl lg:text-7xl leading-[1.2] tracking-tight text-white text-center sm:text-left sm:-ml-[2px] about-heading-mobile md:-mt-10 lg:-mt-10 text-balance break-normal">
            Quiénes <br className="hidden sm:block" />
            <span className="text-stroke-hype md:block md:-mt-4 lg:block lg:-mt-4">Somos</span>
          </h2>

          <div className="mt-4 lg:mt-2 text-white/70 text-base lg:text-lg leading-relaxed">
            <div className="relative float-left md:hidden w-2/5 max-w-[130px] mr-3 mb-2">
              <div className="absolute -inset-8 bg-hype/10 blur-[100px] rounded-full" />
              <div className="relative aspect-[3/5] overflow-hidden rounded-2xl border border-white/10">
                <div className="absolute inset-0 bg-gradient-to-br from-hype/10 to-transparent z-10" />
                <img
                  src={showroomUrl}
                  alt="Showroom Rincón del Hype"
                  width={1280}
                  height={1280}
                  loading="lazy"
                  className="size-full object-cover"
                />
                <span
                  aria-hidden
                  className="absolute top-1 left-1 size-8 border-l-[3px] border-t-[3px] border-hype z-20"
                />
                <span
                  aria-hidden
                  className="absolute bottom-1 right-1 size-8 border-r-[3px] border-b-[3px] border-hype z-20"
                />
              </div>
            </div>
            <p>
              Desde 2024, en <span className="text-white font-bold">Rincón del Hype</span> nos
              dedicamos a la compra y venta de sneakers y streetwear 100% original, trabajando con
              prendas y calzado nuevos y usados seleccionados.
            </p>
            <p>
              Colaboramos con artistas como <span className="text-white font-bold">Kaydy Cain</span>{" "}
              y <span className="text-white font-bold">Mike Southside</span>, integrando la cultura
              urbana en cada pieza que ofrecemos.
            </p>
            <div className="clear-both md:hidden" />
            <p className="mt-6 text-[12px] tracking-[0.05em] text-white/60 italic border-l border-hype/40 pl-4">
              Realizamos encargos <span className="font-bold">nacionales e internacionales</span>{" "}
              para traer piezas exclusivas a cualquier parte del mundo.
            </p>
          </div>

          <div className="mt-10 lg:mt-8 grid grid-cols-3 gap-4 md:gap-6 max-w-lg">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <s.icon className="size-[clamp(0.875rem,4vw,1.25rem)] text-hype mb-2" />
                <div className="font-1 font-black text-lg md:text-xl text-white">{s.value}</div>
                <div className="font-1 uppercase tracking-[0.18em] text-[9px] text-white/40">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "hidden md:block md:col-span-5 lg:col-span-5 relative transition-all duration-500 delay-100",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          <div className="absolute -inset-8 bg-hype/10 blur-[100px] rounded-full" />
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-hype/10 to-transparent z-10" />
            <img
              src={showroomUrl}
              alt="Showroom Rincón del Hype"
              width={1280}
              height={1280}
              loading="lazy"
              className="size-full object-cover"
            />
            <span
              aria-hidden
              className="absolute top-1 left-1 size-8 border-l-[3px] border-t-[3px] border-hype z-20"
            />
            <span
              aria-hidden
              className="absolute bottom-1 right-1 size-8 border-r-[3px] border-b-[3px] border-hype z-20"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
