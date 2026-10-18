"use client";

// Client Component: it holds UI state shared by the sidebar, top bar, and floating button
// (Add Application dialog open). The page content passed in as `children` can still be
// Server Components.

import { useCallback, useState, type ReactNode } from "react";
import { AddApplicationDialog } from "@/components/applications/AddApplicationDialog";
import { useI18n } from "@/components/I18nProvider";
import { PlusIcon } from "@/components/ui/icons";
import { MobileNav } from "./MobileNav";
import { Sidebar, type NavCounts } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { User } from "@/lib/types";

interface AppShellProps {
  navCounts: Promise<NavCounts | null>;
  user: User;
  children: ReactNode;
}

/**
 * Page frame shared by every route. Desktop (lg+): sidebar and top bar. Phones and tablets:
 * top bar, bottom tab bar, and a floating "Add application" button.
 */
export function AppShell({ navCounts, user, children }: AppShellProps) {
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  // Stable, so the dialog's "close after save" effect runs only when a save finishes.
  const closeAdd = useCallback(() => setAddOpen(false), []);

  return (
    <div className="min-h-full">
      <Sidebar counts={navCounts} user={user} onAddApplication={() => setAddOpen(true)} />
      <div className="lg:pl-60">
        <TopBar user={user} onAddApplication={() => setAddOpen(true)} />
        {/* Bottom padding on phones: room for the tab bar and the floating button. */}
        <main className="mx-auto max-w-7xl px-4 pb-36 pt-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-2 rounded-full bg-primary-600 py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 active:scale-[0.98] lg:hidden"
      >
        <PlusIcon className="size-5" />
        {t.common.addApplication}
      </button>
      <MobileNav />
      <AddApplicationDialog open={addOpen} onClose={closeAdd} />
    </div>
  );
}
