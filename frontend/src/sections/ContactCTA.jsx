import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Reveal from "../Reveal";
import "./ContactCTA.css";
export default function ContactCTA() {
  return (
    <section className="contact-cta section" id="contact">
      <div className="shell">
        <p className="section-label">
          <span>07</span> Let’s make something good
        </p>
        <Reveal>
          <h2>Your next chapter starts with a conversation.</h2>
        </Reveal>
        <p className="contact-cta-copy">
          Tell me what you have in mind. We’ll figure out the right next step,
          together.
        </p>
        <div className="actions">
          <Link className="button button--red" to="/#book">
            Book a free call <ArrowUpRight size={18} />
          </Link>
          <Link className="text-link" to="/#start-a-project">
            Send a project brief
          </Link>
        </div>
        <div className="contact-cta-details">
          <div>
            <span>Email</span>
            <a href="mailto:info@marc-d.com">info@marc-d.com</a>
          </div>
          <div>
            <span>Phone</span>
            <a href="tel:+14043541272">404-354-1272</a>
          </div>
        </div>
      </div>
    </section>
  );
}
