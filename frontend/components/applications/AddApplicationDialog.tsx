"use client";

// Uses the browser's native <dialog> element: showModal() gives us focus
// trapping, the Escape key, and a backdrop without extra code.

import { startTransition, useActionState, useEffect, useRef } from "react";
import { createApplication, type SaveState } from "@/app/actions";
import { useI18n } from "@/components/I18nProvider";
import { CheckIcon, CloseIcon, LinkIcon, NoteIcon } from "@/components/ui/icons";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { Field, inputClass, SalaryFields, SourceField, WorkArrangementField } from "./fields";
import { DIALOG_CLASS, DIALOG_FOOTER_CLASS, DIALOG_FORM_CLASS, DIALOG_HEADER_CLASS } from "@/components/ui/dialog";

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
      className={DIALOG_CLASS}
    >
      {/* Submitted by hand: <form action> would also clear what the user typed when saving fails. */}
      <form
        ref={formRef}
        className={DIALOG_FORM_CLASS}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(() => formAction(formData));
        }}
      >
        <div className={`flex items-center justify-between px-6 py-4 ${DIALOG_HEADER_CLASS}`}>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <NoteIcon className="size-5" />
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
            <Field label={t.applicationForm.company} htmlFor="add-company" required errors={errors.company_name}>
              <input id="add-company" name="company_name" required placeholder={t.applicationForm.companyPlaceholder} className={inputClass} />
            </Field>
            <Field label={t.applicationForm.role} htmlFor="add-role" required errors={errors.job_title}>
              <input id="add-role" name="job_title" required placeholder={t.applicationForm.rolePlaceholder} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <WorkArrangementField defaultValue="remote" />
            <Field label={t.applicationForm.jobUrl} htmlFor="add-url" errors={errors.job_url}>
              <div className="relative">
                <LinkIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
                <input id="add-url" name="job_url" type="url" placeholder="https://..." className={`${inputClass} pl-9`} />
              </div>
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
            <SourceField id="add-source" defaultValue="linkedin" errors={errors.source} />
          </div>

          <SalaryFields idPrefix="add" defaults={{ min: null, max: null, currency: "IDR" }} errors={errors} />

          <Field label={t.applicationForm.notes} htmlFor="add-notes" errors={errors.notes}>
            <textarea
              id="add-notes"
              name="notes"
              rows={3}
              placeholder={t.applicationForm.notesPlaceholder}
              className={`${inputClass} h-auto py-2`}
            />
          </Field>
        </div>

        <div className={`flex flex-col-reverse gap-3 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between ${DIALOG_FOOTER_CLASS}`}>
          <div role="alert" className="text-xs text-rose-700">
            {generalErrors.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
          <div className="flex gap-2.5 max-sm:*:flex-1">
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
              className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-wait disabled:opacity-60"
            >
              <CheckIcon className="size-4" />
              {pending ? t.common.saving : t.applicationForm.save}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

