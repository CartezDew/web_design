import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiRequest } from "../api";
import { sections } from "./catalog";
import { CONSENT_KEY, analyticsConfigured, chooseConsent, disable, durationBucket, eligible, initialize, readConsent, refreshConsent, setConfig, track } from "./client";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    if (pathname !== "/") { disable(); return; }
    let active = true;
    apiRequest("/public/analytics-config/").then((value) => {
      if (!active) return;
      setConfig(value); setConsent(readConsent()); setReady(analyticsConfigured());
    }).catch(() => { /* Analytics failure must never block the site or forms. */ });
    return () => { active = false; disable(); };
  }, [pathname]);
  useEffect(() => {
    const update = () => setConsent(readConsent());
    const open = () => setSettingsOpen(true);
    const storage = (event) => { if (event.key === CONSENT_KEY || event.key === null) refreshConsent(); };
    window.addEventListener("analytics-consent-change", update);
    window.addEventListener("analytics-settings-open", open);
    window.addEventListener("storage", storage);
    return () => { window.removeEventListener("analytics-consent-change", update); window.removeEventListener("analytics-settings-open", open); window.removeEventListener("storage", storage); };
  }, []);
  useEffect(() => {
    if (!ready || pathname !== "/" || consent !== true || !initialize()) return;
    return observeSite();
  }, [ready, pathname, consent]);
  if (pathname !== "/" || !ready || !eligible() || consent !== null && !settingsOpen) return null;
  const choose = (value) => { chooseConsent(value); setConsent(value); setSettingsOpen(false); };
  return (
    <aside className="analytics-consent" aria-label="Analytics preferences" data-analytics-ignore>
      <div className="analytics-consent-copy">
        <p>Allow Google Analytics cookies to measure visits and improve this site? <a href="/#privacy">Privacy details</a></p>
      </div>
      <div className="analytics-consent-actions">
        <button type="button" className="analytics-choice" onClick={() => choose(false)}>No thanks</button>
        <button type="button" className="analytics-choice" onClick={() => choose(true)}>Allow</button>
        {consent !== null && <button type="button" className="analytics-dismiss" aria-label="Close analytics preferences" onClick={() => setSettingsOpen(false)}>×</button>}
      </div>
    </aside>
  );
}

export function AnalyticsSettingsButton() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const update = () => setAvailable(eligible());
    update();
    window.addEventListener("analytics-config-change", update);
    return () => window.removeEventListener("analytics-config-change", update);
  }, []);
  if (!available) return null;
  return <button type="button" className="text-link" data-analytics-ignore onClick={() => window.dispatchEvent(new Event("analytics-settings-open"))}>Analytics choices</button>;
}
