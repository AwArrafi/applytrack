import type { ComponentType, ReactNode, SVGProps } from "react";

// Color pairs for the icon tile and the chip next to the number.
const TONES = {
  primary: { icon: "bg-primary-50 text-primary-700", chip: "bg-primary-50 text-primary-700" },
  blue: { icon: "bg-blue-50 text-blue-700", chip: "bg-blue-50 text-blue-700" },
  amber: { icon: "bg-amber-50 text-amber-700", chip: "bg-amber-100/70 text-amber-800" },
  emerald: { icon: "bg-emerald-50 text-emerald-700", chip: "bg-emerald-100 text-emerald-800" },
};

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: keyof typeof TONES;
  /** Small pill next to the number, e.g. "3 this week". */
  chip?: ReactNode;
  /** Short supporting context under the number. */
  hint?: string;
}

/** Headline number for the dashboard. */
export function StatCard({ label, value, icon: Icon, tone, chip, hint }: StatCardProps) {
  const colors = TONES[tone];
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-ink-subtle sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${colors.icon}`}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-3xl font-semibold tracking-tight text-ink tabular-nums sm:text-4xl">{value}</p>
        {chip && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:text-xs ${colors.chip}`}>
            {chip}
          </span>
        )}
      </div>
      {/* Half-width cards on phones: let the hint wrap instead of cutting it off. */}
      {hint && <p className="mt-1 text-xs text-ink-muted max-sm:line-clamp-2 sm:truncate">{hint}</p>}
    </div>
  );
}
