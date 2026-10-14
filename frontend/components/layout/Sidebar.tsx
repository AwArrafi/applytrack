"use client";

// Client Component: it needs the current URL to highlight the active link.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, use, useEffect, type ComponentType, type SVGProps } from "react";
import {
  BriefcaseIcon,
  CalendarIcon,
  ChartIcon,
  CloseIcon,
  DashboardIcon,
  LogoMark,
  PlusIcon,
  SettingsIcon,
} from "@/components/ui/icons";

export interface NavCounts {
  applications: number;
  upcomingInterviews: number;
}

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  count?: keyof NavCounts;
  /** Pages that are planned but not built yet are shown disabled. */
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/", icon: DashboardIcon },
  { label: "Applications", href: "/applications", icon: BriefcaseIcon, count: "applications" },
  { label: "Interview Calendar", href: "/interviews", icon: CalendarIcon, count: "upcomingInterviews", comingSoon: true },
  { label: "Analytics", href: "/analytics", icon: ChartIcon, comingSoon: true },
  { label: "Settings", href: "/settings", icon: SettingsIcon, comingSoon: true },
];

interface SidebarProps {
  /** Streams in from the API; null when it can't be reached. */
  counts: Promise<NavCounts | null>;
  userName: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onAddApplication: () => void;
}

export function Sidebar({ counts, userName, mobileOpen, onMobileClose, onAddApplication }: SidebarProps) {
  // Close the mobile menu with the Escape key.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMobileClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onMobileClose]);

  const addAndClose = () => {
    onMobileClose();
    onAddApplication();
  };

  return (
    <>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" aria-hidden="true" onClick={onMobileClose} />
          <div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="relative flex h-full w-72 max-w-[80%] flex-col bg-surface p-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Close navigation menu"
                autoFocus
                className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
            <SidebarBody counts={counts} userName={userName} onNavigate={onMobileClose} onAddApplication={addAndClose} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-surface p-4 lg:flex">
        <Brand />
        <SidebarBody counts={counts} userName={userName} onAddApplication={onAddApplication} />
      </aside>
    </>
  );
}

export function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
    >
      <LogoMark className="size-9 text-primary-600" />
      <span className="flex flex-col leading-tight">
        <span className="font-semibold tracking-tight text-ink">ApplyTrack</span>
        <span className="text-xs text-ink-muted">Career Pipeline</span>
      </span>
    </Link>
  );
}

interface SidebarBodyProps {
  /** Streams in from the API; null when it can't be reached. */
  counts: Promise<NavCounts | null>;
  userName: string;
  onNavigate?: () => void;
  onAddApplication: () => void;
}

function SidebarBody({ counts, userName, onNavigate, onAddApplication }: SidebarBodyProps) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mt-6 flex flex-1 flex-col">
      <button
        type="button"
        onClick={onAddApplication}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 active:scale-[0.98]"
      >
        <PlusIcon className="size-4" />
        Add Application
      </button>

      <NavLinks counts={counts} onNavigate={onNavigate} />

      <div className="mt-auto border-t border-line pt-4">
        <div className="flex items-center gap-2.5 rounded-lg border border-line/60 bg-surface-muted p-2">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-700 text-xs font-semibold text-white"
            aria-hidden="true"
          >
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-ink">{userName}</span>
            <span className="block truncate text-xs text-ink-muted">Local account</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function NavLinks({ counts, onNavigate }: { counts: Promise<NavCounts | null>; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="mt-6">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const base = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium";
          const badge = item.count && (
            <Suspense fallback={null}>
              <CountBadge counts={counts} name={item.count} />
            </Suspense>
          );

          if (item.comingSoon) {
            return (
              <li key={item.href}>
                <span aria-disabled="true" title="Coming soon" className={`${base} cursor-not-allowed text-ink-muted/70`}>
                  <Icon className="size-5 shrink-0" />
                  {item.label}
                  {badge}
                </span>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={`${base} transition-colors focus-visible:outline-2 focus-visible:outline-primary-600 ${
                  isActive ? "bg-primary-50 text-primary-700" : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                <Icon className="size-5 shrink-0" />
                {item.label}
                {badge}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function CountBadge({ counts, name }: { counts: Promise<NavCounts | null>; name: keyof NavCounts }) {
  const value = use(counts)?.[name];
  if (value === undefined) return null;
  return (
    <span
      className={`ml-auto rounded-full px-2 py-0.5 font-mono text-xs ${
        name === "upcomingInterviews" ? "bg-primary-100 text-primary-700" : "bg-primary-50 text-ink-muted"
      }`}
    >
      {value}
    </span>
  );
}
