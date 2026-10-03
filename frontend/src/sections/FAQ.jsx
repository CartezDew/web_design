import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { faqs } from "../content/site";
import Reveal from "../Reveal";
import "./FAQ.css";
export default function FAQ() {
  return (
    <section className="faq-section" id="faq">
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
          {faqs.map((faq) => (
            <details key={faq.question} className="faq-item">
              <summary>
                <strong>{faq.question}</strong>
                <ChevronDown size={19} />
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
