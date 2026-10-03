import { SignInPage } from "../Portal";
import { AuthProvider } from "../AuthContext";
import { pageMeta } from "../content/seo";
export const meta = () =>
  pageMeta("Client portal", "Your private project space.", "/sign-in", true);
export default function Page() {
  return (
    <AuthProvider>
      <SignInPage />
    </AuthProvider>
  );
}
