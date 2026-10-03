import SiteLayout from "../components/SiteLayout";
import { pageMeta } from "../content/seo";
import { ManageBooking } from "../pages/BookingPage";
export const meta = () =>
  pageMeta(
    "Book a consultation",
    "A personal conversation about your next project.",
    "/book/manage",
    true,
  );
export default function Page() {
  return (
    <SiteLayout>
      <ManageBooking />
    </SiteLayout>
  );
}
