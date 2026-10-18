"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { logout } from "@/app/actions";
import { useI18n } from "@/components/I18nProvider";
import { PlusIcon, SearchIcon, SettingsIcon } from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import type { User } from "@/lib/types";
import { Brand, LanguageSwitcher, LogoutButton, displayNameOf, initialsOf } from "./Sidebar";

/** Breadcrumb trail for each route: [section, page]. */
type Crumb = keyof Dictionary["crumbs"];
const BREADCRUMBS: Record<string, [Crumb, Crumb]> = {
  "/": ["dashboard", "overview"],
  "/applications": ["applications", "all"],
  "/interviews": ["dashboard", "interviews"],
  "/settings": ["dashboard", "settings"],
  "/analytics": ["dashboard", "analytics"],
};

interface TopBarProps {
  user: User;
  onAddApplication: () => void;
}

/** Sticky bar above the page: breadcrumbs, search, and the main action; on phones, the logo and account menu. */
export function TopBar({ user, onAddApplication }: TopBarProps) {
  const { t } = useI18n();
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl+K / Cmd+K focuses the search box.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <Brand />
        </div>

        <Suspense fallback={null}>
          <Breadcrumbs />
        </Suspense>

        {/* Search goes to the Applications page, which handles the query. */}
        <form action="/applications" role="search" className="relative ml-2 hidden w-full max-w-md sm:block">
          <label htmlFor="global-search" className="sr-only">
            {t.common.searchLabel}
          </label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            ref={searchRef}
            id="global-search"
            name="q"
            type="search"
            placeholder={t.common.searchPlaceholder}
            className="h-9 w-full rounded-lg border border-line bg-canvas pl-9 pr-14 text-sm text-ink placeholder:text-ink-subtle focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
            Ctrl K
          </kbd>
        </form>

        {/* Phones and tablets use the floating button in AppShell instead. */}
        <button
          type="button"
          onClick={onAddApplication}
          className="ml-auto hidden shrink-0 items-center gap-2 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 active:scale-[0.98] lg:flex"
        >
          <PlusIcon className="size-4" />
          {t.common.addApplication}
        </button>
        <AccountMenu user={user} />
      </div>
    </header>
  );
}

/**
 * Phones and tablets: the avatar opens Settings, the language switch, and sign-out (the desktop
 * sidebar shows these). A native popover: Escape and tapping outside close it.
 */
function AccountMenu({ user }: { user: User }) {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement>(null);
  return (
    <div className="ml-auto lg:hidden">
      <button
        type="button"
        popoverTarget="account-menu"
        aria-label={t.nav.account}
        className="flex size-9 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 ring-1 ring-primary-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        {initialsOf(user)}
      </button>
      <div
        ref={menuRef}
        id="account-menu"
        popover="auto"
        className="fixed inset-auto right-4 top-[calc(3.5rem+env(safe-area-inset-top))] m-0 w-64 rounded-xl border border-line bg-surface p-2 shadow-xl"
      >
        <div className="border-b border-line-soft px-2 pb-2 pt-1">
          <p className="truncate text-sm font-semibold text-ink">{displayNameOf(user)}</p>
          <p className="truncate text-xs text-ink-muted">{user.email}</p>
        </div>
        <Link
          href="/settings"
          onClick={() => menuRef.current?.hidePopover()}
          className="mt-1 flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary-600"
        >
          <SettingsIcon className="size-5 text-ink-muted" />
          {t.nav.settings}
        </Link>
        <div className="border-t border-line-soft px-1 pb-1">
          <LanguageSwitcher />
        </div>
        <form action={logout} className="border-t border-line-soft px-1 pt-2">
          <LogoutButton />
        </form>
      </div>
    </div>
  );
}

// In its own Suspense boundary: the pathname of /applications/[id] is only known at request time.
function Breadcrumbs() {
  const { t } = useI18n();
  const pathname = usePathname();
  const crumbs: [Crumb, Crumb] | undefined =
    BREADCRUMBS[pathname] ?? (pathname.startsWith("/applications/") ? ["applications", "edit"] : undefined);
  if (!crumbs) return null;
  return (
    <nav aria-label={t.crumbs.label} className="hidden shrink-0 items-center gap-2 text-xs sm:flex">
      <span className="text-ink-muted">{t.crumbs[crumbs[0]]}</span>
      <span className="text-line" aria-hidden="true">/</span>
      <span className="font-semibold text-primary-700" aria-current="page">{t.crumbs[crumbs[1]]}</span>
    </nav>
  );
}
