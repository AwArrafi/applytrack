"use client";

// Client Component: it holds UI state shared by the sidebar and top bar
// (mobile menu open, Add Application dialog open). The page content passed in
// as `children` can still be Server Components.

import { useState, type ReactNode } from "react";
import { AddApplicationDialog } from "@/components/applications/AddApplicationDialog";
import { Sidebar, type NavCounts } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  navCounts: NavCounts;
  userName: string;
  children: ReactNode;
}

/** Page frame shared by every route: sidebar, top bar, and the main content area. */
export function AppShell({ navCounts, userName, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="min-h-full">
      <Sidebar
        counts={navCounts}
        userName={userName}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        onAddApplication={() => setAddOpen(true)}
      />
      <div className="lg:pl-60">
        <TopBar
          onOpenMenu={() => setMobileNavOpen(true)}
          onAddApplication={() => setAddOpen(true)}
        />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <AddApplicationDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
