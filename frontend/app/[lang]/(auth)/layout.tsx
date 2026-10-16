import { LogoMark } from "@/components/ui/icons";
import { LanguageSwitcher } from "@/components/layout/Sidebar";

/** Sign-in and sign-up: a centered card, no app navigation. */
export default function AuthLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <main className="flex min-h-full flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <LogoMark className="size-10 text-primary-600" />
        <span className="text-xl font-semibold tracking-tight text-ink">ApplyTrack</span>
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">{children}</div>
      <div className="mt-4 w-full max-w-sm">
        <LanguageSwitcher />
      </div>
    </main>
  );
}
