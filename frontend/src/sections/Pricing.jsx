import { track } from "../analytics/client";
import { packages as analyticsPackages } from "../analytics/catalog";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check } from "lucide-react";
import { packages } from "../content/site";
import Reveal from "../Reveal";
import "./Pricing.css";
export default function Pricing({ onPlan }) {
  return (
    <section className="pricing section shell surface--paper" id="pricing">
      <p className="section-label">Clear starting points</p>
      <Reveal className="section-heading" distance={20}>
        <h2>
          Start where <em>you</em> are.
        </h2>
        <p>
          Choose a starting point and let’s build from there. Every project gets
          a clear scope before the work begins.
        </p>
      </Reveal>
      <div className="pricing-grid">
        {packages.map((item, i) => (
          <Reveal
            as="article"
            className={
              item.featured ? "price-plan price-plan--featured" : "price-plan"
            }
            key={item.name}
          >
            {item.featured && <span className="price-flag">Most popular</span>}
            <h3>{item.name}</h3>
            <p className="price-description">{item.description}</p>
            <p className="price-amount">
              {item.price}
              <span>+</span>
            </p>
            <span className="price-note">Starting price · {item.timeline}</span>
            <ul>
              {item.features.map((feature) => (
                <li key={feature}>
                  <Check size={15} />
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              className={
                item.featured ? "button button--red" : "button button--outline"
              }
              to={`/?package=${item.name.toLowerCase()}#start-a-project`}
              aria-haspopup="dialog"
              data-analytics-id={`cta_package_${item.name.toLowerCase()}`}
              onClick={(event) => {
                track("form_choice", {
                  form_type: "brief",
                  field_id: "package",
                  package_tier: analyticsPackages[item.name],
                });
                if (
                  onPlan &&
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.shiftKey &&
                  !event.altKey
                ) {
                  event.preventDefault();
                  onPlan(event.currentTarget, item.name);
                }
              }}
            >
              Start a project <ArrowUpRight size={16} />
            </Link>
          </Reveal>
        ))}
      </div>
      <div className="pricing-footnote">
        <p>
          Need an app, e-commerce, authentication, or a custom dashboard?{" "}
          <strong>Custom projects start at $2,500.</strong>
        </p>
        <p>
          Final pricing and timelines depend on scope. Third-party fees are
          separate. Additional work is agreed before it begins.
        </p>
      </div>
    </section>
  );
}
