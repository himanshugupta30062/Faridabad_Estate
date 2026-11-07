export const TEMP_BADGE = {
  Hot: "bg-red-500/15 text-red-400 border-red-500/30",
  Warm: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Cold: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export const TempBadge = ({ t }) => (
  <span className={`text-xs px-2 py-0.5 rounded-sm border ${TEMP_BADGE[t] || TEMP_BADGE.Warm}`} data-testid="lead-temperature-badge">{t || "Warm"}</span>
);

export const requirementText = (l) =>
  [l.bedrooms ? `${l.bedrooms} BHK` : null, l.property_type, l.possession].filter(Boolean).join(" · ") || "—";

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
