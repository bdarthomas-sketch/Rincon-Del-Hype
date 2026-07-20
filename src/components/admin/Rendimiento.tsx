import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getRendimiento, type PerformanceItem } from "./api";
import { Eye, Package, AlertCircle, TrendingUp } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export function Rendimiento() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<PerformanceItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getRendimiento(token)
      .then((r) => setItems(r.data.most_viewed))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-6 border-2 border-hype/40 border-t-hype rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp size={18} className="text-hype/70" />
        <h1 className="font-1 text-lg tracking-[0.15em] uppercase">Rendimiento de Productos</h1>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">
          <AlertCircle size={14} className="text-destructive shrink-0" />
          <span className="font-1 text-[11px] text-destructive">{error}</span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[13px] text-center">
          <Eye size={20} className="text-muted-foreground/30 mx-auto mb-[7px]" />
          <p className="font-2 text-[10px] text-muted-foreground/70">Sin datos de rendimiento aún</p>
        </div>
      ) : (
        <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[13px]">
          <div className="overflow-x-auto -mx-3 md:mx-0">
            <div className="min-w-0 sm:min-w-[440px]">
              <div className="grid grid-cols-[1fr_44px_36px_68px] sm:grid-cols-[1fr_44px_36px_55px_68px] gap-[7px] px-[7px] py-1 font-1 font-bold text-[10px] sm:text-[11px] lg:text-[8px] tracking-widest text-muted-foreground mb-[2px]">
                <span>PRODUCTO</span>
                <span className="text-center">VISTAS</span>
                <span className="text-center">WSP</span>
                <span className="text-right hidden sm:grid">PRECIO</span>
                <span className="text-center">ESTADO</span>
              </div>
              {items.map((item) => (
                <div
                  key={item.product_id}
                  onClick={() => navigate(`/products/${item.product_id}`)}
                  className="grid grid-cols-[1fr_44px_36px_68px] sm:grid-cols-[1fr_44px_36px_55px_68px] gap-[7px] px-[7px] py-[7px] rounded-[7px] border-b border-white/[0.07] items-center cursor-pointer hover:bg-white/[0.03] transition-colors"
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
        </div>
      )}
    </div>
  );
}
