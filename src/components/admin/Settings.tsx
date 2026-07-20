import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { getSettings, updateSetting, listAdmins, createAdmin, deleteAdmin, resetAnalytics, clearActivity } from "./api";
import { Save, AlertCircle, Plus, Trash2, Settings2, Users, RotateCcw, Tags } from "lucide-react";

export function Settings() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<"store" | "admins">("store");
  const [storeInfo, setStoreInfo] = useState({
    whatsapp: "", instagram: "", tiktok: "", x: "", youtube: "",
  });
  const [outOfStockLabel, setOutOfStockLabel] = useState({ text: "¡Sin stock!" });
  const [admins, setAdmins] = useState<{ id: string; email: string; role: string; created_at: string }[]>([]);
  const [newAdmin, setNewAdmin] = useState({ email: "", role: "admin" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const isSuperAdmin = user?.role === "superadmin";

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      getSettings(token).then((r) => {
        if (r.data.store_info) {
          setStoreInfo((prev) => ({ ...prev, ...r.data.store_info as any }));
        }
        if (r.data.out_of_stock_label?.text) {
          setOutOfStockLabel({ text: r.data.out_of_stock_label.text });
        }
      }),
      isSuperAdmin ? listAdmins(token).then((r) => setAdmins(r.data)) : Promise.resolve(),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const tabs = [
    { id: "store" as const, label: "Tienda", icon: Settings2 },
    ...(isSuperAdmin ? [{ id: "admins" as const, label: "Usuarios", icon: Users }] : []),
  ];

  async function handleCreateAdmin() {
    if (!token || !newAdmin.email) return;
    setError("");
    setBusy(true);
    try {
      await createAdmin(token, newAdmin.email, newAdmin.role);
      setNewAdmin({ email: "", role: "admin" });
      const r = await listAdmins(token);
      setAdmins(r.data);
      setSuccess("Admin creado");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAdmin(id: string, email: string) {
    if (!token || !confirm(`¿Eliminar admin "${email}"?`)) return;
    setError("");
    try {
      await deleteAdmin(token, id);
      setAdmins((prev) => prev.filter((a) => a.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-6 border-2 border-hype/40 border-t-hype rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[11px]">
      {/* Header */}
      <div>
        <div className="font-1 font-black text-[15px] tracking-wide text-foreground leading-none">CONFIGURACIÓN</div>
        <div className="font-2 text-[10px] text-muted-foreground/50 mt-[3px]">Ajustes de la tienda y administradores</div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-[11px] py-[7px]">
          <AlertCircle size={12} className="text-destructive shrink-0" />
          <span className="font-1 text-[10px] text-destructive">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/30 px-[11px] py-[7px]">
          <span className="font-1 text-[10px] text-green-500">{success}</span>
        </div>
      )}

      <div className="flex gap-1 p-[3px] rounded-lg bg-surface-2 border border-white/8 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-[5px] px-[13px] py-[7px] rounded-lg font-1 font-bold text-[9px] tracking-wider transition-colors ${
              tab === t.id
                ? "bg-hype text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon size={11} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "store" && (
        <div className="max-w-xl flex flex-col gap-[11px]">
          <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[13px]">
            <div className="font-1 font-bold text-[9px] tracking-widest text-muted-foreground mb-[7px] flex items-center gap-[5px]">
              <Settings2 size={10} />
              INFORMACIÓN DE LA TIENDA
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[7px]">
              {(["whatsapp", "instagram", "tiktok", "x", "youtube"] as const).map((field) => (
                <div key={field}>
                  <label className="font-1 font-bold text-[8px] tracking-widest text-muted-foreground block mb-[4px]">
                    {field === "x" ? "X (TWITTER)" : field.toUpperCase()}
                  </label>
                  <input
                    value={storeInfo[field]}
                    onChange={(e) => setStoreInfo((prev) => ({ ...prev, [field]: e.target.value }))}
                    className="w-full rounded-lg bg-surface-1 border border-white/8 px-[9px] py-[6px] text-[11px] text-foreground outline-none focus:border-hype/60 transition-colors font-1"
                    placeholder={field === "whatsapp" ? "541136660741" : ""}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[13px]">
            <div className="font-1 font-bold text-[9px] tracking-widest text-muted-foreground mb-[7px] flex items-center gap-[5px]">
              <Tags size={10} />
              ETIQUETA SIN STOCK
            </div>
            <input
              value={outOfStockLabel.text}
              onChange={(e) => setOutOfStockLabel({ text: e.target.value })}
              className="w-full rounded-lg bg-surface-1 border border-white/8 px-[9px] py-[6px] text-[11px] text-foreground outline-none focus:border-hype/60 transition-colors font-1"
              placeholder="¡Sin stock!"
            />
          </div>

          <button
            onClick={async () => {
              if (!token) return;
              setError("");
              setSuccess("");
              setBusy(true);
              try {
                await Promise.all([
                  updateSetting(token, "out_of_stock_label", outOfStockLabel as any),
                  updateSetting(token, "store_info", storeInfo as any),
                ]);
                setSuccess("Configuración guardada");
                setTimeout(() => setSuccess(""), 3000);
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Error al guardar");
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="flex items-center gap-[5px] bg-hype text-white border-none px-[15px] py-[9px] rounded-xl font-1 font-bold text-[9px] tracking-wider cursor-pointer hover:bg-hype/90 w-fit disabled:opacity-50"
          >
            {busy ? (
              <div className="size-[14px] border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={13} />
            )}
            GUARDAR
          </button>

          <div className="bg-card border border-destructive/30 rounded-xl px-[13px] py-[13px]">
            <div className="font-1 font-bold text-[9px] tracking-widest text-destructive mb-[7px] flex items-center gap-[5px]">
              <RotateCcw size={10} />
              RESETEAR ACTIVIDAD
            </div>
            <p className="font-2 text-[10px] text-muted-foreground/70 mb-[7px]">
              Esto eliminará todos los datos de analytics (visitas, productos vistos, clics de WhatsApp, búsquedas).
              Esta acción no se puede deshacer.
            </p>
            <button
              onClick={async () => {
                if (!token || !confirm("¿Estás seguro? Se eliminarán TODOS los datos de analytics.")) return;
                if (!confirm("Última chance: ¿realmente quieres resetear todas las estadísticas?")) return;
                setError("");
                setSuccess("");
                try {
                  await resetAnalytics(token);
                  setSuccess("Analytics reseteado correctamente");
                  setTimeout(() => setSuccess(""), 3000);
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : "Error al resetear analytics");
                }
              }}
              className="flex items-center gap-[5px] bg-destructive text-white border-none px-[15px] py-[9px] rounded-xl font-1 font-bold text-[9px] tracking-wider cursor-pointer hover:brightness-110 transition-all"
            >
              <RotateCcw size={12} />
              RESETEAR ANALYTICS
            </button>
          </div>

          <div className="bg-card border border-destructive/30 rounded-xl px-[13px] py-[13px]">
            <div className="font-1 font-bold text-[9px] tracking-widest text-destructive mb-[7px] flex items-center gap-[5px]">
              <Trash2 size={10} />
              LIMPIAR HISTORIAL
            </div>
            <p className="font-2 text-[10px] text-muted-foreground/70 mb-[7px]">
              Esto eliminará todo el registro de actividad reciente (cambios en productos, marcas, etc.).
              Esta acción no se puede deshacer.
            </p>
            <button
              onClick={async () => {
                if (!token || !confirm("¿Estás seguro? Se eliminará TODO el historial de actividad.")) return;
                if (!confirm("Última chance: ¿realmente quieres limpiar el historial completo?")) return;
                setError("");
                setSuccess("");
                try {
                  await clearActivity(token);
                  setSuccess("Historial limpiado correctamente");
                  setTimeout(() => setSuccess(""), 3000);
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : "Error al limpiar historial");
                }
              }}
              className="flex items-center gap-[5px] bg-destructive text-white border-none px-[15px] py-[9px] rounded-xl font-1 font-bold text-[9px] tracking-wider cursor-pointer hover:brightness-110 transition-all"
            >
              <Trash2 size={12} />
              LIMPIAR HISTORIAL
            </button>
          </div>
        </div>
      )}

      {tab === "admins" && isSuperAdmin && (
        <div className="max-w-xl flex flex-col gap-[11px]">
          <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[13px]">
            <div className="font-1 font-bold text-[9px] tracking-widest text-muted-foreground mb-[7px] flex items-center gap-[5px]">
              <Users size={10} />
              NUEVO ADMIN
            </div>
            <div className="flex gap-[7px]">
              <input
                value={newAdmin.email}
                onChange={(e) => setNewAdmin((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email del nuevo admin"
                className="flex-1 rounded-lg bg-surface-1 border border-white/8 px-[9px] py-[6px] text-[11px] text-foreground outline-none focus:border-hype/60 transition-colors font-1"
              />
              <select
                value={newAdmin.role}
                onChange={(e) => setNewAdmin((prev) => ({ ...prev, role: e.target.value }))}
                className="rounded-lg bg-surface-1 border border-white/8 px-[9px] py-[6px] text-[11px] text-foreground outline-none focus:border-hype/60 transition-colors font-1"
              >
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
              <button
                onClick={handleCreateAdmin}
                disabled={busy || !newAdmin.email}
                className="flex items-center gap-[5px] bg-hype text-white border-none px-[13px] py-[8px] rounded-xl font-1 font-bold text-[9px] tracking-wider cursor-pointer hover:bg-hype/90 disabled:opacity-50"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[13px]">
            <div className="font-1 font-bold text-[9px] tracking-widest text-muted-foreground mb-[7px] flex items-center gap-[5px]">
              <Users size={10} />
              ADMINISTRADORES
            </div>
            <div className="overflow-x-auto">
            <div className="grid gap-[7px] min-w-[340px]">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_90px_36px] gap-[7px] px-[7px] py-1 font-1 font-bold text-[8px] tracking-widest text-muted-foreground">
                <span>EMAIL</span>
                <span>ROL</span>
                <span>CREADO</span>
                <span className="text-right">AC.</span>
              </div>
              {/* Rows */}
              {admins.map((a) => (
                <div key={a.id} className="grid grid-cols-[1fr_80px_90px_36px] gap-[7px] px-[7px] py-[7px] rounded-[7px] border-b border-white/[0.07] items-center">
                  <span className="font-1 text-[10px] text-foreground truncate">{a.email}</span>
                  <span className={`px-[5px] py-[1px] rounded-full font-1 font-bold text-[8px] tracking-wider w-fit ${
                    a.role === "superadmin" ? "bg-hype/15 text-hype" : "bg-white/[0.06] text-muted-foreground"
                  }`}>
                    {a.role}
                  </span>
                  <span className="font-2 text-[9px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center justify-end">
                    <button onClick={() => handleDeleteAdmin(a.id, a.email)} className="p-[5px] rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
