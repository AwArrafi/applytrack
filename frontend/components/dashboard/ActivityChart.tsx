import { Card } from "@/components/ui/Card";
import { getServerI18n } from "@/lib/i18n/server";
import type { WeeklyActivity } from "@/lib/types";

// The SVG uses a 100x100 coordinate box stretched to the container
// (preserveAspectRatio="none"), so x and y below are percentages. Dots and the
// tooltip are HTML positioned with the same percentages so they don't stretch.
const TOP = 22; // leave room for the peak tooltip
const BOTTOM = 96;

/** Weekly submissions vs. responses, with the busiest week highlighted. */
export async function ActivityChart({ weeks }: { weeks: WeeklyActivity[] }) {
  const { t, f } = await getServerI18n();
  const max = Math.max(...weeks.flatMap((w) => [w.submitted, w.responses]), 1);
  const toPoint = (value: number, index: number) => ({
    x: weeks.length > 1 ? (index / (weeks.length - 1)) * 100 : 50,
    y: BOTTOM - (value / max) * (BOTTOM - TOP),
  });
  const submitted = weeks.map((w, i) => toPoint(w.submitted, i));
  const responses = weeks.map((w, i) => toPoint(w.responses, i));

  // Latest week wins a tie, so the peak reflects recent momentum.
  const peakIndex = weeks.reduce((best, w, i) => (w.submitted >= weeks[best].submitted ? i : best), 0);
  const peak = weeks[peakIndex];
  const hasData = weeks.some((w) => w.submitted > 0 || w.responses > 0);
  const weekLabel = (index: number) =>
    index === weeks.length - 1 ? t.activity.thisWeek : f.shortDate(weeks[index].week_start);

  return (
    <Card title={t.activity.title} description={t.activity.description}>
      {!hasData ? (
        <p className="py-10 text-center text-sm text-ink-muted">{t.activity.empty}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-primary-600" aria-hidden="true" /> {t.activity.submitted}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 border-t-2 border-dashed border-slate-400" aria-hidden="true" /> {t.activity.responses}
              </span>
            </div>
            <p className="font-mono text-[11px]">
              {t.activity.peak} <span className="font-semibold text-ink">{weekLabel(peakIndex)} ({t.activity.sent(peak.submitted)})</span>
            </p>
          </div>

          <div className="relative mt-4 h-52 sm:h-56" aria-hidden="true">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              <defs>
                <linearGradient id="activity-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[TOP, (TOP + BOTTOM) / 2].map((y) => (
                <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#e3e1ec" strokeDasharray="4" vectorEffect="non-scaling-stroke" />
              ))}
              <line x1="0" x2="100" y1="100" y2="100" stroke="#c7c4d8" vectorEffect="non-scaling-stroke" />
              <path d={`${smoothPath(submitted)} L 100 100 L 0 100 Z`} fill="url(#activity-fill)" />
              <path
                d={smoothPath(responses)}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              <path d={smoothPath(submitted)} fill="none" stroke="#4f46e5" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </svg>

            {submitted.map((point, i) => (
              <span
                key={weeks[i].week_start}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                  i === peakIndex ? "size-3 border-white bg-primary-600 shadow" : "size-2.5 border-primary-600 bg-white"
                }`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              />
            ))}

            <div
              className="absolute -translate-x-1/2 -translate-y-[calc(100%+12px)] whitespace-nowrap rounded-md bg-ink px-2.5 py-1 text-center"
              style={{
                left: `clamp(2.5rem, ${submitted[peakIndex].x}%, calc(100% - 2.5rem))`,
                top: `${submitted[peakIndex].y}%`,
              }}
            >
              <p className="text-[11px] font-semibold text-white">{t.activity.sent(peak.submitted)}</p>
              <p className="font-mono text-[9px] text-slate-300">{t.activity.weekOf(f.shortDate(peak.week_start))}</p>
            </div>
          </div>

          <div className="mt-3 flex justify-between font-mono text-[11px] text-ink-muted" aria-hidden="true">
            {weeks.map((w, i) => (
              <span key={w.week_start} className={i === peakIndex ? "font-semibold text-primary-700" : undefined}>
                {weekLabel(i)}
              </span>
            ))}
          </div>

          {/* Same numbers as a table for screen readers. */}
          <div className="sr-only">
            <table>
              <caption>{t.activity.tableCaption}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.activity.week}</th>
                  <th scope="col">{t.activity.submitted}</th>
                  <th scope="col">{t.activity.responses}</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w, i) => (
                  <tr key={w.week_start}>
                    <th scope="row">{weekLabel(i)}</th>
                    <td>{w.submitted}</td>
                    <td>{w.responses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

// Draws a smooth curve through the points (Catmull-Rom converted to cubic Béziers).
// Control points are clamped to the chart area so the curve never dips below the axis.
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  const clampY = (y: number) => Math.min(Math.max(y, 0), 100);
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: clampY(p1.y + (p2.y - p0.y) / 6) };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: clampY(p2.y - (p3.y - p1.y) / 6) };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }
  return d;
}
