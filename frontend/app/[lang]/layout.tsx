import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { LOCALES } from "@/lib/i18n";
import { getServerI18n } from "@/lib/i18n/server";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// cover: the page may draw under the iPhone notch and home bar; the top bar and the bottom tab bar
// pad themselves with env(safe-area-inset-*). Pinch-zoom stays allowed.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

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

  return (
    // Browser extensions (e.g. QuillBot, Grammarly) add attributes to <html> before React loads;
    // this ignores attribute differences on this one tag only, not on its children.
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
