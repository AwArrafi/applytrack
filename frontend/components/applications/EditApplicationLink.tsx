import Link from "next/link";
import { PencilIcon } from "@/components/ui/icons";
import { getServerI18n } from "@/lib/i18n/server";
import type { Application } from "@/lib/types";

/** Visible "Edit" button for a table row; icon-only on small screens. */
export async function EditApplicationLink({ application }: { application: Application }) {
  const { t } = await getServerI18n();
  return (
    <Link
      href={`/applications/${application.id}`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-muted shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-primary-600 sm:px-2.5"
    >
      <PencilIcon className="size-3.5" />
      <span className="sr-only sm:not-sr-only">{t.common.edit}</span>
      <span className="sr-only">
        {" "}
        {t.common.editApplicationOf(application.job_title, application.company_name)}
      </span>
    </Link>
  );
}
