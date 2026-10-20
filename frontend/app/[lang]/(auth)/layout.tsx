import Link from "next/link";
import { LanguageSwitcher } from "@/components/layout/Sidebar";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { LogoMark } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getServerI18n } from "@/lib/i18n/server";
import type { ApplicationStatus, WorkArrangement } from "@/lib/types";

/**
 * Sign-in, sign-up and password pages: no app navigation. On wide screens a showcase of the app
 * sits on the left and the form on the right; on phones the form sits in a card under the logo.
 */
export default async function AuthLayout({ children }: LayoutProps<"/[lang]">) {
  const { t } = await getServerI18n();
  return (
    <div className="bg-grid min-h-screen lg:grid lg:grid-cols-2">
      <Showcase />
      <main className="flex min-h-screen flex-col px-4 py-10 sm:px-8 lg:border-l lg:border-line-soft lg:bg-surface lg:px-16">
        <div className="mx-auto my-auto w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <Brand />
            <p className="mt-3 text-sm text-ink-muted">{t.auth.showcaseTitle}</p>
          </div>
          <div className="rounded-2xl border border-line-soft bg-surface p-6 shadow-card sm:p-8 lg:border-0 lg:p-0 lg:shadow-none">
            {children}
          </div>
        </div>
        <footer className="mx-auto mt-8 flex w-full max-w-md flex-col items-center gap-3 text-xs text-ink-subtle sm:flex-row sm:justify-between lg:max-w-none lg:border-t lg:border-line-soft lg:pt-6">
          <p className="text-center sm:text-left">
            {t.privacy.agreeBefore}
            <Link href="/privacy" className="font-medium text-primary-700 underline-offset-2 hover:underline">
              {t.privacy.link}
            </Link>
            {t.privacy.agreeAfter}
          </p>
          <LanguageSwitcher className="shrink-0" />
        </footer>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <LogoMark className="size-10 text-primary-600" />
      <span className="text-xl font-semibold tracking-tight text-ink">ApplyTrack</span>
    </div>
  );
}

// Made-up companies: real brand names would suggest a partnership that doesn't exist.
const SAMPLES: { company: string; role: string; status: ApplicationStatus; salary: [number, number]; work: WorkArrangement }[] = [
  { company: "Lentera Digital", role: "Senior Frontend Engineer", status: "interview", salary: [18e6, 24e6], work: "hybrid" },
  { company: "Kanvas Studio", role: "Product Designer", status: "offer", salary: [16e6, 20e6], work: "remote" },
  { company: "Arus Logistik", role: "Backend Engineer", status: "applied", salary: [15e6, 18e6], work: "onsite" },
];

/** Wide screens only: what ApplyTrack looks like, with sample applications. */
async function Showcase() {
  const { t, f } = await getServerI18n();
  return (
    <section aria-hidden="true" className="hidden min-h-screen flex-col p-16 lg:flex">
      <Brand />
      <div className="mx-auto my-auto w-full max-w-lg py-10">
        <p className="mb-10 text-4xl font-bold leading-tight tracking-tight text-ink text-balance">{t.auth.showcaseTitle}</p>
        <div className="space-y-3 rounded-3xl border border-line-soft bg-surface p-6 shadow-xl shadow-primary-600/5">
          <div className="flex items-center justify-between pb-1">
            <span className="text-sm font-semibold text-ink">{t.auth.showcaseCard}</span>
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
              {t.auth.showcaseCount}
            </span>
          </div>
          {SAMPLES.map((sample) => (
            <div key={sample.company} className="flex items-start gap-3 rounded-2xl border border-line-soft p-4">
              <CompanyAvatar name={sample.company} />
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-semibold text-ink">{sample.company}</span>
                  <span className="text-ink-subtle"> · {sample.role}</span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <StatusBadge status={sample.status} />
                  <span className="rounded-md bg-surface-muted px-2 py-0.5 font-medium text-ink-muted">
                    {f.salaryRange(sample.salary[0], sample.salary[1], "IDR")}
                  </span>
                  <span className="rounded-md bg-surface-muted px-2 py-0.5 font-medium text-ink-muted">
                    {t.applicationForm.workArrangementOptions[sample.work][0]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
