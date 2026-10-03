import { Linkedin, ExternalLink } from "lucide-react";
import headshot from "../../assets/headshot.webp";
import Reveal from "../Reveal";
import "./About.css";
export default function About() {
  return (
    <section className="about-section" id="about">
      <div className="about shell">
        <Reveal
          className="portrait-wrap"
          direction="left"
          distance={20}
          scale={0.98}
        >
          <div className="portrait-accent">
            BUILT
            <br />
            WITH
            <br />
            PURPOSE
          </div>
          <img
            src={headshot}
            alt="Cartez Dewberry, software engineer and founder"
            width="819"
            height="1024"
            loading="lazy"
          />
        </Reveal>
        <Reveal className="about-copy" delay={0.1}>
          <p className="section-label">About me</p>
          <h2>I bring a builder’s mindset to every project.</h2>
          <p className="about-lead">
            I’m Cartez Dewberry—a software engineer, founder, U.S. Marine
            veteran, and former owner-operator.
          </p>
          <p>
            Building Marc’d taught me how to take a meaningful idea from lived
            experience to a real digital product. I bring that same ownership,
            resourcefulness, and care to entrepreneurs and small businesses that
            need a strong web presence without unnecessary overhead.
          </p>
          <div className="skill-tags">
            <span>React</span>
            <span>React Native</span>
            <span>Django + Python</span>
            <span>Node + Express</span>
            <span>PostgreSQL</span>
            <span>Stripe + APIs</span>
            <span>MCP servers</span>
            <span>SEO + AEO</span>
            <span>AI agents</span>
            <span>Security</span>
            <span>UX strategy</span>
            <span>Deployment</span>
          </div>
          <a
            className="linkedin-link"
            href="https://www.linkedin.com/in/cartez-dewberry/"
            target="_blank"
            rel="noreferrer"
          >
            <Linkedin size={18} /> Connect on LinkedIn{" "}
            <ExternalLink size={15} />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
