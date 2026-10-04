import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  Linkedin,
  Sparkles,
  Search,
  ShieldCheck,
  CreditCard,
  CalendarCheck,
} from "lucide-react";
import { Fragment } from "react";
import Sketch from "../components/Sketch";
import useHeroEntrance from "./useHeroEntrance";
import "./Hero.css";
export default function Hero({ onPlan }) {
  const [scope, visual] = useHeroEntrance();
  return (
    <section className="hero-section surface--paper" id="top" ref={scope}>
      <div className="hero shell">
        <div className="hero-copy">
          <p className="hero-eyebrow">
            <span className="hero-eyebrow-chip" aria-hidden="true">
              <Sparkles size={14} />
            </span>
            Full-stack web developer for small businesses.
          </p>
          <h1 aria-label="Websites that make small businesses feel big!">
            {"Websites that make small businesses feel"
              .split(" ")
              .map((word) => (
                <Fragment key={word}>
                  <span className="hero-headline-word">{word}</span>{" "}
                </Fragment>
              ))}
            <em className="hero-growth-word">
              big!
              <Sketch variant="spark" className="hero-spark" />
            </em>
          </h1>
          <p className="hero-intro">
            I’m Cartez. I design and build custom websites, booking systems, and
            integrations that help small businesses earn trust and turn visitors
            into inquiries, bookings, and sales. You work directly with me, from
            the first idea to launch.
          </p>
          <div className="hero-actions">
            <Link
              className="button button--red button--lg hero-primary"
              data-analytics-id="cta_hero_plan"
              to="/#start-a-project"
              aria-haspopup="dialog"
              onClick={(event) => {
                if (
                  onPlan &&
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.shiftKey &&
                  !event.altKey
                ) {
                  event.preventDefault();
                  onPlan(event.currentTarget);
                }
              }}
            >
              Plan your website <ArrowRight size={18} />
            </Link>
            <Link className="button button--outline hero-secondary" to="/#work">
              See my work <ChevronRight size={17} />
            </Link>
            <a
              className="text-link text-link--linkedin"
              href="https://www.linkedin.com/in/cartez-dewberry/"
              target="_blank"
              rel="noreferrer"
              aria-label="Cartez Dewberry on LinkedIn"
            >
              <Linkedin size={17} /> LinkedIn
            </a>
          </div>
          <p className="reassurance hero-reassurance">
            <Sketch variant="arrow" className="hero-arrow" />
            <CalendarCheck size={15} aria-hidden="true" />
            Free 30-minute consultation. Clear scope before work begins.
          </p>
          <div className="trust-row">
            <span className="tag">Custom design</span>
            <span className="tag">Full-stack build</span>
            <span className="tag">Clear pricing</span>
          </div>
        </div>
        <div
          className="hero-visual"
          ref={visual}
          role="img"
          aria-label="Illustration of a small-business website with online booking, payments, AI search visibility, and security built in"
        >
          <div className="orbit orbit--one" />
          <div className="orbit orbit--two" />
          <div className="hero-card">
            <div className="browser-bar">
              <div className="browser-dots">
                <i />
                <i />
                <i />
              </div>
              <span className="browser-url">yourbusiness.com</span>
            </div>
            <div className="mock-nav">
              <b />
              <span>
                <i />
                <i />
                <i />
              </span>
              <em>Book now</em>
            </div>
            <div className="mock-label">YOUR BUSINESS, ONLINE</div>
            <div className="mock-title">Booked. Paid. Found.</div>
            <div className="mock-line" />
            <div className="mock-line mock-line--short" />
            <div className="mock-stats">
              <div>
                <strong>24/7</strong>
                <span>Online booking</span>
              </div>
              <div>
                <strong>+38%</strong>
                <span>New leads</span>
              </div>
              <div>
                <strong>AI</strong>
                <span>Search ready</span>
              </div>
            </div>
            <div className="mock-button">BOOK A SERVICE →</div>
          </div>
          <span className="floating-note floating-note--top">
            <Search size={15} /> Found on Google + ChatGPT
          </span>
          <span className="floating-note floating-note--side">
            <ShieldCheck size={15} /> Secure · bots blocked
          </span>
          <span className="floating-note floating-note--bottom">
            <CreditCard size={15} /> Booking + payments built in
          </span>
        </div>
      </div>
    </section>
  );
}
