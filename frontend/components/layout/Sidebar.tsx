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
import { useFormStatus } from "react-dom";
import { logout } from "@/app/actions";
import { switchLocale, useI18n } from "@/components/I18nProvider";
import { LOCALES, type Dictionary } from "@/lib/i18n";
import type { User } from "@/lib/types";

export interface NavCounts {
  applications: number;
  upcomingInterviews: number;
}

interface NavItem {
  label: keyof Dictionary["nav"];
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  count?: keyof NavCounts;
  /** Pages that are planned but not built yet are shown disabled. */
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "overview", href: "/", icon: DashboardIcon },
  { label: "applications", href: "/applications", icon: BriefcaseIcon, count: "applications" },
  { label: "interviews", href: "/interviews", icon: CalendarIcon, count: "upcomingInterviews" },
  { label: "analytics", href: "/analytics", icon: ChartIcon },
  { label: "settings", href: "/settings", icon: SettingsIcon },
];

interface SidebarProps {
  /** Streams in from the API; null when it can't be reached. */
  counts: Promise<NavCounts | null>;
  user: User;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onAddApplication: () => void;
}

export function Sidebar({ counts, user, mobileOpen, onMobileClose, onAddApplication }: SidebarProps) {
  const { t } = useI18n();
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
            aria-label={t.nav.navigation}
            className="relative flex h-full w-72 max-w-[80%] flex-col bg-surface p-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={onMobileClose}
                aria-label={t.nav.closeMenu}
                autoFocus
                className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
            <SidebarBody counts={counts} user={user} onNavigate={onMobileClose} onAddApplication={addAndClose} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-surface p-4 lg:flex">
        <Brand />
        <SidebarBody counts={counts} user={user} onAddApplication={onAddApplication} />
      </aside>
    </>
  );
}

export function Brand() {
  const { t } = useI18n();
  return (
    <Link
      href="/"
      className="flex items-center gap-3 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
    >
      <LogoMark className="size-9 text-primary-600" />
      <span className="flex flex-col leading-tight">
        <span className="font-semibold tracking-tight text-ink">ApplyTrack</span>
        <span className="text-xs text-ink-muted">{t.nav.tagline}</span>
      </span>
    </Link>
  );
}

interface SidebarBodyProps {
  /** Streams in from the API; null when it can't be reached. */
  counts: Promise<NavCounts | null>;
  user: User;
  onNavigate?: () => void;
  onAddApplication: () => void;
}

function SidebarBody({ counts, user, onNavigate, onAddApplication }: SidebarBodyProps) {
  const { t } = useI18n();
  const displayName = user.name || user.email.split("@")[0];
  const initials = displayName
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
        {t.common.addApplication}
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
            <span className="block truncate text-xs font-semibold text-ink">{displayName}</span>
            <span className="block truncate text-xs text-ink-muted">{user.email}</span>
          </span>
          <form action={logout} className="ml-auto">
            <LogoutButton />
          </form>
        </div>
        <LanguageSwitcher />
      </div>
    </div>
  );
}

interface NavLinksProps {
  counts: Promise<NavCounts | null>;
  onNavigate?: () => void;
}

// usePathname() can't be known while prerendering pages like /applications/[id],
// so the links render without a highlight until the URL is available.
function NavLinks(props: NavLinksProps) {
  return (
    <Suspense fallback={<NavList {...props} pathname={null} />}>
      <CurrentNavList {...props} />
    </Suspense>
  );
}

function CurrentNavList(props: NavLinksProps) {
  return <NavList {...props} pathname={usePathname()} />;
}

function NavList({ counts, onNavigate, pathname }: NavLinksProps & { pathname: string | null }) {
  const { t } = useI18n();

  return (
    <nav aria-label={t.nav.main} className="mt-6">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : !!pathname?.startsWith(item.href);
          const base = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium";
          const badge = item.count && (
            <Suspense fallback={null}>
              <CountBadge counts={counts} name={item.count} />
            </Suspense>
          );

          if (item.comingSoon) {
            return (
              <li key={item.href}>
                <span aria-disabled="true" title={t.nav.comingSoon} className={`${base} cursor-not-allowed text-ink-muted/70`}>
                  <Icon className="size-5 shrink-0" />
                  {t.nav[item.label]}
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
                {t.nav[item.label]}
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

/** ID / EN toggle; the choice is saved in a cookie and applies to every page. */
export function LanguageSwitcher() {
  const { t, locale } = useI18n();
  return (
    <div role="group" aria-label={t.nav.language} className="mt-3 flex items-center justify-between px-1 text-xs">
      <span className="text-ink-muted">{t.nav.language}</span>
      <div className="flex rounded-lg border border-line p-0.5">
        {LOCALES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => option !== locale && switchLocale(option)}
            aria-pressed={option === locale}
            className="rounded-md px-2 py-0.5 font-semibold uppercase text-ink-muted aria-pressed:bg-primary-600 aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function LogoutButton() {
  const { t } = useI18n();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-primary-600 disabled:opacity-60"
    >
      {pending ? t.auth.loggingOut : t.auth.logout}
    </button>
  );
}
