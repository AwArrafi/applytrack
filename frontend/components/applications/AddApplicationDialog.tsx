"use client";

// Uses the browser's native <dialog> element: showModal() gives us focus
// trapping, the Escape key, and a backdrop without extra code.

import { startTransition, useActionState, useEffect, useRef } from "react";
import { createApplication, type SaveState } from "@/app/actions";
import { useI18n } from "@/components/I18nProvider";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { Field, inputClass, SourceField, WorkArrangementField } from "./fields";

interface AddApplicationDialogProps {
  open: boolean;
  onClose: () => void;
}

const INITIAL_STATE: SaveState = { ok: false, errors: {} };

/** Form for recording a new application; saves through the createApplication Server Action. */
export function AddApplicationDialog({ open, onClose }: AddApplicationDialogProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createApplication, INITIAL_STATE);
  const errors = state.errors;
  const generalErrors = [...(errors.form ?? []), ...(errors.non_field_errors ?? [])];

  // Clear the form only after a successful save, then close.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onClose();
    }
  }, [state, onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // A click on the dialog element itself (not its content) is a click on the backdrop.
      onClick={(event) => event.target === dialogRef.current && onClose()}
      aria-labelledby="add-application-title"
      className="m-auto w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl"
    >
      {/* Submitted by hand: <form action> would also clear what the user typed when saving fails. */}
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(() => formAction(formData));
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <PlusIcon className="size-4" />
            </span>
            <div>
              <h2 id="add-application-title" className="font-semibold">{t.applicationForm.addTitle}</h2>
              <p className="text-xs text-ink-muted">{t.applicationForm.addDescription}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="rounded-lg p-1 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.applicationForm.company} htmlFor="add-company" errors={errors.company_name}>
              <input id="add-company" name="company_name" required placeholder={t.applicationForm.companyPlaceholder} className={inputClass} />
            </Field>
            <Field label={t.applicationForm.role} htmlFor="add-role" errors={errors.job_title}>
              <input id="add-role" name="job_title" required placeholder={t.applicationForm.rolePlaceholder} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.applicationForm.status} htmlFor="add-status" errors={errors.status}>
              <select id="add-status" name="status" defaultValue="applied" className={inputClass}>
                {APPLICATION_STATUSES.map((value) => (
                  <option key={value} value={value}>{t.status[value]}</option>
                ))}
              </select>
            </Field>
            <Field label={t.applicationForm.jobUrl} htmlFor="add-url" errors={errors.job_url}>
              <input id="add-url" name="job_url" type="url" placeholder="https://..." className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SourceField id="add-source" defaultValue="linkedin" errors={errors.source} />
            <WorkArrangementField defaultValue="remote" />
          </div>

          <Field label={t.applicationForm.notes} htmlFor="add-notes" errors={errors.notes}>
            <textarea
              id="add-notes"
              name="notes"
              rows={2}
              placeholder={t.applicationForm.notesPlaceholder}
              className={`${inputClass} h-auto py-2`}
            />
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-line bg-surface-muted/60 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div role="alert" className="text-xs text-rose-700">
            {generalErrors.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? t.common.saving : t.applicationForm.save}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

