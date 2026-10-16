"use client";

// Opened by the URL (?schedule=… or ?edit=<id>), so the calendar page stays a Server
// Component. Closing, saving or deleting navigates back to `closeHref`.

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useTransition } from "react";
import { deleteInterview, saveInterview, type SaveState } from "@/app/actions";
import { Field, inputClass } from "@/components/applications/fields";
import { useI18n } from "@/components/I18nProvider";
import { CalendarIcon, CloseIcon } from "@/components/ui/icons";
import { INTERVIEW_OUTCOMES, INTERVIEW_TYPES } from "@/lib/constants";
import type { Application, InterviewWithApplication } from "@/lib/types";

const INITIAL_STATE: SaveState = { ok: false, errors: {} };

interface InterviewDialogProps {
  /** null schedules a new interview. */
  interview: InterviewWithApplication | null;
  applications: Pick<Application, "id" | "company_name" | "job_title">[];
  /** "YYYY-MM-DD" to start a new interview on. */
  defaultDate: string;
  closeHref: string;
}

export function InterviewDialog({ interview, applications, defaultDate, closeHref }: InterviewDialogProps) {
  const { t } = useI18n();
  const form = t.interviewForm;
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, saving] = useActionState(saveInterview.bind(null, interview?.id ?? null), INITIAL_STATE);
  const [deleting, startDelete] = useTransition();
  const errors = state.errors;
  const generalErrors = [...(errors.form ?? []), ...(errors.non_field_errors ?? [])];

  const close = () => router.replace(closeHref, { scroll: false });

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (state.ok) router.replace(closeHref, { scroll: false });
  }, [state, router, closeHref]);

  function onDelete() {
    if (!interview || !window.confirm(form.confirmDelete(interview.company_name))) return;
    startDelete(async () => {
      const result = await deleteInterview(interview.id);
      if (result.ok) close();
      else window.alert(result.errors.form?.join(" ") ?? t.errors.backendDown);
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={close}
      // A click on the dialog element itself (not its content) is a click on the backdrop.
      onClick={(event) => event.target === dialogRef.current && close()}
      aria-labelledby="interview-dialog-title"
      className="m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl"
    >
      {/* Submitted by hand: <form action> would also clear what the user typed when saving fails. */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(() => formAction(formData));
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <CalendarIcon className="size-4" />
            </span>
            <div>
              <h2 id="interview-dialog-title" className="font-semibold">
                {interview ? form.editTitle(interview.company_name) : form.newTitle}
              </h2>
              <p className="text-xs text-ink-muted">
                {interview ? form.editDescription : form.newDescription}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t.common.close}
            className="rounded-lg p-1 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={form.application} htmlFor="iv-application" errors={errors.application}>
              <select id="iv-application" name="application" required defaultValue={interview?.application ?? ""} className={inputClass}>
                <option value="" disabled>
                  {form.chooseApplication}
                </option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.company_name} — {app.job_title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={form.type} htmlFor="iv-type" errors={errors.interview_type}>
              <select id="iv-type" name="interview_type" defaultValue={interview?.interview_type ?? "hr_interview"} className={inputClass}>
                {INTERVIEW_TYPES.map((value) => (
                  <option key={value} value={value}>{t.interviewType[value]}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Field label={form.when} htmlFor="iv-when" errors={errors.scheduled_at}>
              <input
                id="iv-when"
                name="scheduled_at"
                type="datetime-local"
                required
                // The API's "2026-10-15T14:00:00+07:00" -> "2026-10-15T14:00" in the backend's time zone.
                defaultValue={interview ? interview.scheduled_at.slice(0, 16) : `${defaultDate}T10:00`}
                className={inputClass}
              />
            </Field>
            <Field label={form.duration} htmlFor="iv-duration" errors={errors.duration_minutes}>
              <input id="iv-duration" name="duration_minutes" type="number" min={5} step={5} required defaultValue={interview?.duration_minutes ?? 60} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={form.interviewer} htmlFor="iv-interviewer" errors={errors.interviewer}>
              <input id="iv-interviewer" name="interviewer" defaultValue={interview?.interviewer ?? ""} placeholder={form.interviewerPlaceholder} className={inputClass} />
            </Field>
            <Field label={form.meetingUrl} htmlFor="iv-url" errors={errors.meeting_url}>
              <input id="iv-url" name="meeting_url" type="url" defaultValue={interview?.meeting_url ?? ""} placeholder="https://meet.google.com/..." className={inputClass} />
            </Field>
          </div>

          <Field label={form.location} htmlFor="iv-location" errors={errors.location}>
            <input id="iv-location" name="location" defaultValue={interview?.location ?? ""} className={inputClass} />
          </Field>

          <Field label={form.preparation} htmlFor="iv-prep" errors={errors.preparation_notes}>
            <textarea id="iv-prep" name="preparation_notes" rows={2} defaultValue={interview?.preparation_notes ?? ""} placeholder={form.preparationPlaceholder} className={`${inputClass} h-auto py-2`} />
          </Field>

          <fieldset className="space-y-4 rounded-xl border border-line-soft bg-surface-muted/50 p-4">
            <legend className="px-1 text-xs font-semibold text-ink">{form.resultSection}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={form.outcome} htmlFor="iv-outcome" errors={errors.outcome}>
                <select id="iv-outcome" name="outcome" defaultValue={interview?.outcome ?? "awaiting"} className={inputClass}>
                  {INTERVIEW_OUTCOMES.map((value) => (
                    <option key={value} value={value}>{t.outcome[value]}</option>
                  ))}
                </select>
              </Field>
              <Field label={form.selfScore} htmlFor="iv-score" errors={errors.self_score}>
                <select id="iv-score" name="self_score" defaultValue={interview?.self_score ?? ""} className={inputClass}>
                  <option value="">{form.notRated}</option>
                  {[5, 4, 3, 2, 1].map((score) => (
                    <option key={score} value={score}>{"★".repeat(score)} {score} / 5</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={form.notes} htmlFor="iv-debrief" errors={errors.debrief_notes}>
              <textarea id="iv-debrief" name="debrief_notes" rows={3} defaultValue={interview?.debrief_notes ?? ""} placeholder={form.notesPlaceholder} className={`${inputClass} h-auto bg-surface py-2`} />
            </Field>
          </fieldset>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-line bg-surface-muted/60 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {interview && (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="rounded-lg px-2 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-600 disabled:cursor-wait disabled:opacity-60"
              >
                {deleting ? t.common.deleting : form.delete}
              </button>
            )}
            <div role="alert" className="text-xs text-rose-700">
              {generalErrors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? t.common.saving : interview ? t.common.saveChanges : form.submitNew}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
