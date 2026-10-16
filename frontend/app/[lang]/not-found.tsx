import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getServerI18n();
  return (
    <Card>
      <div className="py-10 text-center">
        <h1 className="font-semibold text-ink">{t.meta.notFound}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{t.errors.notFoundText}</p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          {t.errors.backToDashboard}
        </Link>
      </div>
    </Card>
  );
}
