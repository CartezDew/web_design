import { ArrowUpRight } from "lucide-react";
import headshot from "../../assets/headshot.webp";
import Reveal from "../Reveal";
import "./About.css";
export default function About() {
  return (
    <section className="about section shell" id="about">
      <Reveal className="about-portrait">
        <img
          src={headshot}
          alt="Meet Cartez Dewberry"
          width="819"
          height="1024"
          loading="lazy"
        />
      </Reveal>
      <Reveal className="about-copy">
        <p className="section-label">
          <span>03</span> The person behind the work
        </p>
        <h2>Good work starts with a real conversation.</h2>
        <p>
          I’m Cartez Dewberry, a software engineer and founder. A Marine veteran
          and former owner-operator, I bring the same care and ownership to
          every project that I learned from building Marc’d: solving real
          problems, serving people, and seeing things through.
        </p>
        <p>
          Marc’d grew from lived experience and my father’s legacy in trucking.
          Building it reinforced something I bring to every client project:
          technology works best when you understand the people it serves.
        </p>
        <p>
          My background connects software engineering, business, and analytics.
          I completed General Assembly’s Full Stack Software Engineering
          Immersive and bring a practical, thoughtful approach to design, data,
          and development.
        </p>
        <a
          className="text-link"
          href="https://www.linkedin.com/in/cartez-dewberry/"
          target="_blank"
          rel="noreferrer"
        >
          Explore my experience <ArrowUpRight size={17} />
        </a>
      </Reveal>
    </section>
  );
}
