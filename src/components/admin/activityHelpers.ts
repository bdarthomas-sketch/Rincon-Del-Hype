import {
  Plus, Edit3, Archive, Copy, ToggleLeft, DollarSign,
  Star, ShoppingCart, Package, RefreshCw, Activity,
  type LucideIcon,
} from "lucide-react";

export function actionText(action: string, entityName: string | null): string {
  const name = entityName || `[${action}]`;
  switch (action) {
    case "created":        return `Se agregó "${name}"`;
    case "updated":        return `Se editó "${name}"`;
    case "deleted":        return `Se eliminó "${name}"`;
    case "duplicated":     return `Se duplicó "${name}"`;
    case "activated":      return `Se activó "${name}"`;
    case "deactivated":    return `Se desactivó "${name}"`;
    case "price_changed":  return `Cambió precio de "${name}"`;
    case "featured":       return `Se destacó "${name}"`;
    case "unfeatured":     return `Se quitó destacado de "${name}"`;
    case "sold":           return `Se vendió "${name}"`;
    case "stock_updated":  return `Se actualizó stock de "${name}"`;
    case "restored":       return `Se restauró "${name}"`;
    default:               return `${action} "${name}"`;
  }
}

export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

export function actionIcon(action: string): LucideIcon {
  switch (action) {
    case "created":        return Plus;
    case "updated":        return Edit3;
    case "deleted":        return Archive;
    case "duplicated":     return Copy;
    case "activated":      return ToggleLeft;
    case "deactivated":    return ToggleLeft;
    case "price_changed":  return DollarSign;
    case "featured":       return Star;
    case "unfeatured":     return Star;
    case "sold":           return ShoppingCart;
    case "stock_updated":  return Package;
    case "restored":       return RefreshCw;
    default:               return Activity;
  }
}

export function actionColor(action: string): string {
  switch (action) {
    case "created":        return "text-green-500";
    case "updated":        return "text-blue-400";
    case "deleted":        return "text-red-500";
    case "duplicated":     return "text-blue-500";
    case "activated":      return "text-purple-400";
    case "deactivated":    return "text-purple-400";
    case "price_changed":  return "text-cyan-400";
    case "featured":       return "text-amber-400";
    case "unfeatured":     return "text-amber-400";
    case "sold":           return "text-green-400";
    case "stock_updated":  return "text-amber-500";
    case "restored":       return "text-blue-300";
    default:               return "text-muted-foreground";
  }
}

export const ACTION_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "created", label: "Creados" },
  { value: "updated", label: "Editados" },
  { value: "deleted", label: "Eliminados" },
  { value: "duplicated", label: "Duplicados" },
  { value: "activated", label: "Activados" },
  { value: "deactivated", label: "Desactivados" },
  { value: "price_changed", label: "Cambio de precio" },
  { value: "featured", label: "Destacados" },
  { value: "unfeatured", label: "Quitado destacado" },
  { value: "sold", label: "Vendidos" },
  { value: "stock_updated", label: "Stock actualizado" },
  { value: "restored", label: "Restaurados" },
];

export function activityBg(action: string): string {
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

export function trafficColor(action: string): string {
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

export const ENTITY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "product", label: "Productos" },
  { value: "category", label: "Categorías" },
  { value: "size", label: "Tallas" },
  { value: "image", label: "Imágenes" },
  { value: "setting", label: "Configuración" },
  { value: "admin", label: "Admins" },
  { value: "brand", label: "Marcas" },
  { value: "video_drop", label: "VideoDrops" },
];
