import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getStats, getRendimiento, type DashboardStats, type PerformanceItem } from "./api";
import {
  Plus, Edit3, Archive, DollarSign, Package,
  AlertTriangle, AlertCircle, History, Activity,
} from "lucide-react";
import { actionText, relativeTime, actionIcon } from "./activityHelpers";
import { ActivityModal } from "./ActivityModal";
import { StatusBadge } from "./StatusBadge";

function Sparkline({ data, color, height = 26 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const rng = mx - mn || 1;
  const w = data.length * 22;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - mn) / rng) * height * 0.78 - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const fpx = pts[0].split(",")[0];
  const lpx = pts[pts.length - 1].split(",")[0];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden="true" style={{ display: "block" }}>
      <polygon points={`${fpx},${height} ${pts.join(" ")} ${lpx},${height}`} fill={color} opacity={0.12} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function changeBadge(current: number, previous: number | undefined) {
  if (previous === undefined) return null;
  if (previous === 0) {
    if (current === 0) return null;
    return { pct: null, up: true };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct, up: current >= previous };
}

function diffBadge(current: number, previous: number | undefined, invertColor = false) {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0) return null;
  const isUp = diff > 0;
  const showUp = invertColor ? !isUp : isUp;
  return { diff, up: showUp };
}

function trafficColor(action: string): string {
  switch (action) {
    case "created":        return "#22c55e";
    case "updated":        return "#3b82f6";
    case "deleted":        return "#ef4444";
    case "duplicated":     return "#3b82f6";
    case "activated":      return "#a855f7";
    case "deactivated":    return "#a855f7";
    case "price_changed":  return "#f59e0b";
    case "featured":       return "#fbbf24";
    case "unfeatured":     return "#fbbf24";
    case "sold":           return "#4ade80";
    case "stock_updated":  return "#22c55e";
    case "restored":       return "#93c5fd";
    default:               return "#555";
  }
}

function activityBg(action: string): string {
  switch (action) {
    case "created":        return "rgba(34,197,94,0.1)";
    case "updated":        return "rgba(59,130,246,0.12)";
    case "deleted":        return "rgba(239,68,68,0.1)";
    case "duplicated":     return "rgba(59,130,246,0.12)";
    case "activated":      return "rgba(168,85,247,0.1)";
    case "deactivated":    return "rgba(168,85,247,0.1)";
    case "price_changed":  return "rgba(245,158,11,0.1)";
    case "featured":       return "rgba(251,191,36,0.1)";
    case "unfeatured":     return "rgba(251,191,36,0.1)";
    case "sold":           return "rgba(74,222,128,0.1)";
    case "stock_updated":  return "rgba(34,197,94,0.1)";
    case "restored":       return "rgba(147,197,253,0.12)";
    default:               return "rgba(85,85,85,0.1)";
  }
}

function drawSmoothLine(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], tension: number) {
  const len = pts.length;
  if (len < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < len - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(len - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  ctx.stroke();
}

function TimeRangeFilter({ value, onChange }: { value: string; onChange: (v: "week" | "month" | "all") => void }) {
  const options: { label: string; value: "week" | "month" | "all" }[] = [
    { label: "Semanal", value: "week" },
    { label: "Mensual", value: "month" },
    { label: "Siempre", value: "all" },
  ];
  return (
    <div className="flex gap-[4px]">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] px-[7px] py-[3px] lg:px-[7px] lg:py-[2px] rounded-[10px] border-none cursor-pointer ${
            value === opt.value
              ? "text-white bg-hype"
              : "text-muted-foreground bg-white/5 hover:bg-white/10"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function drawChart(
  ctx: CanvasRenderingContext2D,
  datasets: { data: number[]; color: string; fillColor: string }[],
  labels: string[],
  width: number,
  height: number
) {
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, width, height);

  const pad = { top: 12, bottom: 16, left: 28, right: 8 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const allValues = datasets.flatMap((d) => d.data);
  const minVal = 0;
  const maxVal = Math.max(...allValues, 1);

  function xPos(i: number) {
    return pad.left + (i / (labels.length - 1)) * chartW;
  }
  function yPos(v: number) {
    return pad.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
  }

  // Grid
  ctx.strokeStyle = "#1c1c1c";
  ctx.lineWidth = 0.5;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + (chartH / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
  }

  // X labels
  ctx.fillStyle = "#444";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i < labels.length; i++) {
    ctx.fillText(labels[i], xPos(i), pad.top + chartH + 4);
  }

  // Y labels
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + (chartH / gridLines) * i;
    const val = Math.round(maxVal - (maxVal / gridLines) * i);
    ctx.fillText(String(val), pad.left - 6, y);
  }

  // Data lines
  for (const ds of datasets) {
    const pts = ds.data.map((v, i) => ({ x: xPos(i), y: yPos(v) }));
    ctx.save();

    // Fill
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pad.top + chartH);
    ctx.lineTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) * 0.4 / 6;
      const cp1y = p1.y + (p2.y - p0.y) * 0.4 / 6;
      const cp2x = p2.x - (p3.x - p1.x) * 0.4 / 6;
      const cp2y = p2.y - (p3.y - p1.y) * 0.4 / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.lineTo(pts[pts.length - 1].x, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = ds.fillColor;
    ctx.fill();

    // Stroke
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) * 0.4 / 6;
      const cp1y = p1.y + (p2.y - p0.y) * 0.4 / 6;
      const cp2x = p2.x - (p3.x - p1.x) * 0.4 / 6;
      const cp2y = p2.y - (p3.y - p1.y) * 0.4 / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}

function TrafficChart({ data, labels: chartLabels }: { data: { visits: number[]; whatsapp: number[]; searches: number[] }; labels: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = 180;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const labels = chartLabels;

    drawChart(ctx, [
      { data: data.visits, color: "#ef4444", fillColor: "rgba(239,68,68,0.08)" },
      { data: data.whatsapp, color: "#22c55e", fillColor: "rgba(34,197,94,0.04)" },
      { data: data.searches, color: "#6366f1", fillColor: "rgba(99,102,241,0.04)" },
    ], labels, w, h);

    // Hover tooltip
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const pad = { left: 28, right: 8 };
      const chartW = w - pad.left - pad.right;
      const maxIdx = labels.length - 1;
      const idx = Math.round(((mx - pad.left) / chartW) * maxIdx);
      if (idx < 0 || idx > maxIdx) {
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
        return;
      }
      const tip = tooltipRef.current;
      if (!tip) return;
      tip.style.display = "block";
      tip.style.left = `${Math.max(0, Math.min(w - 120, mx - 60))}px`;
      tip.style.top = "-50px";
      tip.innerHTML = `
        <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:8px 10px;white-space:nowrap;">
          <div style="color:#737373;font-size:11px;margin-bottom:4px;">${labels[idx]}</div>
          <div style="color:#f5f5f5;font-size:11px;"><span style="color:#ef4444;">●</span> Visitas: ${data.visits[idx] || 0}</div>
          <div style="color:#f5f5f5;font-size:11px;"><span style="color:#22c55e;">●</span> WhatsApp: ${data.whatsapp[idx] || 0}</div>
          <div style="color:#f5f5f5;font-size:11px;"><span style="color:#6366f1;">●</span> Búsquedas: ${data.searches[idx] || 0}</div>
        </div>
      `;
    };
    const onLeave = () => {
      if (tooltipRef.current) tooltipRef.current.style.display = "none";
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    return () => {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
    }, [data, chartLabels]);

  return (
    <div ref={containerRef} style={{ position: "relative", height: "180px" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "180px" }} />
      <div ref={tooltipRef} style={{ display: "none", position: "absolute", pointerEvents: "none", zIndex: 10 }} />
    </div>
  );
}

export function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topProducts, setTopProducts] = useState<PerformanceItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [range, setRange] = useState<"week" | "month" | "all">("week");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    Promise.all([
      getStats(token, range),
      getRendimiento(token),
    ])
      .then(([statsRes, perfRes]) => {
        setStats(statsRes.data);
        setTopProducts((perfRes.data.most_viewed || []).slice(0, 5));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-6 border-2 border-hype/40 border-t-hype rounded-full animate-spin" />
      </div>
    );
  }

  const ps = stats?.product_stats;
  const pa = stats?.page_activity;
  const paPrev = stats?.page_activity_previous;
  const psPrev = stats?.product_stats_previous;
  const dayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const defaultLabels = (() => {
    const today = new Date();
    const arr: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      arr.push(dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1]);
    }
    return arr;
  })();
  const rawDaily = stats?.page_activity_daily;
  const daily = {
    visits: rawDaily?.visits ?? [0, 0, 0, 0, 0, 0, 0],
    whatsapp: rawDaily?.whatsapp ?? [0, 0, 0, 0, 0, 0, 0],
    searches: rawDaily?.searches ?? [0, 0, 0, 0, 0, 0, 0],
    labels: rawDaily?.labels ?? defaultLabels,
  };
  const alertItems: string[] = [];
  if (ps?.out_of_stock) alertItems.push(`${ps.out_of_stock} publicados sin stock`);

  const today = new Date();
  const dateStr = today.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace(".", "").replace(",", "");

  return (
    <>
      <div className="flex flex-col gap-[11px]">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">
            <AlertCircle size={14} className="text-destructive shrink-0" />
            <span className="font-1 text-[11px] text-destructive">{error}</span>
          </div>
        )}

        {/* Header */}
        <div>
          <div className="font-1 font-black text-base sm:text-lg lg:text-[15px] tracking-wide text-foreground leading-none">DASHBOARD</div>
          <div className="font-2 text-[12px] sm:text-[13px] lg:text-[10px] text-muted-foreground/50 mt-[3px]">{dateStr} · Actualizado hace 5 min</div>
        </div>

        {/* Alert banner */}
        {alertItems.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle size={13} className="text-destructive shrink-0" />
            <div className="text-[12px] sm:text-[13px] lg:text-[10px] text-destructive/80 flex-1 font-3">
              {alertItems.join(" · ")}
            </div>
            <button
              onClick={() => navigate("/products")}
              className="text-[12px] sm:text-[13px] lg:text-[9px] text-hype font-1 font-bold bg-none border border-hype/30 rounded-md px-3 py-[6px] lg:px-2 lg:py-[3px] cursor-pointer shrink-0 whitespace-nowrap hover:bg-hype/5 min-h-[44px] lg:min-h-0"
            >
              Resolver →
            </button>
          </div>
        )}

        {/* Product section title */}
        <div>
          <div className="font-1 font-bold text-[11px] sm:text-[12px] lg:text-[9px] tracking-widest text-muted-foreground mb-[7px] flex items-center gap-[5px]">
            <Package size={10} />
            PRODUCTOS
          </div>

          {/* Product cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[7px]">
            {/* TOTAL */}
            <div className="bg-card border border-white/8 rounded-xl px-3 py-[11px]">
              <div className="flex items-center justify-between mb-[4px]">
                <div className="font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] tracking-widest text-muted-foreground">TOTAL</div>
                {(() => { const b = diffBadge(ps?.total ?? 0, psPrev?.total); return b ? <span className={`font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] whitespace-nowrap ${b.up ? "text-[#22c55e] bg-[rgba(34,197,94,.1)]" : "text-[#ef4444] bg-[rgba(239,68,68,.1)]"} px-[6px] py-[2px] rounded-[10px]`}>{b.diff > 0 ? "+" : ""}{b.diff} sem.</span> : null; })()}
              </div>
              <div className="font-1 font-black text-[26px] sm:text-[32px] lg:text-[26px] text-muted-foreground leading-none mb-[2px]">{ps?.total ?? 0}</div>
              <div className="font-3 text-[11px] sm:text-[12px] lg:text-[9px] text-muted-foreground/50">en catálogo</div>
            </div>
            {/* ACTIVOS */}
            <div className="bg-card border border-white/8 rounded-xl px-3 py-[11px]">
              <div className="flex items-center justify-between mb-[4px]">
                <div className="font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] tracking-widest text-muted-foreground">ACTIVOS</div>
                {(() => { const b = diffBadge(ps?.active ?? 0, psPrev?.active); return b ? <span className={`font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] whitespace-nowrap ${b.up ? "text-[#22c55e] bg-[rgba(34,197,94,.1)]" : "text-[#ef4444] bg-[rgba(239,68,68,.1)]"} px-[6px] py-[2px] rounded-[10px]`}>{b.diff > 0 ? "+" : ""}{b.diff} sem.</span> : null; })()}
              </div>
              <div className="font-1 font-black text-[26px] sm:text-[32px] lg:text-[26px] text-[#22c55e] leading-none mb-[2px]">{ps?.active ?? 0}</div>
              <div className="font-3 text-[11px] sm:text-[12px] lg:text-[9px] text-muted-foreground/50">publicados</div>
            </div>
            {/* SIN STOCK */}
            <div className="bg-card border border-white/8 rounded-xl px-3 py-[11px]">
              <div className="flex items-center justify-between mb-[4px]">
                <div className="font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] tracking-widest text-muted-foreground">SIN STOCK</div>
                {(() => { const b = diffBadge(ps?.out_of_stock ?? 0, psPrev?.out_of_stock, true); return b ? <span className={`font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] whitespace-nowrap ${b.up ? "text-[#22c55e] bg-[rgba(34,197,94,.1)]" : "text-[#ef4444] bg-[rgba(239,68,68,.1)]"} px-[6px] py-[2px] rounded-[10px]`}>{b.diff > 0 ? "+" : ""}{b.diff} sem.</span> : null; })()}
              </div>
              <div className="font-1 font-black text-[26px] sm:text-[32px] lg:text-[26px] text-destructive leading-none mb-[2px]">{ps?.out_of_stock ?? 0}</div>
              <div className="font-3 text-[11px] sm:text-[12px] lg:text-[9px] text-muted-foreground/50">sin inventario</div>
            </div>
            {/* INCOMPLETOS */}
            <div className="bg-card border border-white/8 rounded-xl px-3 py-[11px]">
              <div className="flex items-center justify-between mb-[4px]">
                <div className="font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] tracking-widest text-muted-foreground">INCOMPLETOS</div>
                {(() => { const b = diffBadge(ps?.incomplete ?? 0, psPrev?.incomplete, true); return b ? <span className={`font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] whitespace-nowrap ${b.up ? "text-[#22c55e] bg-[rgba(34,197,94,.1)]" : "text-[#ef4444] bg-[rgba(239,68,68,.1)]"} px-[6px] py-[2px] rounded-[10px]`}>{b.diff > 0 ? "+" : ""}{b.diff} sem.</span> : null; })()}
              </div>
              <div className="font-1 font-black text-[26px] sm:text-[32px] lg:text-[26px] text-[#f59e0b] leading-none mb-[2px]">{ps?.incomplete ?? 0}</div>
              <div className="font-3 text-[11px] sm:text-[12px] lg:text-[9px] text-muted-foreground/50">sin img. o desc.</div>
            </div>
          </div>
        </div>

        {/* Activity section title */}
        <div>
          <div className="font-1 font-bold text-[11px] sm:text-[12px] lg:text-[9px] tracking-widest text-muted-foreground mb-[7px] flex items-center gap-[5px]">
            <Activity size={10} />
            ACTIVIDAD — {range === "week" ? "ÚLTIMOS 7 DÍAS" : range === "month" ? "ÚLTIMOS 30 DÍAS" : "ÚLTIMOS 12 MESES"}
          </div>

          {/* Activity cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-[7px]">
            <div className="bg-card border border-white/8 rounded-xl px-3 py-[11px]">
              <div className="flex items-center justify-between mb-[3px]">
                <div className="font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] tracking-widest text-muted-foreground whitespace-nowrap">VISITAS</div>
                {(() => { const b = changeBadge(pa?.unique_visits ?? 0, paPrev?.unique_visits); return b ? <span className={`font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] whitespace-nowrap ${b.up ? "text-[#22c55e] bg-[rgba(34,197,94,.1)]" : "text-[#ef4444] bg-[rgba(239,68,68,.1)]"} px-[6px] py-[2px] rounded-[10px]`}>{b.up ? "↑" : "↓"}{b.pct !== null ? ` ${Math.abs(b.pct)}%` : " NUEVO"}</span> : null; })()}
              </div>
              <div className="font-1 font-black text-[26px] text-foreground leading-none mb-[4px]">{pa?.unique_visits ?? 0}</div>
              <Sparkline data={daily.visits} color="#ef4444" />
            </div>
            <div className="bg-card border border-white/8 rounded-xl px-3 py-[11px]">
              <div className="flex items-center justify-between mb-[3px]">
                <div className="font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] tracking-widest text-muted-foreground whitespace-nowrap">CLICS WSP</div>
                {(() => { const b = changeBadge(pa?.whatsapp_clicks ?? 0, paPrev?.whatsapp_clicks); return b ? <span className={`font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] whitespace-nowrap ${b.up ? "text-[#22c55e] bg-[rgba(34,197,94,.1)]" : "text-[#ef4444] bg-[rgba(239,68,68,.1)]"} px-[6px] py-[2px] rounded-[10px]`}>{b.up ? "↑" : "↓"}{b.pct !== null ? ` ${Math.abs(b.pct)}%` : " NUEVO"}</span> : null; })()}
              </div>
              <div className="font-1 font-black text-[26px] text-foreground leading-none mb-[4px]">{pa?.whatsapp_clicks ?? 0}</div>
              <Sparkline data={daily.whatsapp} color="#22c55e" />
            </div>
            <div className="col-span-2 md:col-span-1 bg-card border border-white/8 rounded-xl px-3 py-[11px]">
              <div className="flex items-center justify-between mb-[3px]">
                <div className="font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] tracking-widest text-muted-foreground whitespace-nowrap">BÚSQUEDAS</div>
                {(() => { const b = changeBadge(pa?.searches ?? 0, paPrev?.searches); return b ? <span className={`font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] whitespace-nowrap ${b.up ? "text-[#22c55e] bg-[rgba(34,197,94,.1)]" : "text-[#ef4444] bg-[rgba(239,68,68,.1)]"} px-[6px] py-[2px] rounded-[10px]`}>{b.up ? "↑" : "↓"}{b.pct !== null ? ` ${Math.abs(b.pct)}%` : " NUEVO"}</span> : null; })()}
              </div>
              <div className="font-1 font-black text-[26px] text-foreground leading-none mb-[4px]">{pa?.searches ?? 0}</div>
              <Sparkline data={daily.searches} color="#6366f1" />
            </div>
          </div>
        </div>

        {/* Traffic chart + Activity feed */}
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-[9px]">
          {/* Traffic chart */}
          <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[13px]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[7px] mb-[9px]">
              <div className="font-1 font-bold text-[12px] sm:text-[13px] lg:text-[10px] tracking-wider text-muted-foreground">
                TRÁFICO {range === "week" ? "SEMANAL" : range === "month" ? "MENSUAL" : "GENERAL"}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[7px]">
                <TimeRangeFilter value={range} onChange={setRange} />
                <div className="flex flex-wrap gap-[9px]">
                  <span className="font-1 text-[11px] sm:text-[12px] lg:text-[9px] text-muted-foreground flex items-center gap-[3px] shrink-0">
                    <span className="inline-block w-[10px] h-[2px]" style={{ background: "#ef4444" }} />
                    Visitas
                  </span>
                  <span className="font-1 text-[11px] sm:text-[12px] lg:text-[9px] text-muted-foreground flex items-center gap-[3px] shrink-0">
                    <span className="inline-block w-[10px] h-[2px]" style={{ background: "#22c55e" }} />
                    WhatsApp
                  </span>
                  <span className="font-1 text-[11px] sm:text-[12px] lg:text-[9px] text-muted-foreground flex items-center gap-[3px] shrink-0">
                    <span className="inline-block w-[10px] h-[2px]" style={{ background: "#6366f1" }} />
                    Búsquedas
                  </span>
                </div>
              </div>
            </div>
            <TrafficChart data={daily} labels={daily.labels} />
            <div className="flex items-center justify-center gap-[16px] mt-[9px] pt-[7px] border-t border-white/[0.07]">
              <span className="font-3 text-[10px] text-muted-foreground flex items-center gap-[4px]">
                <span style={{ color: "#ef4444" }}>●</span>{" "}
                <span className="font-1 font-bold text-foreground">{(pa?.unique_visits ?? 0).toLocaleString("es-CL")}</span> visitas
              </span>
              <span className="font-3 text-[10px] text-muted-foreground flex items-center gap-[4px]">
                <span style={{ color: "#22c55e" }}>●</span>{" "}
                <span className="font-1 font-bold text-foreground">{(daily.whatsapp || []).reduce((a, b) => a + b, 0).toLocaleString("es-CL")}</span> clics
              </span>
              <span className="font-3 text-[10px] text-muted-foreground flex items-center gap-[4px]">
                <span style={{ color: "#6366f1" }}>●</span>{" "}
                <span className="font-1 font-bold text-foreground">{(daily.searches || []).reduce((a, b) => a + b, 0).toLocaleString("es-CL")}</span> búsquedas
              </span>
            </div>
          </div>

          {/* Activity feed */}
          <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[13px]">
            <div className="font-1 font-bold text-[12px] sm:text-[13px] lg:text-[10px] tracking-wider text-muted-foreground mb-[9px]">ACTIVIDAD RECIENTE</div>
            <div className="flex flex-col gap-[7px]">
                {stats?.recent_activity && stats.recent_activity.length > 0 ? (
                stats.recent_activity.slice(0, 5).map((entry) => {
                  const Icon = actionIcon(entry.action);
                  return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 pb-[7px] border-b border-white/[0.07]"
                  >
                    <div className="size-[22px] rounded-md flex items-center justify-center shrink-0" style={{ background: activityBg(entry.action) }}>
                      <span style={{ fontSize: "11px", color: trafficColor(entry.action) }}>
                        <Icon size={11} />
                      </span>
                    </div>
                    <div>
                      <div className="font-3 text-[12px] sm:text-[13px] lg:text-[10px] text-foreground/80">{actionText(entry.action, entry.entity_name)}</div>
                      <div className="font-2 text-[11px] sm:text-[12px] lg:text-[9px] text-muted-foreground/50 mt-[1px]">{relativeTime(entry.created_at)}</div>
                    </div>
                  </div>
                );
              })) : (
                <div className="font-2 text-[10px] text-muted-foreground text-center py-3">Sin cambios registrados</div>
              )}
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-[7px] w-full font-1 font-bold text-[11px] sm:text-[12px] lg:text-[9px] text-muted-foreground bg-none border border-white/8 rounded-md min-h-[44px] py-2 cursor-pointer text-center hover:bg-white/5"
            >
              Ver historial completo
            </button>
          </div>
        </div>

        {/* Top products */}
        <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[13px]">
          <div className="flex items-center justify-between mb-[9px]">
            <div className="font-3 font-bold text-[11px] sm:text-[12px] lg:text-[10px] tracking-wider text-muted-foreground truncate min-w-0">TOP PRODUCTOS — 7 DÍAS</div>
            <button
              onClick={() => navigate("/rendimiento")}
              className="text-[12px] sm:text-[13px] lg:text-[9px] text-hype font-1 font-bold bg-none border border-hype/30 rounded-md min-h-[44px] px-3 py-[6px] lg:px-2 lg:py-[3px] cursor-pointer hover:bg-hype/5"
            >
              Ver todos →
            </button>
          </div>

          {topProducts.length > 0 ? (
            <div className="overflow-x-auto -mx-3 md:mx-0">
            <div className="min-w-0 sm:min-w-[440px]">
              {/* Header */}
              <div className="grid grid-cols-[1fr_44px_36px_68px] sm:grid-cols-[1fr_44px_36px_55px_68px] gap-[7px] px-[7px] py-1 font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] tracking-widest text-muted-foreground mb-[2px]">
                <span>PRODUCTO</span>
                <span className="text-center">VISTAS</span>
                <span className="text-center">WSP</span>
                <span className="text-right hidden sm:grid">PRECIO</span>
                <span className="text-center">ESTADO</span>
              </div>
              {/* Rows */}
              {topProducts.map((item) => (
                <div
                  key={item.product_id}
                  className="grid grid-cols-[1fr_44px_36px_68px] sm:grid-cols-[1fr_44px_36px_55px_68px] gap-[7px] px-[7px] py-[7px] rounded-[7px] border-b border-white/[0.07] items-center"
                  style={{ background: item.out_of_stock ? "rgba(239,68,68,.02)" : "transparent" }}
                >
                  <div className="flex items-center gap-[7px] min-w-0">
                    <div className="size-6 rounded-md bg-[#1e1e1e] flex items-center justify-center shrink-0">
                      {item.primary_image ? (
                        <img src={item.primary_image} alt="" className="size-full object-cover rounded-md" />
                      ) : (
                        <Package size={11} color="#444" />
                      )}
                    </div>
                    <span className="font-3 text-[10px] truncate" style={{ color: item.out_of_stock ? "#666" : "#e0e0e0" }}>
                      {item.name}
                    </span>
                  </div>
                  <div className="text-center font-1 font-bold text-[12px]" style={{ color: item.out_of_stock ? "#666" : "#f5f5f5" }}>{item.views}</div>
                  <div className="text-center font-1 font-bold text-[12px]" style={{ color: item.out_of_stock ? "#555" : "#22c55e" }}>{item.whatsapp_clicks}</div>
                  <div className="text-right font-1 text-[10px] hidden sm:grid" style={{ color: item.out_of_stock ? "#555" : "#666" }}>
                    ${item.price.toLocaleString("es-CL")}
                  </div>
                  <div className="text-center">
                    <StatusBadge isActive={true} outOfStock={item.out_of_stock} incomplete={item.incomplete} />
                  </div>
                </div>
              ))}
            </div>
            </div>
          ) : (
            <div className="font-2 text-[10px] text-muted-foreground text-center py-3">Sin datos de rendimiento</div>
          )}
        </div>
      </div>

      {token && <ActivityModal open={modalOpen} onClose={() => setModalOpen(false)} token={token} />}
    </>
  );
}