import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { services } from "../content/site";
import { JsonLd, siteUrl } from "../content/seo";
import Reveal from "../Reveal";
import "./Services.css";
const short = [
  "Strategic, modern websites that look great and do real work.",
  "Custom applications built around the way your business works.",
  "Connect your tools and data. Automate what matters.",
  "Help people and search systems understand your business.",
  "Practical AI tools and creative content with a clear purpose.",
  "Stronger foundations for a safer, more reliable business.",
  "Get your project live, then keep moving forward.",
];
export default function Services() {
  return (
    <section className="services section" id="services">
      <div className="shell services-layout">
        <Reveal className="services-intro">
          <p className="section-label">
            <span>02</span> Services
          </p>
          <h2>
            The right tools.
            <br />
            For your next chapter.
          </h2>
          <p>
            From your first website to the systems behind your business. I
            connect design and development to what you actually need.
          </p>
        </Reveal>
        <div className="service-list">
          {services.map((service, i) => (
            <Reveal key={service.slug} delay={i * 0.03}>
              <details
                className="service-detail"
                id={`service-${service.slug}`}
              >
                <summary className="service-row">
                  <span className="service-number">{service.number}</span>
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
              name: "Cartez Dewberry",
              url: siteUrl,
            },
          })),
        }}
      />
    </section>
  );
}
