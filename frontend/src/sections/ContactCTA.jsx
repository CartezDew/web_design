import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Reveal from "../Reveal";
import "./ContactCTA.css";
export default function ContactCTA() {
  return (
    <section className="contact-cta section" id="contact">
      <div className="shell">
        <p className="section-label">Let’s make something good</p>
        <Reveal>
          <h2>Your next chapter starts with a conversation.</h2>
        </Reveal>
        <Reveal as="p" className="contact-cta-copy" distance={18}>
          Tell me what you have in mind. We’ll figure out the right next step,
          together.
        </Reveal>
        <Reveal className="actions" distance={16}>
          <Link className="button button--red" to="/#book">
            Book a free call <ArrowUpRight size={18} />
          </Link>
          <Link className="text-link" to="/#start-a-project">
            Send a project brief
          </Link>
        </Reveal>
        <Reveal className="contact-cta-details" distance={14}>
          <div>
            <span>Email</span>
            <a href="mailto:letsbuild@marcdbycartez.com">
              letsbuild@marcdbycartez.com
            </a>
          </div>
          <div>
            <span>Phone</span>
            <a href="tel:+14043541272">404-354-1272</a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
