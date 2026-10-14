"use client";

// Uses the browser's native <dialog> element: showModal() gives us focus
// trapping, the Escape key, and a backdrop without extra code.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";
import { APPLICATION_STATUSES, WORK_ARRANGEMENT_LABELS } from "@/lib/constants";
import type { WorkArrangement } from "@/lib/types";

interface AddApplicationDialogProps {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  "h-9 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink placeholder:text-ink-subtle focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600";

/**
 * Form for recording a new application. For now it only shows the form:
 * saving is wired up once the Django API exists (Phase 4).
 */
export function AddApplicationDialog({ open, onClose }: AddApplicationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [arrangement, setArrangement] = useState<WorkArrangement>("remote");

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
      <form method="dialog" onSubmit={(event) => event.preventDefault()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <PlusIcon className="size-4" />
            </span>
            <div>
              <h2 id="add-application-title" className="font-semibold">Add Application</h2>
              <p className="text-xs text-ink-muted">Record a new role in your pipeline</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name *" htmlFor="add-company">
              <input id="add-company" name="company_name" required placeholder="e.g. Acme Corp" className={inputClass} />
            </Field>
            <Field label="Role title *" htmlFor="add-role">
              <input id="add-role" name="job_title" required placeholder="e.g. Frontend Engineer" className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pipeline stage" htmlFor="add-status">
              <select id="add-status" name="status" defaultValue="applied" className={inputClass}>
                {APPLICATION_STATUSES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Application URL" htmlFor="add-url">
              <input id="add-url" name="job_url" type="url" placeholder="https://..." className={inputClass} />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1 text-xs font-medium text-ink">Work arrangement</legend>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-line/60 bg-surface-muted p-1 text-center">
              {(Object.keys(WORK_ARRANGEMENT_LABELS) as WorkArrangement[]).map((value) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-md py-1 text-xs font-medium has-focus-visible:outline-2 has-focus-visible:outline-primary-600 ${
                    arrangement === value ? "bg-surface text-primary-700 shadow-sm" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="work_arrangement"
                    value={value}
                    checked={arrangement === value}
                    onChange={() => setArrangement(value)}
                    className="sr-only"
                  />
                  {WORK_ARRANGEMENT_LABELS[value]}
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Notes" htmlFor="add-notes">
            <textarea
              id="add-notes"
              name="notes"
              rows={2}
              placeholder="Referral, salary range, anything to remember..."
              className={`${inputClass} h-auto py-2`}
            />
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-line bg-surface-muted/60 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-muted">Saving is enabled once the backend is connected.</p>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled
              className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save application
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}
