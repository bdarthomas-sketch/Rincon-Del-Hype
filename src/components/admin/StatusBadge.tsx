interface StatusBadgeProps {
  isActive: boolean;
  deletedAt?: string | null;
  outOfStock?: boolean;
  incomplete?: boolean;
}

const STATUS_CONFIG: Record<string, { color: string; tooltip: string }> = {
  deleted:    { color: "bg-[#555]/25", tooltip: "Eliminado" },
  inactive:   { color: "bg-[#888]/40", tooltip: "Oculto" },
  outOfStock: { color: "bg-red-500",   tooltip: "Sin stock" },
  incomplete: { color: "bg-[#6366f1]", tooltip: "Incompleto" },
  active:     { color: "bg-green-500", tooltip: "Activo" },
};

export function StatusBadge({ isActive, deletedAt, outOfStock, incomplete }: StatusBadgeProps) {
  let key: string;

  if (deletedAt) {
    key = "deleted";
  } else if (!isActive) {
    key = "inactive";
  } else if (outOfStock) {
    key = "outOfStock";
  } else if (incomplete) {
    key = "incomplete";
  } else {
    key = "active";
  }

  const { color, tooltip } = STATUS_CONFIG[key];

  return (
    <span className={`inline-block size-2 rounded-full ${color}`} title={tooltip} />
  );
}
