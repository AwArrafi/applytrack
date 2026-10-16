import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { AppShell } from "@/components/layout/AppShell";
import { apiGet } from "@/lib/api";
import { USER_NAME } from "@/lib/constants";
import { LOCALES } from "@/lib/i18n";
import { getServerI18n } from "@/lib/i18n/server";
import type { DashboardSummary } from "@/lib/types";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// One prerendered shell per language.
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: { default: "ApplyTrack", template: "%s · ApplyTrack" },
    description: t.meta.description,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const { locale } = await getServerI18n();
  // Not awaited: the sidebar shows the counts once they arrive, and hides them if the API is down.
  const navCounts = apiGet<DashboardSummary>("/dashboard/")
    .then((s) => ({ applications: s.total_applications, upcomingInterviews: s.upcoming_interview_count }))
    .catch(() => null);

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <I18nProvider locale={locale}>
          <AppShell navCounts={navCounts} userName={USER_NAME}>
            {children}
          </AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
