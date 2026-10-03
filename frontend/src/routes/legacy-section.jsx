import { Navigate, useLocation } from "react-router-dom";
import { legacySections } from "../content/paths";
import { pageMeta } from "../content/seo";
import { NotFound } from "../pages/DetailPages";
export const meta = () =>
  pageMeta("Find your way", "Explore Cartez’s work and services.", "/", true);
export default function LegacySection() {
  const { pathname, search } = useLocation();
  const section = legacySections[pathname.replace(/\/$/, "")];
  return section ? (
    <Navigate replace to={{ pathname: "/", search, hash: `#${section}` }} />
  ) : (
    <NotFound />
  );
}
