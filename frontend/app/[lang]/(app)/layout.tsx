import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiGet, getCurrentUser } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

// Every page in (app) belongs to the signed-in user, so the frame waits for who that is.
export default function AppLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <Suspense fallback={<div className="min-h-full bg-canvas" />}>
      <SignedInShell>{children}</SignedInShell>
    </Suspense>
  );
}

async function SignedInShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser(); // redirects to /login when the session is gone
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
