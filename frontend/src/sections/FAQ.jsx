import { Plus } from "lucide-react";
import { faqs } from "../content/site";
import "./FAQ.css";
export default function FAQ() {
  return (
    <section className="faq section shell" id="faq">
      <div>
        <p className="section-label">
          <span>06</span> Good to know
        </p>
        <h2>A few things you might be wondering.</h2>
        <p>Clear expectations make better projects.</p>
      </div>
      <div className="faq-list">
        {faqs.map((faq) => (
          <details key={faq.question}>
            <summary>
              {faq.question}
              <Plus size={19} />
            </summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
