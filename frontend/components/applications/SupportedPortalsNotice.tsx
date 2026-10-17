"use client";

import { useI18n } from "@/components/I18nProvider";

/** Says plainly which job portals' emails ApplyTrack can read; shown wherever emails are imported. */
export function SupportedPortalsNotice() {
  const { t } = useI18n();
  return (
    <div id="supported-portals-notice" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
      <p className="font-semibold">{t.importEmail.supportedTitle}</p>
      <p className="mt-0.5 text-amber-800">{t.importEmail.supported}</p>
    </div>
  );
}
