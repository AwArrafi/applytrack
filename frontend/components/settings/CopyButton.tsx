"use client";

import { useState } from "react";

/** Copies `text` to the clipboard and says so for two seconds. */
export function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
    >
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
