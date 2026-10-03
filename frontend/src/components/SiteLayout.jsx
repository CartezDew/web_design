import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu, X } from "lucide-react";
import AboutMenu from "./AboutMenu";
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
  useEffect(() => setOpen(false), [pathname, hash]);
  useEffect(() => {
    const esc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);
  return (
    <header className="site-header">
      <div className="shell header-inner">
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
          <AboutMenu navigationOpen={open} onNavigate={() => setOpen(false)} />
          <Link
            to="/#pricing"
            onClick={() => setOpen(false)}
            aria-current={
              pathname === "/" && hash === "#pricing" ? "location" : undefined
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
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="site-footer shell">
      <div className="footer-top">
        <div>
          <Logo />
          <p>Thoughtful design. Built with purpose.</p>
        </div>
        <nav aria-label="Footer navigation">
          {[
            ["/#work", "Work"],
            ["/#services", "Services"],
            ["/#about", "About"],
            ["/#contact", "Contact"],
            ["/sign-in", "Client sign in"],
          ].map(([to, label]) => (
            <Link key={to} to={to}>
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
          <Link to="/#privacy">Privacy</Link>
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
      if (target instanceof HTMLDetailsElement) target.open = true;
      target.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash, key]);
  return null;
}
