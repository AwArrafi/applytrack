import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { apiGet } from "@/lib/api";
import { USER_NAME } from "@/lib/constants";
import type { DashboardSummary } from "@/lib/types";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ApplyTrack",
    template: "%s · ApplyTrack",
  },
  description: "Track job applications, interviews, and your job search progress.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Not awaited: the sidebar shows the counts once they arrive, and hides them if the API is down.
  const navCounts = apiGet<DashboardSummary>("/dashboard/")
    .then((s) => ({ applications: s.total_applications, upcomingInterviews: s.upcoming_interview_count }))
    .catch(() => null);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <AppShell navCounts={navCounts} userName={USER_NAME}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
