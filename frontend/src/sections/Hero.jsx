import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  Linkedin,
  Hammer,
  Search,
  ShieldCheck,
  CreditCard,
  CalendarCheck,
} from "lucide-react";
import { Fragment, useEffect } from "react";
import Sketch from "../components/Sketch";
import useHeroEntrance from "./useHeroEntrance";
import { motionEnabled } from "../motion";
import "./Hero.css";
export default function Hero({ onPlan }) {
  const [scope, visual] = useHeroEntrance();
  useCardTilt(visual);
  return (
    <section className="hero-section surface--paper" id="top" ref={scope}>
      <div className="hero shell">
        <div className="hero-copy">
          <p className="hero-eyebrow">
            <span className="hero-eyebrow-chip" aria-hidden="true">
              <Hammer size={14} strokeWidth={2.25} />
            </span>
            Full-stack web developer for small businesses.
          </p>
          <h1 aria-label="Websites that make small businesses feel big!">
            {"Websites that make small businesses feel"
              .split(" ")
              .map((word, index) => (
                <Fragment key={word}>
                  <span className="hero-headline-word" style={{ "--i": index }}>
                    {word}
                  </span>{" "}
                </Fragment>
              ))}
            <em className="hero-growth-word">big!</em>
          </h1>
          <p className="hero-intro">
            I design and build custom websites, booking systems, and
            integrations that help small businesses earn trust and turn visitors
            into inquiries, bookings, and sales. You work directly with me, from
            the first idea to launch.
          </p>
          <Sketch variant="signature" className="hero-signature" />
          <div className="hero-actions">
            <Link
              className="button button--red button--lg hero-primary"
              style={{ "--i": 0 }}
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
            <Link
              className="button button--outline hero-secondary"
              to="/#work"
              style={{ "--i": 1 }}
            >
              See my work <ChevronRight size={17} />
            </Link>
            <a
              className="text-link text-link--linkedin"
              style={{ "--i": 2 }}
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
          {/* A faint grid the mockup sits on, under the dashed orbit lines. */}
          <div className="hero-blueprint" aria-hidden="true" />
          <div className="orbit orbit--one" />
          <div className="orbit orbit--two" />
          <div className="hero-stage">
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
          </div>
          <HeroSeal />
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

// Veteran-owned stamp: the words run around the ring on an SVG text path.
function HeroSeal() {
  return (
    <svg className="hero-seal" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <path
          id="hero-seal-ring"
          d="M60 60m-43 0a43 43 0 1 1 86 0a43 43 0 1 1-86 0"
        />
      </defs>
      <circle className="hero-seal-plate" cx="60" cy="60" r="57" />
      <circle className="hero-seal-rule" cx="60" cy="60" r="31" />
      <g className="hero-seal-ring">
        <text>
          <textPath href="#hero-seal-ring" textLength="268">
            VETERAN-OWNED ★ BUILT IN ATLANTA ★ MARC-D GROUP ★
          </textPath>
        </text>
      </g>
      <text className="hero-seal-mark" x="60" y="67" textAnchor="middle">
        C/D
      </text>
    </svg>
  );
}

// Desktop only: the mockup leans toward the cursor, at most 4deg. One pointer
// listener on the stage, batched into a frame; off for touch and reduced motion.
const MAX_TILT = 4;
function useCardTilt(visual) {
  useEffect(() => {
    const stage = visual.current;
    if (
      !stage ||
      !motionEnabled() ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    )
      return;
    let frame = 0;
    const move = (event) => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        stage.style.setProperty(
          "--tilt-x",
          `${(x * MAX_TILT * 2).toFixed(2)}deg`,
        );
        stage.style.setProperty(
          "--tilt-y",
          `${(-y * MAX_TILT * 2).toFixed(2)}deg`,
        );
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      stage.style.removeProperty("--tilt-x");
      stage.style.removeProperty("--tilt-y");
    };
    stage.addEventListener("pointermove", move, { passive: true });
    stage.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerleave", leave);
    };
  }, [visual]);
}
