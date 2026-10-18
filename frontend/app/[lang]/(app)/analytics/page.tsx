import Link from "next/link";
import { Suspense } from "react";
import { Channels, Funnel, KpiCards, ResponseTimes, Tips } from "@/components/analytics/AnalyticsSections";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { StatusBreakdown } from "@/components/dashboard/StatusBreakdown";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { getServerI18n } from "@/lib/i18n/server";
import type { Analytics } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t.meta.analytics };
}

// Same choices as the API's ?period=; anything else shows the default.
const PERIODS = ["30", "90", "all"] as const;
type Period = (typeof PERIODS)[number];

export default async function AnalyticsPage({ searchParams }: PageProps<"/[lang]/analytics">) {
  const { t } = await getServerI18n();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{t.analytics.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t.analytics.description}</p>
      </header>
      <Suspense fallback={<Card><p className="py-16 text-center text-sm text-ink-muted">{t.analytics.loading}</p></Card>}>
        <AnalyticsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AnalyticsContent({ searchParams }: { searchParams: PageProps<"/[lang]/analytics">["searchParams"] }) {
  const { period: requested } = await searchParams;
  const period: Period = PERIODS.includes(requested as Period) ? (requested as Period) : "30";
  const [{ t }, data] = await Promise.all([getServerI18n(), apiGet<Analytics>(`/analytics/?period=${period}`)]);
  const total = Object.values(data.status_counts).reduce((sum, count) => sum + count, 0);

  return (
    <>
      <nav aria-label={t.analytics.periodLabel} className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        {PERIODS.map((option) => (
          <Link
            key={option}
            href={`/analytics?period=${option}`}
            aria-current={option === period ? "page" : undefined}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-center text-xs font-medium text-ink-muted sm:px-3 sm:text-sm hover:text-ink aria-[current=page]:border-primary-600 aria-[current=page]:bg-primary-50 aria-[current=page]:text-primary-700 focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            {t.analytics.period[option]}
          </Link>
        ))}
      </nav>

      <KpiCards kpis={data.kpis} />
      <Funnel funnel={data.funnel} />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <ActivityChart weeks={data.weekly} />
          <Channels channels={data.channels} />
        </div>
        <div className="space-y-6 xl:col-span-5">
          <StatusBreakdown counts={data.status_counts} total={total} />
          <ResponseTimes times={data.response_times} />
          <Tips channels={data.channels} followUp={data.follow_up} />
        </div>
      </div>
    </>
  );
}
