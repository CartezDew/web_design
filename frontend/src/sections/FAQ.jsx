import { track } from "../analytics/client";
import { Link } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
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
            in <em>plain</em> language.
          </h2>
          <p>
            Clear expectations make better projects. Timelines and prices are
            estimates and may change when the requested scope, content,
            integrations, or revision needs change.
          </p>
          <Link className="button button--red" to="/#book">
            Still have a question? Book a free call <ChevronRight size={17} />
          </Link>
          <FaqIllustration />
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
                <span className="faq-q" aria-hidden="true">
                  Q{index + 1}
                </span>
                <strong>{faq.question}</strong>
                <Plus size={19} />
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

// Hand-drawn question-and-answer bubbles that fill the intro column on wide
// screens. Strokes draw on with the intro's reveal (see Sketch.css); hidden on
// phones and small tablets.
function FaqIllustration() {
  return (
    <svg
      className="faq-illustration sketch"
      viewBox="0 0 320 250"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="faq-bubble faq-bubble--ask"
        d="M58 34C110 26 190 28 222 40c18 8 16 80 8 110-6 20-60 24-110 20l-38-2-26 32 6-34c-22-4-32-16-32-46-2-40 0-80 28-86Z"
        pathLength="1"
      />
      <path
        className="faq-mark"
        d="M106 84c0-20 14-30 30-30 18 0 30 12 30 26 0 16-12 22-22 28-8 4-10 10-10 20"
        pathLength="1"
      />
      <circle className="faq-dot" cx="134" cy="142" r="5.5" />
      <path
        className="faq-bubble faq-bubble--answer"
        d="M196 150c34-10 86-8 96 10 10 20 4 46-16 54-18 6-40 6-56 2l-16 20 2-24c-16-8-24-26-20-42 2-10 4-16 10-20Z"
        pathLength="1"
      />
      <path className="faq-line" d="M241 164l-2 26" pathLength="1" />
      <circle className="faq-dot faq-dot--ink" cx="238.5" cy="202" r="4" />
      <path
        className="faq-line"
        d="M268 52v20M258 62h20M290 96l8 8M298 96l-8 8M28 214c18-6 34-6 52 0"
        pathLength="1"
      />
    </svg>
  );
}
