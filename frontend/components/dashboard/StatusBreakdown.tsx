import { Card } from "@/components/ui/Card";
import { STATUS_STYLES } from "@/components/ui/StatusBadge";
import { APPLICATION_STATUSES } from "@/lib/constants";
import type { ApplicationStatus } from "@/lib/types";

interface StatusBreakdownProps {
  counts: Record<ApplicationStatus, number>;
  total: number;
}

const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Donut chart of how many applications sit in each pipeline stage, with a legend. */
export function StatusBreakdown({ counts, total }: StatusBreakdownProps) {
  // Each segment is a circle stroke: its length is its share of the circumference,
  // and the offset starts it where the previous segment ended.
  const segments = APPLICATION_STATUSES.filter(({ value }) => counts[value] > 0).reduce<
    { value: ApplicationStatus; length: number; offset: number }[]
  >((acc, { value }) => {
    const previous = acc.at(-1);
    const offset = previous ? previous.offset + previous.length : 0;
    return [...acc, { value, length: (counts[value] / total) * CIRCUMFERENCE, offset }];
  }, []);

  return (
    <Card
      title="Pipeline Breakdown"
      action={<span className="font-mono text-[11px] text-ink-muted">{total} total</span>}
    >
      {total === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">No applications yet. Add one to see your pipeline.</p>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative size-36 shrink-0">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth="14" />
              {segments.map((s) => (
                <circle
                  key={s.value}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke={STATUS_STYLES[s.value].chart}
                  strokeWidth="14"
                  strokeDasharray={`${s.length} ${CIRCUMFERENCE}`}
                  strokeDashoffset={-s.offset}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-ink tabular-nums">{total}</span>
              <span className="-mt-0.5 font-mono text-[10px] text-ink-muted">Tracked</span>
            </div>
          </div>

          <ul className="grid w-full grid-cols-2 gap-x-5 gap-y-2.5 text-xs">
            {APPLICATION_STATUSES.map(({ value, label }) => (
              <li key={value} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-ink-muted">
                  <span className={`size-2.5 rounded-full ${STATUS_STYLES[value].dot}`} aria-hidden="true" />
                  {label}
                </span>
                <span className="font-mono font-semibold text-ink">
                  {counts[value]}
                  <span className="sr-only"> {counts[value] === 1 ? "application" : "applications"}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
