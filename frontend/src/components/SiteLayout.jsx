import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu, X } from "lucide-react";
import AboutMenu from "./AboutMenu";
import headshot from "../../assets/headshot.webp";
import "./SiteLayout.css";
export function Logo() {
  return (
    <Link className="wordmark" to="/" aria-label="Cartez Dewberry home">
      C<span>/</span>D
    </Link>
  );
}
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const sentinel = useRef(null);
  useEffect(() => setOpen(false), [pathname, hash]);
  // The pill tightens once the page leaves the top. A sentinel observer, not a scroll listener.
  useEffect(() => {
    const element = sentinel.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) =>
      setScrolled(!entry.isIntersecting),
    );
    io.observe(element);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const esc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);
  return (
    <>
      <div className="header-sentinel" ref={sentinel} aria-hidden="true" />
      <header className="site-header" data-scrolled={scrolled || undefined}>
        <div className="shell">
          <div className="header-inner">
            <Logo />
            <button
              className="menu-button"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              aria-controls="site-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
            <nav
              id="site-navigation"
              aria-label="Main navigation"
              className={open ? "site-nav is-open" : "site-nav"}
            >
              {[
                ["/#work", "Work"],
                ["/#services", "Services"],
              ].map(([to, text]) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  aria-current={
                    pathname === "/" && hash === to.slice(1)
                      ? "location"
                      : undefined
                  }
                >
                  {text}
                </Link>
              ))}
              <AboutMenu
                navigationOpen={open}
                onNavigate={() => setOpen(false)}
              />
              <Link
                to="/#pricing"
                onClick={() => setOpen(false)}
                aria-current={
                  pathname === "/" && hash === "#pricing"
                    ? "location"
                    : undefined
                }
              >
                Pricing
              </Link>
              <Link
                className="button button--red nav-cta"
                to="/#contact"
                onClick={() => setOpen(false)}
              >
                Let’s talk <ArrowUpRight size={16} />
              </Link>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
export function SiteFooter() {
  return (
    <footer className="site-footer shell" id="site-footer">
      <div className="footer-signoff">
        <p className="footer-signoff-line marker-line">
          Thoughtful design. <em>Built</em> with purpose.
        </p>
        <Link className="button button--red footer-signoff-cta" to="/#contact">
          Let’s talk <ArrowUpRight size={16} />
        </Link>
        {/* Wide screens: the nav already carries "Let's talk", so the sign-off
            pairs with a small portrait instead. Hidden at 760px and below. */}
        <figure className="footer-portrait" aria-hidden="true">
          <img
            src={headshot}
            alt=""
            width="819"
            height="1024"
            loading="lazy"
            decoding="async"
          />
          <figcaption>Cartez · Founder</figcaption>
        </figure>
      </div>
      <div className="footer-top">
        <div>
          <Logo />
          <p>Full-stack web developer for small businesses.</p>
        </div>
        <nav aria-label="Footer navigation">
          {[
            ["/#work", "Work"],
            ["/#services", "Services"],
            ["/#about", "About"],
            ["/#contact", "Contact"],
            ["/sign-in", "Client sign in"],
          ].map(([to, label]) => (
            <Link key={to} to={to} reloadDocument={to === "/sign-in"}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Marc-D Group LLC</p>
        <div>
          <a
            href="https://www.linkedin.com/in/cartez-dewberry/"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn ↗
          </a>
          <Link to="/#analytics-settings" data-analytics-ignore>
            Privacy settings
          </Link>
        </div>
      </div>
    </footer>
  );
}
export default function SiteLayout({ children }) {
  return (
    <>
      <SectionNavigation />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}

function SectionNavigation() {
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    if (pathname !== "/" || !hash) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      const disclosure = target.closest("details");
      if (disclosure) disclosure.open = true;
      target.scrollIntoView({ block: "start" });
      if (hash === "#analytics-settings")
        target.querySelector("h3")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash, key]);
  return null;
}
