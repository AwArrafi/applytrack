import Link from "next/link";
import { ImportEmailDialog } from "@/components/applications/ImportEmailDialog";
import { SupportedPortalsNotice } from "@/components/applications/SupportedPortalsNotice";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { getServerI18n } from "@/lib/i18n/server";
import type { EmailForwarding } from "@/lib/types";
import { CopyButton } from "./CopyButton";

// What the Gmail filter's "From" field should match: the portals ApplyTrack can read.
const PORTAL_SENDERS = "jobstreet.com OR linkedin.com OR glints.com OR kalibrr.com";

const OUTCOME_STYLES = {
  created: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  updated: "bg-primary-50 text-primary-700 ring-primary-200",
  unchanged: "bg-slate-100 text-slate-600 ring-slate-200",
  unrecognized: "bg-amber-50 text-amber-800 ring-amber-200",
} as const;

/** Settings: the forwarding address, a one-time Gmail setup guide, and recently received emails. */
export async function EmailForwardingCard() {
  const [{ t, f }, data] = await Promise.all([getServerI18n(), apiGet<EmailForwarding>("/email-forwarding/")]);
  const m = t.forwarding;

  return (
    <Card title={m.title} description={m.description}>
      <div className="mb-5 space-y-3">
        <SupportedPortalsNotice />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-muted">
          <span>{m.pasteInstead}</span>
          <ImportEmailDialog />
        </div>
      </div>
      {!data.address ? (
        <p className="rounded-lg bg-surface-muted p-3 text-sm text-ink-muted">{m.notActive}</p>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="mb-1 text-xs font-medium text-ink">{m.yourAddress}</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-sm text-ink">
                {data.address}
              </code>
              <CopyButton text={data.address} label={m.copy} copiedLabel={m.copied} />
            </div>
            <p className="mt-1 text-xs text-ink-subtle">{m.addressHint}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">{m.setupTitle}</h3>
            <ol className="mt-2 list-decimal space-y-3 pl-5 text-sm text-ink-muted marker:font-semibold marker:text-ink">
              <li>{m.step1}</li>
              <li>
                {m.step2}{" "}
                {data.gmail_confirmation ? (
                  <span className="inline-flex items-center gap-2">
                    <code className="rounded bg-primary-50 px-2 py-0.5 font-mono font-semibold text-primary-700">
                      {data.gmail_confirmation.code}
                    </code>
                    <CopyButton text={data.gmail_confirmation.code} label={m.copy} copiedLabel={m.copied} />
                  </span>
                ) : (
                  <span className="text-ink-subtle">{m.waitingForCode}</span>
                )}
              </li>
              <li>
                {m.step3}
                <span className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded border border-line bg-canvas px-2 py-1 font-mono text-xs text-ink">
                    {PORTAL_SENDERS}
                  </code>
                  <CopyButton text={PORTAL_SENDERS} label={m.copy} copiedLabel={m.copied} />
                </span>
                <span className="mt-1 block">{m.step3After}</span>
              </li>
            </ol>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">{m.recentTitle}</h3>
            {data.recent.length === 0 ? (
              <p className="mt-2 text-sm text-ink-subtle">{m.recentEmpty}</p>
            ) : (
              <ul className="mt-2 divide-y divide-line-soft rounded-lg border border-line-soft">
                {data.recent.map((email) => (
                  <li key={email.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {email.application ? (
                          <Link href={`/applications/${email.application.id}`} className="hover:text-primary-700 hover:underline">
                            {t.common.editApplicationOf(email.application.job_title, email.application.company_name)}
                          </Link>
                        ) : (
                          email.subject
                        )}
                      </p>
                      <p className="text-ink-subtle">{f.date(email.received_at)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${OUTCOME_STYLES[email.outcome]}`}>
                      {m.outcome[email.outcome]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
