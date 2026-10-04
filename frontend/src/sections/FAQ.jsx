import { track } from "../analytics/client";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { faqs } from "../content/site";
import { JsonLd, siteUrl } from "../content/seo";
import Reveal from "../Reveal";
import "./FAQ.css";
export default function FAQ() {
  return (
    <section className="faq-section surface--deep" id="faq">
      <div className="faq shell">
        <Reveal className="faq-intro">
          <p className="section-label">Good to know</p>
          <h2>
            Questions, answered
            <br />
            in plain language.
          </h2>
          <p>
            Clear expectations make better projects. Timelines and prices are
            estimates and may change when the requested scope, content,
            integrations, or revision needs change.
          </p>
          <Link className="text-link" to="/#book">
            Still have a question? Book a free call <ChevronRight size={17} />
          </Link>
        </Reveal>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <details
              key={faq.question}
              className="faq-item"
              onToggle={(event) => {
                if (event.currentTarget.open)
                  track("faq_open", { faq_id: `faq_${index + 1}` });
              }}
            >
              <summary>
                <strong>{faq.question}</strong>
                <ChevronDown size={19} />
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${siteUrl}/#faq-page`,
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }}
      />
    </section>
  );
}
