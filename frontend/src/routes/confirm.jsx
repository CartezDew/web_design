import SiteLayout from "../components/SiteLayout";
import ConfirmationPage from "../pages/ConfirmationPage";
import { pageMeta } from "../content/seo";
export const meta = () =>
  pageMeta(
    "Confirm your request",
    "Confirm your email or consultation with Cartez.",
    "/confirm",
    true,
  );
export default function Page() {
  return (
    <SiteLayout>
      <ConfirmationPage />
    </SiteLayout>
  );
}
