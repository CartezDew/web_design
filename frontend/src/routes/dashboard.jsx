import { DashboardPage } from "../Portal";
import { AuthProvider } from "../AuthContext";
import { pageMeta } from "../content/seo";
export const meta = () =>
  pageMeta("Client portal", "Your private project space.", "/dashboard", true);
export default function Page() {
  return (
    <AuthProvider>
      <DashboardPage />
    </AuthProvider>
  );
}
