"use client";

// "Import from email": paste a job portal email and ApplyTrack adds or updates the application.
// Uses the native <dialog> like the Add Application form (focus trap, Escape, backdrop).

import { startTransition, useActionState, useRef } from "react";
import { importEmail, type ImportState } from "@/app/actions";
import { useI18n } from "@/components/I18nProvider";
import { CloseIcon } from "@/components/ui/icons";
import { Field, inputClass } from "./fields";
import { SupportedPortalsNotice } from "./SupportedPortalsNotice";

const INITIAL_STATE: ImportState = { ok: false, errors: {} };

export function ImportEmailDialog() {
  const { t } = useI18n();
  const m = t.importEmail;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(importEmail, INITIAL_STATE);
  const app = state.application;
  const generalErrors = [...(state.errors.form ?? []), ...(state.errors.non_field_errors ?? [])];

  const message =
    state.ok && app
      ? state.result === "created"
        ? m.created(app.job_title, app.company_name)
        : state.result === "updated"
          ? m.updated(app.job_title, app.company_name, t.status[app.status])
          : m.unchanged(app.job_title, app.company_name)
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="h-9 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink-muted shadow-sm hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
      >
        {m.button}
      </button>

      <dialog
        ref={dialogRef}
        // A click on the dialog element itself (not its content) is a click on the backdrop.
        onClick={(event) => event.target === dialogRef.current && dialogRef.current?.close()}
        aria-labelledby="import-email-title"
        className="m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
          <div>
            <h2 id="import-email-title" className="font-semibold">{m.title}</h2>
            <p className="mt-0.5 text-xs text-ink-muted">{m.description}</p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={t.common.close}
            className="rounded-lg p-1 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        {/* Submitted by hand: <form action> would clear the pasted text when the import fails. */}
        <form
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(() => formAction(formData));
          }}
          className="space-y-4 p-6"
        >
          {message ? (
            <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>
          ) : null}
          <SupportedPortalsNotice />
          <Field label={m.label} htmlFor="import-email-text" errors={state.errors.text}>
            <textarea
              id="import-email-text"
              name="text"
              required
              rows={10}
              maxLength={50_000}
              placeholder={m.placeholder}
              aria-describedby="supported-portals-notice"
              className={`${inputClass} h-auto py-2`}
            />
          </Field>
          <div role="alert" className="text-sm text-rose-700">
            {generalErrors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
          <div className="flex justify-end gap-2.5">
            {message && (
              <button
                type="button"
                onClick={() => formRef.current?.reset()}
                className="rounded-lg border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
              >
                {m.another}
              </button>
            )}
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? m.importing : m.submit}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
