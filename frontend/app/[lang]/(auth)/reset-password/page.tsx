import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/PasswordForms";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t.auth.resetTitle };
}

// Opened from the emailed link: /reset-password?uid=…&token=…
export default function Page({ searchParams }: PageProps<"/[lang]/reset-password">) {
  return (
    <Suspense>
      <ResetFromLink searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetFromLink({ searchParams }: { searchParams: PageProps<"/[lang]/reset-password">["searchParams"] }) {
  const { uid, token } = await searchParams;
  return <ResetPasswordForm uid={typeof uid === "string" ? uid : ""} token={typeof token === "string" ? token : ""} />;
}
