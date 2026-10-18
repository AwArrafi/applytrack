"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useI18n } from "@/components/I18nProvider";
import { NAV_ITEMS, isActiveHref } from "./Sidebar";

// Settings lives in the account menu (top bar) on phones; four tabs fit a phone's width.
const TABS = NAV_ITEMS.filter((item) => item.href !== "/settings");

/** Phones and tablets: the main sections as a tab bar fixed to the bottom of the screen. */
export function MobileNav() {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t.nav.main}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {/* The URL of /applications/[id] is only known at request time, hence Suspense. */}
      <Suspense fallback={<Tabs pathname={null} />}>
        <CurrentTabs />
      </Suspense>
    </nav>
  );
}

function CurrentTabs() {
  return <Tabs pathname={usePathname()} />;
}

function Tabs({ pathname }: { pathname: string | null }) {
  const { t } = useI18n();
  return (
    <ul className="grid grid-cols-4">
      {TABS.map((item) => {
        const Icon = item.icon;
        const active = isActiveHref(item.href, pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-600 ${
                active ? "text-primary-700" : "text-ink-muted"
              }`}
            >
              <Icon className="size-6" />
              {t.nav[item.shortLabel ?? item.label]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
