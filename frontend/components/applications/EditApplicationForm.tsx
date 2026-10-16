"use client";

import { startTransition, useActionState, useTransition } from "react";
import { deleteApplication, updateApplication, type SaveState } from "@/app/actions";
import { useI18n } from "@/components/I18nProvider";
import { Card } from "@/components/ui/Card";
import { APPLICATION_STATUSES } from "@/lib/constants";
import type { Application } from "@/lib/types";
import { Field, inputClass, WorkArrangementField } from "./fields";

const INITIAL_STATE: SaveState = { ok: false, errors: {} };

/** Every field of one application, saved with PATCH; plus deleting it. */
export function EditApplicationForm({ application: app }: { application: Application }) {
  const { t } = useI18n();
  const [state, formAction, saving] = useActionState(updateApplication.bind(null, app.id), INITIAL_STATE);
  const [deleting, startDelete] = useTransition();
  const errors = state.errors;
  const generalErrors = [...(errors.form ?? []), ...(errors.non_field_errors ?? [])];

  function onDelete() {
    if (!window.confirm(t.applicationForm.confirmDelete(app.job_title, app.company_name))) return;
    startDelete(() => deleteApplication(app.id));
  }

  return (
    // Submitted by hand: <form action> would reset the fields to their old values after saving.
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <Card title={t.applicationForm.details} padded={false}>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.applicationForm.company} htmlFor="edit-company" errors={errors.company_name}>
              <input id="edit-company" name="company_name" required defaultValue={app.company_name} className={inputClass} />
            </Field>
            <Field label={t.applicationForm.role} htmlFor="edit-role" errors={errors.job_title}>
              <input id="edit-role" name="job_title" required defaultValue={app.job_title} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.applicationForm.status} htmlFor="edit-status" errors={errors.status}>
              <select id="edit-status" name="status" defaultValue={app.status} className={inputClass}>
                {APPLICATION_STATUSES.map((value) => (
                  <option key={value} value={value}>{t.status[value]}</option>
                ))}
              </select>
            </Field>
            <Field label={t.applicationForm.dateApplied} htmlFor="edit-date" errors={errors.application_date}>
              <input id="edit-date" name="application_date" type="date" defaultValue={app.application_date ?? ""} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.applicationForm.location} htmlFor="edit-location" errors={errors.location}>
              <input id="edit-location" name="location" defaultValue={app.location} placeholder={t.applicationForm.locationPlaceholder} className={inputClass} />
            </Field>
            <WorkArrangementField defaultValue={app.work_arrangement} />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_6rem]">
            <Field label={t.applicationForm.salaryFrom} htmlFor="edit-salary-min" errors={errors.salary_min}>
              <input id="edit-salary-min" name="salary_min" type="number" min={0} step={1} defaultValue={app.salary_min ?? ""} className={inputClass} />
            </Field>
            <Field label={t.applicationForm.salaryTo} htmlFor="edit-salary-max" errors={errors.salary_max}>
              <input id="edit-salary-max" name="salary_max" type="number" min={0} step={1} defaultValue={app.salary_max ?? ""} className={inputClass} />
            </Field>
            <Field label={t.applicationForm.currency} htmlFor="edit-currency" errors={errors.salary_currency}>
              <input
                id="edit-currency"
                name="salary_currency"
                required
                maxLength={3}
                defaultValue={app.salary_currency}
                className={`${inputClass} uppercase`}
              />
            </Field>
          </div>

          <Field label={t.applicationForm.jobUrl} htmlFor="edit-url" errors={errors.job_url}>
            <input id="edit-url" name="job_url" type="url" defaultValue={app.job_url} placeholder="https://..." className={inputClass} />
          </Field>

          <Field label={t.applicationForm.description} htmlFor="edit-description" errors={errors.job_description}>
            <textarea id="edit-description" name="job_description" rows={4} defaultValue={app.job_description} className={`${inputClass} h-auto py-2`} />
          </Field>

          <Field label={t.applicationForm.notes} htmlFor="edit-notes" errors={errors.notes}>
            <textarea id="edit-notes" name="notes" rows={3} defaultValue={app.notes} className={`${inputClass} h-auto py-2`} />
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-line-soft bg-surface-muted/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="self-start rounded-lg px-2 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-600 disabled:cursor-wait disabled:opacity-60"
          >
            {deleting ? t.common.deleting : t.applicationForm.delete}
          </button>
          <div className="flex items-center gap-3">
            <div role="status" className="text-xs">
              {generalErrors.map((message) => (
                <p key={message} className="text-rose-700">{message}</p>
              ))}
              {state.ok && !saving && <p className="text-emerald-700">{t.common.saved}</p>}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? t.common.saving : t.common.saveChanges}
            </button>
          </div>
        </div>
      </Card>
    </form>
  );
}
