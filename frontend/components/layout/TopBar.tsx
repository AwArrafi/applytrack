"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { useI18n } from "@/components/I18nProvider";
import { MenuIcon, PlusIcon, SearchIcon } from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import { Brand } from "./Sidebar";

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
  onOpenMenu: () => void;
  onAddApplication: () => void;
}

/** Sticky bar above the page: breadcrumbs, search, and the main action. */
export function TopBar({ onOpenMenu, onAddApplication }: TopBarProps) {
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
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={t.nav.openMenu}
          aria-controls="mobile-navigation"
          className="-ml-1.5 rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600 lg:hidden"
        >
          <MenuIcon className="size-6" />
        </button>
        <div className="sm:hidden">
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

        <button
          type="button"
          onClick={onAddApplication}
          className="ml-auto flex shrink-0 items-center gap-2 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 active:scale-[0.98]"
        >
          <PlusIcon className="size-4" />
          <span className="hidden sm:inline">{t.common.addApplication}</span>
          <span className="sr-only sm:hidden">{t.common.addApplication}</span>
        </button>
      </div>
    </header>
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
