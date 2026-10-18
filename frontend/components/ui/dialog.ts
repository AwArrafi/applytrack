// Shared classes for the app's modal <dialog>s: a centred card from sm up, the whole screen on
// phones, where the title bar and the buttons stay in view while the form scrolls between them.

/** The <dialog> itself. Scrolls when the form is taller than the screen. */
export const DIALOG_CLASS =
  "m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl max-sm:m-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0";

/** The form inside: fills a phone's screen so the buttons sit at the bottom even when the form is short. */
export const DIALOG_FORM_CLASS = "max-sm:flex max-sm:min-h-full max-sm:flex-col";

/** Title bar (add your own padding); clears the iPhone notch. */
export const DIALOG_HEADER_CLASS =
  "sticky top-0 z-10 border-b border-line bg-surface max-sm:pt-[calc(1rem+env(safe-area-inset-top))]";

/** Button bar (add your own padding); clears the iPhone home bar. */
export const DIALOG_FOOTER_CLASS =
  "sticky bottom-0 z-10 border-t border-line bg-surface max-sm:mt-auto max-sm:pb-[calc(0.875rem+env(safe-area-inset-bottom))]";
