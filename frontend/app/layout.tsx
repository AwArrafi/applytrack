import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { getMockDashboardSummary, MOCK_USER } from "@/lib/mock-data";
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
  const summary = getMockDashboardSummary();
  const navCounts = {
    applications: summary.total_applications,
    upcomingInterviews: summary.upcoming_interview_count,
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <AppShell navCounts={navCounts} userName={MOCK_USER.name}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
