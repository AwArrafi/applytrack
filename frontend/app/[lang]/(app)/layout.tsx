import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiGet, getCurrentUser } from "@/lib/api";
import { getServerI18n } from "@/lib/i18n/server";
import type { DashboardSummary } from "@/lib/types";

// Every page in (app) belongs to the signed-in user, so the frame waits for who that is.
export default async function AppLayout({ children }: LayoutProps<"/[lang]">) {
  const { t } = await getServerI18n();
  return (
    <Suspense
      fallback={
        // Usually gone in a blink. The note fades in only after 3s: a sleeping free-tier backend
        // can take up to a minute to wake, and a blank screen that long looks broken.
        <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
          <p role="status" className="max-w-xs animate-[fade-in_0.3s_ease-out_3s_both] text-center text-sm text-ink-muted">
            {t.common.wakingUp}
          </p>
        </div>
      }
    >
      <SignedInShell>{children}</SignedInShell>
    </Suspense>
  );
}

async function SignedInShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser(); // redirects to /login when the session is gone
  if (!user.email_verified) redirect("/verify-email"); // new accounts open the emailed link first
  // Not awaited: the sidebar shows the counts once they arrive, and hides them if the API is down.
  const navCounts = apiGet<DashboardSummary>("/dashboard/")
    .then((s) => ({ applications: s.total_applications, upcomingInterviews: s.upcoming_interview_count }))
    .catch(() => null);

  return (
    <AppShell navCounts={navCounts} user={user}>
      {children}
    </AppShell>
  );
}
