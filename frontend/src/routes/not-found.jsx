import { NotFound } from "../pages/DetailPages";
import { pageMeta } from "../content/seo";
export const meta = () =>
  pageMeta(
    "Page not found",
    "Let’s get you back to something useful.",
    "/404",
    true,
  );
export default NotFound;
