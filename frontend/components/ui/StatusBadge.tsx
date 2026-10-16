import { getServerI18n } from "@/lib/i18n/server";
import type { ApplicationStatus } from "@/lib/types";

// Each status has its own color, but the text label is always shown too,
// so the status never depends on color alone. `chart` is the same color as a
// hex value, for SVG charts and legends.
export const STATUS_STYLES: Record<ApplicationStatus, { badge: string; dot: string; chart: string }> = {
  wishlist: { badge: "bg-primary-50 text-primary-700 ring-primary-200/60", dot: "bg-primary-200", chart: "#c7d2fe" },
  applied: { badge: "bg-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500", chart: "#3b82f6" },
  screening: { badge: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500", chart: "#f59e0b" },
  interview: { badge: "bg-primary-100 text-primary-700 ring-primary-200", dot: "bg-primary-600", chart: "#4f46e5" },
  offer: { badge: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500", chart: "#10b981" },
  rejected: { badge: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400", chart: "#94a3b8" },
  withdrawn: { badge: "bg-zinc-100 text-zinc-600 ring-zinc-200", dot: "bg-zinc-300", chart: "#d4d4d8" },
};

export async function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { t } = await getServerI18n();
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}
    >
      <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {t.status[status]}
    </span>
  );
}
