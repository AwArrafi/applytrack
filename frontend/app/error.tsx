"use client"; // Error boundaries must be Client Components

import { Card } from "@/components/ui/Card";

// Most likely cause today: the Django API isn't running.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Card>
      <div className="py-10 text-center">
        <h1 className="font-semibold text-ink">Couldn&apos;t load your data</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          The ApplyTrack API didn&apos;t respond. Make sure the Django server is running, then try again.
        </p>
        <code className="mt-3 inline-block rounded bg-surface-muted px-2 py-1 font-mono text-xs text-ink">
          backend/.venv/Scripts/python backend/manage.py runserver 8001
        </code>
        {error.digest && <p className="mt-2 font-mono text-[11px] text-ink-subtle">Error {error.digest}</p>}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            Try again
          </button>
        </div>
      </div>
    </Card>
  );
}
