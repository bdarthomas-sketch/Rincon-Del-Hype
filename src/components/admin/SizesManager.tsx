import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  listSizes, createSize, updateSize, deleteSize,
  type Size,
} from "./api";
import { Plus, Pencil, Trash2, Check, X, AlertCircle, Ruler } from "lucide-react";

export function SizesManager() {
  const { token } = useAuth();
  const [sizes, setSizes] = useState<Size[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newForm, setNewForm] = useState(false);
  const [form, setForm] = useState({ label: "", sort_order: 0 });

  function load() {
    if (!token) return;
    setLoading(true);
    listSizes(token)
      .then((res) => setSizes(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load() }, [token]);

  function resetForm() {
    const nextOrder = sizes.length > 0 ? Math.max(...sizes.map((s) => s.sort_order)) + 1 : 0;
    setForm({ label: "", sort_order: nextOrder });
    setNewForm(false);
    setEditingId(null);
  }

  async function handleCreate() {
    if (!token) return;
    try {
      await createSize(token, form);
      resetForm();
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear");
    }
  }

  async function handleUpdate(id: string) {
    if (!token) return;
    try {
      await updateSize(token, id, form);
      resetForm();
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`¿Eliminar talle "${label}"?`)) return;
    if (!token) return;
    try {
      await deleteSize(token, id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  function startEdit(s: Size) {
    setForm({ label: s.label, sort_order: s.sort_order });
    setEditingId(s.id);
    setNewForm(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-[9px]">
        <div>
          <div className="font-1 font-black text-[15px] tracking-wide text-foreground leading-none">TALLES</div>
          <div className="font-2 text-[10px] text-muted-foreground/50 mt-[3px]">Administrar talles de productos</div>
        </div>
        <button
          onClick={() => { resetForm(); setNewForm(true); }}
          className="flex items-center gap-[5px] bg-hype text-white border-none px-[13px] py-[8px] rounded-xl font-1 font-bold text-[9px] tracking-wider cursor-pointer hover:bg-hype/90"
        >
          <Plus size={12} />
          NUEVO
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-[11px] py-[7px] mb-[7px]">
          <AlertCircle size={12} className="text-destructive shrink-0" />
          <span className="font-1 text-[10px] text-destructive">{error}</span>
        </div>
      )}

      {(newForm || editingId) && (
        <div className="bg-card border border-white/8 rounded-xl px-[11px] py-[11px] mb-[7px]">
          <div className="flex flex-col sm:flex-row gap-[7px] items-stretch sm:items-end">
            <div className="flex-1">
              <label className="font-1 font-bold text-[8px] tracking-widest text-muted-foreground block mb-[4px]">LABEL</label>
              <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Ej: M, L, 42, ONE SIZE" className="w-full rounded-lg bg-surface-1 border border-white/8 px-[9px] py-[6px] text-[11px] text-foreground outline-none focus:border-hype/60 transition-colors font-1" />
            </div>
            <div className="w-full sm:w-16">
              <label className="font-1 font-bold text-[8px] tracking-widest text-muted-foreground block mb-[4px]">ORDEN</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="w-full rounded-lg bg-surface-1 border border-white/8 px-[9px] py-[6px] text-[11px] text-foreground outline-none focus:border-hype/60 transition-colors font-1" />
            </div>
            <div className="flex gap-[7px] justify-end sm:justify-start">
              <button onClick={editingId ? () => handleUpdate(editingId) : handleCreate} className="rounded-xl bg-hype text-white px-[13px] py-[8px] font-1 font-bold text-[9px] tracking-wider hover:brightness-110 transition-all">
                <Check size={13} />
              </button>
              <button onClick={resetForm} className="rounded-xl bg-surface-1 border border-white/8 px-[11px] py-[8px] text-muted-foreground hover:text-foreground transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-6 border-2 border-hype/40 border-t-hype rounded-full animate-spin" />
        </div>
      ) : sizes.length === 0 ? (
        <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[13px] text-center">
          <Ruler size={24} className="text-muted-foreground/30 mx-auto mb-[7px]" />
          <p className="font-1 font-bold text-[10px] tracking-wider text-muted-foreground/70">No hay talles</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-card border border-white/8 rounded-xl px-2 sm:px-[13px] py-2 sm:py-[13px]">
          <table className="w-full sm:min-w-[220px] text-left">
            <thead>
              <tr className="font-1 text-[10px] sm:text-[11px] tracking-widest uppercase text-muted-foreground">
                <th className="px-0.5 sm:px-[10px] py-1 font-medium whitespace-nowrap">Label</th>
                <th className="px-0.5 sm:px-[10px] py-1 font-medium hidden sm:table-cell text-center whitespace-nowrap">Ord.</th>
                <th className="px-0.5 sm:px-[10px] py-1 font-medium text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {sizes.map((s) => (
                <tr key={s.id} className="hover:bg-white/[0.03] transition-colors font-1 text-[12px] sm:text-[13px] group">
                  <td className="px-0.5 sm:px-[10px] py-[8px]">
                    <span className="font-3 font-bold text-foreground">{s.label}</span>
                  </td>
                  <td className="px-0.5 sm:px-[10px] py-[8px] text-center hidden sm:table-cell">
                    <span className="text-[11px] text-muted-foreground">{s.sort_order}</span>
                  </td>
                  <td className="px-0.5 sm:px-[10px] py-[8px] text-right">
                    <div className="flex items-center justify-end gap-0 sm:gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(s)} className="min-w-[28px] min-h-[28px] sm:min-w-[44px] sm:min-h-[44px] inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors shrink-0" title="Editar">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(s.id, s.label)} className="min-w-[28px] min-h-[28px] sm:min-w-[44px] sm:min-h-[44px] inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0" title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
