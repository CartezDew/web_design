import { AcceptInvitationPage } from "../Portal";
import { AuthProvider } from "../AuthContext";
import { pageMeta } from "../content/seo";
export const meta = () =>
  pageMeta(
    "Client portal",
    "Your private project space.",
    "/accept-invitation",
    true,
  );
export default function Page() {
  return (
    <AuthProvider>
      <AcceptInvitationPage />
    </AuthProvider>
  );
}
