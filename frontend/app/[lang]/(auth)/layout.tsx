import { LogoMark } from "@/components/ui/icons";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/layout/Sidebar";
import { getServerI18n } from "@/lib/i18n/server";

async function PrivacyLink() {
  const { t } = await getServerI18n();
  return (
    <Link href="/privacy" className="mt-2 block text-center text-xs text-ink-subtle hover:text-ink hover:underline">
      {t.privacy.link}
    </Link>
  );
}

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
        <PrivacyLink />
      </div>
    </main>
  );
}
