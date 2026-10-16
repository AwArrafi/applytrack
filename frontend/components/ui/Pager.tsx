import Link from "next/link";
import { getServerI18n } from "@/lib/i18n/server";

interface PagerProps {
  page: number;
  pages: number;
  /** URL for a page number, keeping the page's other filters. */
  href: (page: number) => string;
}

/** "← Previous · Page 2 of 5 · Next →". Renders nothing when everything fits on one page. */
export async function Pager({ page, pages, href }: PagerProps) {
  if (pages <= 1) return null;
  const { t } = await getServerI18n();
  const link = "rounded-lg border border-line px-3 py-1.5 font-medium text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600";
  const disabled = "rounded-lg border border-line-soft px-3 py-1.5 text-ink-subtle";

  return (
    <nav aria-label={t.pager.label} className="flex items-center justify-between gap-3 text-xs">
      {page > 1 ? (
        <Link href={href(page - 1)} className={link}>{t.pager.previous}</Link>
      ) : (
        <span aria-disabled="true" className={disabled}>{t.pager.previous}</span>
      )}
      <span className="text-ink-muted" aria-current="page">{t.pager.pageOf(page, pages)}</span>
      {page < pages ? (
        <Link href={href(page + 1)} className={link}>{t.pager.next}</Link>
      ) : (
        <span aria-disabled="true" className={disabled}>{t.pager.next}</span>
      )}
    </nav>
  );
}
