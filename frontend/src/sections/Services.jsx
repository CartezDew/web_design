import { track } from "../analytics/client";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { services } from "../content/site";
import { JsonLd, siteUrl } from "../content/seo";
import { servedCountry, servedRegions } from "../content/locations";
import websiteShowcase from "../../assets/websites/website_images.webp";
import Reveal from "../Reveal";
import "./Services.css";
const short = [
  "Strategic, modern websites that look great and do real work.",
  "Custom applications built around the way your business works.",
  "Connect your tools and data. Automate what matters.",
  "SEO for search engines. Clear answers for AI search (AEO).",
  "Practical AI tools and creative content with a clear purpose.",
  "Stronger foundations for a safer, more reliable business.",
  "Get your project live, then keep moving forward.",
];
export default function Services() {
  return (
    <section className="services section" id="services">
      <div className="shell services-layout">
        <Reveal className="services-intro" direction="left" distance={18}>
          <p className="section-label">What I do</p>
          <h2>
            Useful design.
            <br />
            Solid engineering.
          </h2>
          <p>
            From your first website to the systems behind your business. I
            connect design and development to what you actually need.
          </p>
          <img
            className="services-showcase"
            src={websiteShowcase}
            alt="Cartez Dewberry website displayed responsively on a laptop and mobile phone"
            width="560"
            height="355"
            loading="lazy"
          />
        </Reveal>
        <div className="service-list">
          {services.map((service, i) => (
            <Reveal key={service.slug} direction="right" distance={18}>
              <details
                className="service-detail"
                id={`service-${service.slug}`}
                onToggle={(event) => {
                  if (event.currentTarget.open)
                    track("service_view", { service_interest: service.slug });
                }}
              >
                <summary className="service-row">
                  <div>
                    <h3>
                      {i === 5
                        ? "Security + protection"
                        : i === 3
                          ? "SEO + AI search"
                          : service.title}
                    </h3>
                    <p>{short[i]}</p>
                  </div>
                  <ChevronDown size={22} />
                </summary>
                <div className="service-description">
                  <p>{service.copy}</p>
                  <p>{service.value}</p>
                  <h4>What we can build together</h4>
                  <ul>
                    {service.includes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p>
                    <strong>Related experience:</strong> {service.proof}
                  </p>
                  <Link className="text-link" to="/#start-a-project">
                    Tell me about your project ↗
                  </Link>
                </div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": services.map((service) => ({
            "@type": "Service",
            "@id": `${siteUrl}/#service-${service.slug}`,
            name: service.title,
            description: service.copy,
            url: `${siteUrl}/#service-${service.slug}`,
            provider: {
              "@type": "Person",
              "@id": `${siteUrl}/#cartez`,
              name: "Cartez Dewberry",
              url: siteUrl,
            },
            areaServed: [
              { "@type": "Country", name: servedCountry },
              ...servedRegions.map(({ name }) => ({ "@type": "State", name })),
            ],
          })),
        }}
      />
    </section>
  );
}
