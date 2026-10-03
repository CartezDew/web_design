import { ResetPasswordPage } from "../Portal";
import { AuthProvider } from "../AuthContext";
import { pageMeta } from "../content/seo";
export const meta = () =>
  pageMeta(
    "Client portal",
    "Your private project space.",
    "/reset-password",
    true,
  );
export default function Page() {
  return (
    <AuthProvider>
      <ResetPasswordPage />
    </AuthProvider>
  );
}
