import { ForgotPasswordForm } from "@/components/auth/PasswordForms";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t.auth.forgotTitle };
}

export default function Page() {
  return <ForgotPasswordForm />;
}
