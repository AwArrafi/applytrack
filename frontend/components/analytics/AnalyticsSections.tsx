// The Analytics page's own sections. The weekly chart and the status donut reuse the
// dashboard's ActivityChart and StatusBreakdown.

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { BriefcaseIcon, CalendarIcon, ChevronRightIcon, LightbulbIcon, PendingIcon, TrophyIcon } from "@/components/ui/icons";
import { StatCard } from "@/components/ui/StatCard";
import { getServerI18n } from "@/lib/i18n/server";
import type { Analytics, AnalyticsKpi } from "@/lib/types";

type Dictionary = Awaited<ReturnType<typeof getServerI18n>>["t"];

const percentOf = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

/** "+20% vs previous period", "New this period", or nothing when there's nothing to compare. */
function change(kpi: AnalyticsKpi, t: Dictionary) {
  if (kpi.previous === null) return undefined;
  if (kpi.previous === 0) return kpi.value > 0 ? t.analytics.newThisPeriod : undefined;
  return t.analytics.changeVsPrevious(Math.round(((kpi.value - kpi.previous) / kpi.previous) * 100));
}

export async function KpiCards({ kpis }: { kpis: Analytics["kpis"] }) {
  const { t } = await getServerI18n();
  const a = t.analytics;
  const { applications, interviews, offers, responses } = kpis;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      <StatCard
        label={a.totalApplications}
        value={applications.value}
        icon={BriefcaseIcon}
        tone="primary"
        chip={change(applications, t)}
        hint={applications.per_day === null ? a.allTimeTotal : a.perDay(applications.per_day)}
      />
      <StatCard
        label={a.interviews}
        value={interviews.value}
        icon={CalendarIcon}
        tone="blue"
        chip={change(interviews, t)}
        hint={a.rateOfApplications(interviews.rate ?? 0)}
      />
      <StatCard
        label={a.offers}
        value={offers.value}
        icon={TrophyIcon}
        tone="emerald"
        chip={change(offers, t)}
        hint={a.rateOfApplications(offers.rate ?? 0)}
      />
      <StatCard
        label={a.responses}
        value={responses.value}
        icon={PendingIcon}
        tone="amber"
        chip={change(responses, t)}
        hint={responses.avg_days === null ? a.noReplyYet : a.avgReply(responses.avg_days)}
      />
    </div>
  );
}

// Darkest for the first stage, lighter for each later one.
const STAGE_COLORS = ["bg-primary-600", "bg-primary-500", "bg-blue-500", "bg-sky-400", "bg-emerald-500"];

export async function Funnel({ funnel }: { funnel: Analytics["funnel"] }) {
  const { t } = await getServerI18n();
  const a = t.analytics;
  const submitted = funnel[0]?.count ?? 0;

  return (
    <Card title={a.funnelTitle} description={a.funnelDescription}>
      {submitted === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">{a.funnelEmpty}</p>
      ) : (
        <>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {funnel.map(({ stage, count }, index) => (
              <li key={stage} className="flex flex-col rounded-lg border border-line/70 p-4">
                <div className="flex items-center justify-between font-mono text-[11px] text-ink-muted">
                  <span>{a.stageNumber(index + 1)}</span>
                  <span className="rounded border border-line px-1.5 py-0.5 font-semibold text-ink">{percentOf(count, submitted)}%</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-ink tabular-nums">{count}</p>
                <p className="text-sm font-semibold text-ink">{a.stages[stage].name}</p>
                <p className="text-xs text-ink-muted">{a.stages[stage].detail}</p>
                {index > 0 && (
                  <p className="mt-auto border-t border-line-soft pt-2 text-[11px] text-primary-700">
                    {a.fromPreviousStage(percentOf(count, funnel[index - 1].count))}
                  </p>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
              {funnel.map(({ stage, count }, index) => (
                <span key={stage} className={STAGE_COLORS[index]} style={{ width: `${percentOf(count, submitted) / funnel.length}%` }} />
              ))}
            </div>
            <p className="mt-2 text-right font-mono text-[11px] text-ink-muted">
              {a.overallConversion(percentOf(funnel.at(-1)!.count, submitted))}
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

export async function Channels({ channels }: { channels: Analytics["channels"] }) {
  const { t } = await getServerI18n();
  const a = t.analytics;
  const onlyOther = channels.length > 0 && channels.every((row) => row.source === "other");

  return (
    <Card title={a.channelsTitle} description={a.channelsDescription} padded={false}>
      {channels.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-muted">{a.channelsEmpty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{a.channelsTitle}</caption>
            <thead className="border-b border-line-soft bg-surface-muted text-[11px] uppercase tracking-wider text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">{a.channel}</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">{a.applications}</th>
                <th scope="col" className="hidden px-3 py-3 text-right font-semibold sm:table-cell">{a.interviews}</th>
                <th scope="col" className="hidden px-3 py-3 text-right font-semibold sm:table-cell">Offer</th>
                <th scope="col" className="px-5 py-3 font-semibold">{a.responseRate}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {channels.map((row) => (
                <tr key={row.source}>
                  <th scope="row" className="px-5 py-3 text-sm font-semibold text-ink">{t.source[row.source]}</th>
                  <td className="px-3 py-3 text-right tabular-nums text-ink">{row.applications}</td>
                  <td className="hidden px-3 py-3 text-right tabular-nums text-ink-muted sm:table-cell">{row.interviews}</td>
                  <td className="hidden px-3 py-3 text-right tabular-nums text-ink-muted sm:table-cell">{row.offers}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                        <span className="block h-full rounded-full bg-primary-600" style={{ width: `${row.response_rate}%` }} />
                      </span>
                      <span className="font-mono font-semibold text-ink">{row.response_rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {onlyOther && <p className="border-t border-line-soft px-5 py-3 text-xs text-ink-muted">{a.channelsHint}</p>}
    </Card>
  );
}

export async function ResponseTimes({ times }: { times: Analytics["response_times"] }) {
  const { t } = await getServerI18n();
  const a = t.analytics;
  const longest = Math.max(...times.map((row) => row.avg_days ?? 0), 1);

  return (
    <Card title={a.speedTitle} description={a.speedDescription}>
      <ul className="space-y-4">
        {times.map((row) => (
          <li key={row.stage}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink">{a.speedStages[row.stage]}</span>
              <span className="shrink-0 font-mono text-xs font-semibold text-ink">
                {row.avg_days === null ? a.noData : a.days(row.avg_days)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${((row.avg_days ?? 0) / longest) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] text-ink-subtle">{a.speedHint}</p>
    </Card>
  );
}

/** Rule-based suggestions: the channel that gets the most replies, and applications to chase. */
export async function Tips({ channels, followUp }: { channels: Analytics["channels"]; followUp: Analytics["follow_up"] }) {
  const { t } = await getServerI18n();
  const a = t.analytics;
  // Needs a couple of applications before a reply rate means anything.
  const best = channels
    .filter((row) => row.source !== "other" && row.applications >= 2 && row.response_rate > 0)
    .sort((x, y) => y.response_rate - x.response_rate)[0];
  const tips = [
    ...(best ? [a.tipBestChannel(t.source[best.source], best.response_rate)] : []),
    ...(followUp.count > 0 ? [a.tipFollowUp(followUp.count, followUp.after_days)] : []),
  ];

  return (
    <Card title={a.tipsTitle}>
      <ul className="space-y-3">
        {(tips.length ? tips : [a.tipNone]).map((tip) => (
          <li key={tip} className="flex items-start gap-2.5 rounded-lg bg-surface-muted p-3 text-sm text-ink-muted">
            <LightbulbIcon className="mt-0.5 size-4 shrink-0 text-primary-700" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
      {followUp.count > 0 && (
        <Link
          href="/applications?status=applied&sort=applied"
          className="mt-4 flex items-center justify-center gap-1 rounded-lg border border-line px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-primary-600"
        >
          {a.followUpLink(followUp.count)}
          <ChevronRightIcon className="size-4" />
        </Link>
      )}
    </Card>
  );
}
