import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { getActivityPage, type ActivityEntry } from "./api";
import {
  actionText, relativeTime, actionIcon,
  activityBg, trafficColor,
  ACTION_OPTIONS, ENTITY_OPTIONS,
} from "./activityHelpers";

interface ActivityModalProps {
  open: boolean;
  onClose: () => void;
  token: string;
}

const PER_PAGE = 20;

export function ActivityModal({ open, onClose, token }: ActivityModalProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getActivityPage(token, {
        page,
        per_page: PER_PAGE,
        action: actionFilter || undefined,
        entity: entityFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setEntries(res.data);
      setTotal(res.count);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, actionFilter, entityFilter, fromDate, toDate]);

  useEffect(() => {
    if (open) fetchPage();
  }, [open, fetchPage]);

  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.position = "fixed";
      document.documentElement.style.top = `-${scrollY}px`;
      document.documentElement.style.width = "100%";
    }
    return () => {
      const top = parseFloat(document.documentElement.style.top || "0");
      document.documentElement.style.overflow = "";
      document.documentElement.style.position = "";
      document.documentElement.style.top = "";
      document.documentElement.style.width = "";
      window.scrollTo(0, -top);
    };
  }, [open]);

  useEffect(() => {
    setPage(1);
  }, [actionFilter, entityFilter, fromDate, toDate]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-card border border-white/8 rounded-xl shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-[13px] pt-[13px]">
          <div className="font-3 font-bold text-[10px] tracking-wider text-muted-foreground">HISTORIAL</div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 px-[13px] pt-[9px] pb-[9px]">
          <label className="flex flex-col gap-1">
            <span className="font-3 text-[10px] tracking-[0.1em] uppercase text-muted-foreground">Acción</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 font-3 text-[11px] text-foreground tracking-[0.05em] outline-none focus:border-hype/50"
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-3 text-[10px] tracking-[0.1em] uppercase text-muted-foreground">Entidad</span>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 font-3 text-[11px] text-foreground tracking-[0.05em] outline-none focus:border-hype/50"
            >
              {ENTITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-3 text-[10px] tracking-[0.1em] uppercase text-muted-foreground">Desde</span>
            <span className="flex items-center gap-1.5 bg-surface-2 border border-border rounded-lg px-3 py-1.5 cursor-text focus-within:border-hype/50">
              <Calendar size={13} className="text-muted-foreground shrink-0" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent font-sans text-[11px] text-foreground tracking-[0.05em] outline-none w-full [color-scheme:dark]"
              />
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-3 text-[10px] tracking-[0.1em] uppercase text-muted-foreground">Hasta</span>
            <span className="flex items-center gap-1.5 bg-surface-2 border border-border rounded-lg px-3 py-1.5 cursor-text focus-within:border-hype/50">
              <Calendar size={13} className="text-muted-foreground shrink-0" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent font-sans text-[11px] text-foreground tracking-[0.05em] outline-none w-full [color-scheme:dark]"
              />
            </span>
          </label>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-[13px] min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="size-5 border-2 border-hype/40 border-t-hype rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="font-1 text-[11px] text-muted-foreground text-center py-16">
              Sin resultados
            </p>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {entries.map((entry) => {
                const Icon = actionIcon(entry.action);
                const isExpanded = expandedId === entry.id;
                return (
                  <div key={entry.id}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="w-full flex items-center gap-3 pb-[10px] border-b border-white/[0.07] text-left"
                    >
                      <div
                        className="size-[28px] rounded-md flex items-center justify-center shrink-0"
                        style={{ background: activityBg(entry.action) }}
                      >
                        <span style={{ fontSize: "13px", color: trafficColor(entry.action) }}>
                          <Icon size={13} />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-3 text-[13px] text-foreground/80 truncate">
                          {actionText(entry.action, entry.entity_name)}
                        </div>
                        <div className="font-2 text-[11px] text-muted-foreground/50 mt-[2px]">
                          {relativeTime(entry.created_at)}
                        </div>
                      </div>
                      {entry.details && (
                        isExpanded ? <ChevronUp size={14} className="text-muted-foreground/40 shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground/40 shrink-0" />
                      )}
                    </button>
                    {isExpanded && entry.details && (
                      <div className="mb-[10px] ml-[36px] px-3 py-2 rounded-lg bg-white/[0.04] border border-border/50">
                        <pre className="font-1 text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-[13px] py-[7px] border-t border-white/[0.07]">
          <span className="font-1 text-[10px] text-muted-foreground">
            {total} registro{total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-30 disabled:pointer-events-none text-muted-foreground"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-1 text-[11px] text-foreground tabular-nums min-w-[6ch] text-center">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-30 disabled:pointer-events-none text-muted-foreground"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
