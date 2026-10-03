import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiRequest } from "../api";
import { sections } from "./catalog";
import { CONSENT_KEY, analyticsConfigured, chooseConsent, disable, durationBucket, eligible, initialize, privacySignal, readChoice, readConsent, refreshConsent, setConfig, setPolicy, track } from "./client";
import "./analytics.css";

function observeSite() {
  const seen = new Set(), visible = new Set(), clocks = new Map();
  const flush = (id, reason) => {
    const start = clocks.get(id);
    clocks.delete(id);
    if (start === undefined) return;
    const seconds = (performance.now() - start) / 1000;
    if (seconds < 1) return;
    track("section_engagement", { section_id: id, duration_seconds: seconds, duration_bucket: durationBucket(seconds), exit_reason: reason });
  };
  const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const id = entry.target.id;
      if (entry.isIntersecting) {
        visible.add(id);
        if (!document.hidden && !clocks.has(id)) clocks.set(id, performance.now());
        if (!seen.has(id) && !document.hidden) { seen.add(id); track("section_view", { section_id: id }); }
      } else { visible.delete(id); flush(id, "scroll"); }
    }
  }, { threshold: 0, rootMargin: "-15% 0px -15% 0px" });
  for (const id of sections) { const el = document.getElementById(id); if (el) observer?.observe(el); }
  const visibility = () => {
    for (const id of visible) {
      if (document.hidden) flush(id, "background");
      else {
        clocks.set(id, performance.now());
        if (!seen.has(id)) { seen.add(id); track("section_view", { section_id: id }); }
      }
    }
  };
  const hide = () => { for (const id of [...clocks.keys()]) flush(id, "exit"); };
  const click = (event) => {
    const el = event.target.closest?.("[data-analytics-id], a[href]");
    if (!el || el.closest("[data-analytics-ignore]")) return;
    const section = el.closest("section[id]")?.id;
    let buttonId = el.dataset.analyticsId, linkType;
    if (!buttonId && el.matches("a[href]")) {
      try {
        const url = new URL(el.href);
        if (["mailto:", "tel:"].includes(url.protocol)) { linkType = url.protocol === "mailto:" ? "email" : "phone"; buttonId = `contact_${linkType}`; }
        else if (url.origin === location.origin && sections.includes(url.hash.slice(1))) { linkType = "section"; buttonId = `nav_${url.hash.slice(1)}`; }
        else if (url.origin === location.origin && url.pathname === "/sign-in") { linkType = "portal"; buttonId = "nav_portal"; }
        else if (url.origin !== location.origin && /^https?:$/.test(url.protocol)) { linkType = "outbound"; buttonId = "nav_outbound"; }
      } catch { /* No URLs or arbitrary button text enter analytics. */ }
    }
    if (buttonId) track("button_click", { button_id: buttonId, section_id: section, link_type: linkType });
  };
  const error = () => track("app_error", { failure_class: "javascript" });
  const rejection = () => track("app_error", { failure_class: "promise" });
  document.addEventListener("click", click, { capture: true, passive: true });
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", hide);
  window.addEventListener("error", error);
  window.addEventListener("unhandledrejection", rejection);
  const navigation = performance.getEntriesByType("navigation")[0];
  if (navigation?.domContentLoadedEventEnd > 0) track("page_performance", { load_seconds: navigation.domContentLoadedEventEnd / 1000 });
  return () => {
    hide(); observer?.disconnect();
    document.removeEventListener("click", click, true);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", hide);
    window.removeEventListener("error", error);
    window.removeEventListener("unhandledrejection", rejection);
  };
}

export default function SiteAnalytics() {
  const { pathname } = useLocation();
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState(null);
  useEffect(() => {
    if (pathname !== "/") { disable(); return; }
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const region = fetch("/analytics-policy", { credentials: "omit", cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : {}).catch(() => ({})).finally(() => clearTimeout(timer));
    Promise.all([apiRequest("/public/analytics-config/"), region]).then(([value, policy]) => {
      if (!active) return;
      setPolicy(policy); setConfig(value); setConsent(readConsent()); setReady(analyticsConfigured());
    }).catch(() => { /* Analytics failure must never block the site or forms. */ });
    return () => { active = false; controller.abort(); clearTimeout(timer); disable(); };
  }, [pathname]);
  useEffect(() => {
    const update = () => setConsent(readConsent());
    const storage = (event) => { if (event.key === CONSENT_KEY || event.key === null) refreshConsent(); };
    window.addEventListener("analytics-consent-change", update);
    window.addEventListener("storage", storage);
    return () => { window.removeEventListener("analytics-consent-change", update); window.removeEventListener("storage", storage); };
  }, []);
  useEffect(() => {
    if (!ready || pathname !== "/" || consent !== true || !initialize()) return;
    return observeSite();
  }, [ready, pathname, consent]);
  return null;
}

export function PrivacyAnalyticsSettings() {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const update = () => { setEnabled(readConsent()); setAvailable(eligible()); setBlocked(privacySignal()); };
    update();
    window.addEventListener("analytics-config-change", update);
    window.addEventListener("analytics-consent-change", update);
    return () => { window.removeEventListener("analytics-config-change", update); window.removeEventListener("analytics-consent-change", update); };
  }, []);
  const choose = (value) => {
    const previous = readChoice();
    chooseConsent(value); setSaved(true);
    if (!value && previous !== false) {
      // The choice is applied first. Only an anonymous counter reaches our server.
      apiRequest("/public/analytics-preference/", { method: "POST", body: JSON.stringify({
        automation_signal: navigator.webdriver === true ? "reported" : "unknown",
      }) }).catch(() => { /* Measurement must never prevent an opt-out. */ });
    }
  };
  return <div id="analytics-settings" className="analytics-settings" data-analytics-ignore>
    <div><h3 tabIndex={-1}>Analytics settings</h3>
      <p>Google Analytics helps improve this website. You can turn it off for this browser; forms and bookings will still work.</p>
    </div>
    <label className="analytics-toggle">
      <span>Website analytics <strong>{enabled && available ? "On" : "Off"}</strong></span>
      <input type="checkbox" role="switch" aria-label="Website analytics" checked={enabled && available} disabled={!available || blocked} onChange={(event) => choose(event.target.checked)} />
    </label>
    {blocked && <p>Your browser’s privacy signal keeps analytics off.</p>}
    {!available && <p>Analytics is currently unavailable and remains off.</p>}
    {saved && <p role="status">Your choice is saved for this browser.</p>}
  </div>;
}
