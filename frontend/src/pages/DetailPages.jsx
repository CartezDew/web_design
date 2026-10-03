import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import SiteLayout from "../components/SiteLayout";

export function NotFound() {
  return (
    <SiteLayout>
      <section className="shell section page-intro">
        <p className="section-label">404</p>
        <h1>
          This page took
          <br />a different path.
        </h1>
        <p>Let’s get you back to something useful.</p>
        <div className="actions">
          <Link className="button" to="/">
            Back to the homepage <ArrowUpRight size={18} />
          </Link>
          <Link className="text-link" to="/#contact">
            Get in touch
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
