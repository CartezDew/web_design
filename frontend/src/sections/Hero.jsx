import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import headshot from "../../assets/headshot.webp";
import "./Hero.css";
export default function Hero() {
  return (
    <section className="hero shell" id="top">
      <div className="hero-main">
        <div className="hero-copy">
          <h1>
            Thoughtful
            <br />
            websites.
            <br />
            <span>
              Built around
              <br className="desktop-break" /> your business.
            </span>
          </h1>
          <p>
            I’m Cartez. I design and build websites, apps, and digital tools
            that help ambitious businesses move forward.
          </p>
          <div className="actions">
            <Link className="button" to="/#book">
              Book a free call <ArrowUpRight size={20} />
            </Link>
            <Link className="text-link" to="/#work">
              Explore my work
            </Link>
          </div>
        </div>
        <figure className="hero-portrait">
          <div className="portrait-frame">
            <img
              src={headshot}
              alt="Cartez Dewberry, designer, developer and founder"
              width="819"
              height="1024"
              fetchPriority="high"
            />
          </div>
          <span className="hero-spark" aria-hidden="true">
            ✦
          </span>
          <figcaption>
            <strong>Cartez Dewberry</strong>
            <span>Designer, developer & founder</span>
          </figcaption>
        </figure>
      </div>
      <div className="hero-values">
        <span>Custom design</span>
        <i aria-hidden="true">/</i>
        <span>Solid engineering</span>
        <i aria-hidden="true">/</i>
        <span>A real person in your corner</span>
      </div>
    </section>
  );
}
