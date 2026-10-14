import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;
  description?: string;
  /** Optional element shown on the right of the title row (e.g. a link). */
  action?: ReactNode;
  /** Set to false for content that manages its own padding, like tables. */
  padded?: boolean;
  className?: string;
  children: ReactNode;
}

/** White surface with a border; the base of most sections. */
export function Card({ title, description, action, padded = true, className = "", children }: CardProps) {
  return (
    <section className={`rounded-xl border border-line bg-surface shadow-card ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-4 border-b border-line-soft px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="flex items-center gap-2 font-semibold tracking-tight text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? "p-5 sm:p-6" : undefined}>{children}</div>
    </section>
  );
}
