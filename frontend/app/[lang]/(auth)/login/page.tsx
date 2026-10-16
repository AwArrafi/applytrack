import { AuthForm } from "@/components/auth/AuthForm";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t.auth.loginTitle };
}

export default function Page() {
  return <AuthForm mode="login" />;
}
