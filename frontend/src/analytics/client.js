import { businessTypes, serviceInterests, packages, goals, contentReadiness, sections } from "./catalog";
import { projectSlugs } from "../content/paths";

export const CONSENT_KEY = "marcdbycartez.analytics-consent.v1";
const CAMPAIGN_KEY = "marcdbycartez.acquisition.v1";
const TTL = 180 * 24 * 60 * 60 * 1000;
let config = { measurement_id: "", server_conversions: false };
let policy = { automatic_analytics: false, privacy_signal: false };
let initialized = false;
let pageSent = false;
let consentOverride;
const saved = new Set();
const events = new Set(["page_view", "section_view", "section_engagement", "button_click", "service_view", "portfolio_view", "faq_open", "form_start", "form_step_view", "form_step_complete", "form_choice", "form_submit_attempt", "form_submit_success", "form_submit_error", "generate_lead", "booking_availability", "booking_slot_selected", "upload_outcome", "page_performance", "app_error"]);
const enums = {
  section_id: sections, service_interest: [...serviceInterests.map((x) => x.value), "unspecified"],
  business_type: [...businessTypes.map((x) => x.value), "unspecified"],
  package_tier: [...Object.values(packages), "unspecified"], primary_goal: [...Object.values(goals), "unspecified"],
  content_readiness: [...Object.values(contentReadiness), "unspecified"], existing_website: ["yes", "no"],
  form_type: ["brief", "booking"], step_id: ["contact", "direction", "review", "booking"],
  field_id: ["business_type", "service_interest", "package", "goal", "content_readiness", "launch_date"],
  failure_class: ["validation", "network", "server", "unavailable", "security", "rate_limit", "unknown", "javascript", "promise"],
  availability: ["available", "empty", "error"], outcome: ["success", "error"],
  project_id: projectSlugs, device_category: ["mobile", "tablet", "desktop"],
  duration_bucket: ["under_3s", "3_10s", "10_30s", "30_60s", "1_5m", "over_5m"],
  exit_reason: ["scroll", "background", "exit"], link_type: ["section", "email", "phone", "outbound", "portal"],
  source_layer: ["browser"],
  launch_window: ["within_month", "one_to_three_months", "later", "unspecified"],
};

export const campaignValue = (value) => typeof value === "string" && /^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/.test(value) && !/\d{6}/.test(value) ? value.toLowerCase() : "";
export function sanitizeParams(params) {
  const clean = {};
  for (const [key, value] of Object.entries(params || {})) {
    if (enums[key]?.includes(value)) clean[key] = value;
    else if (["duration_seconds", "load_seconds"].includes(key) && Number.isFinite(value) && value >= 0 && value <= 86400) clean[key] = Math.round(value * 10) / 10;
    else if (["campaign_source", "campaign_medium", "campaign_id", "campaign_content"].includes(key) && campaignValue(value)) clean[key] = campaignValue(value);
    else if (key === "button_id" && /^(nav|cta|form|portfolio|contact|menu|back_to_top)_[a-z0-9_-]{1,60}$/.test(value)) clean[key] = value;
    else if (key === "faq_id" && /^faq_[0-9]{1,2}$/.test(value)) clean[key] = value;
  }
  return clean;
}
export function privacySignal() {
  return policy.privacy_signal || typeof navigator !== "undefined" &&
    (navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || navigator.doNotTrack === "yes");
}
export function readChoice() {
  if (consentOverride !== undefined) return consentOverride;
  try {
    const record = JSON.parse(localStorage.getItem(CONSENT_KEY));
    return record?.expires > Date.now() && typeof record.granted === "boolean" ? record.granted : null;
  } catch { return null; }
}
export function readConsent() {
  if (privacySignal()) return false;
  return readChoice() ?? policy.automatic_analytics;
}
export function setPolicy(value) {
  policy = { automatic_analytics: value?.automatic_analytics === true, privacy_signal: value?.privacy_signal === true };
  if (!readConsent()) revoke();
  window.dispatchEvent(new Event("analytics-consent-change"));
}
export function setConfig(value) {
  config = { measurement_id: /^G-[A-Z0-9]{6,20}$/.test(value?.measurement_id) ? value.measurement_id : "", server_conversions: value?.server_conversions === true };
  if (typeof window !== "undefined") window.dispatchEvent(new Event("analytics-config-change"));
}
export const analyticsConfigured = () => !!config.measurement_id;
export function eligible() {
  return typeof window !== "undefined" && window.location.pathname === "/" && analyticsConfigured()
    && (import.meta.env.PROD && ["marcdbycartez.com", "www.marcdbycartez.com"].includes(window.location.hostname) || import.meta.env.VITE_GA_ENABLE_DEV === "true");
}
export const canTrack = () => eligible() && readConsent() === true;
// Google's command queue expects an Arguments object, not a rest-parameter array.
function gtag() {
  window.dataLayer ||= [];
  window.dataLayer.push(arguments);
}
function referrerOrigin() {
  try {
    const url = new URL(document.referrer);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.origin : "";
  } catch { return ""; }
}
export function acquisition() {
  if (!canTrack()) return {};
  try {
    const stored = JSON.parse(sessionStorage.getItem(CAMPAIGN_KEY));
    if (stored?.expires > Date.now()) return sanitizeParams(stored.value);
  } catch { /* Storage can be disabled. */ }
  const query = new URLSearchParams(window.location.search);
  const referrer = referrerOrigin();
  let source = "direct", medium = "none";
  if (referrer && referrer !== window.location.origin) {
    source = /google\./.test(referrer) ? "google" : /bing\./.test(referrer) ? "bing" : /facebook\.|instagram\.|linkedin\./.test(referrer) ? new URL(referrer).hostname.replace(/^www\./, "").split(".")[0] : "referral";
    medium = ["google", "bing"].includes(source) ? "organic" : source === "referral" ? "referral" : "social";
  }
  const value = sanitizeParams({
    campaign_source: campaignValue(query.get("utm_source")) || source,
    campaign_medium: campaignValue(query.get("utm_medium")) || medium,
    campaign_id: campaignValue(query.get("utm_campaign")) || "untagged",
    campaign_content: campaignValue(query.get("utm_content")) || "unspecified",
    device_category: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : /iPad|Tablet/i.test(navigator.userAgent) ? "tablet" : "desktop",
  });
  try { sessionStorage.setItem(CAMPAIGN_KEY, JSON.stringify({ value, expires: Date.now() + 30 * 60 * 1000 })); } catch { /* Optional. */ }
  return value;
}
export function safePageLocation() {
  const url = new URL("/", window.location.origin);
  const query = new URLSearchParams(window.location.search);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
    const value = campaignValue(query.get(key));
    if (value) url.searchParams.set(key, value);
  }
  return url.href;
}
export function initialize() {
  if (!canTrack()) return false;
  window[`ga-disable-${config.measurement_id}`] = false;
  if (!initialized) {
    initialized = true;
    gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    gtag("consent", "update", { analytics_storage: "granted" });
    gtag("js", new Date());
    gtag("config", config.measurement_id, {
      send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      page_location: safePageLocation(), page_referrer: referrerOrigin(),
      page_title: "Cartez Dewberry — Web Design & Development",
      cookie_flags: "SameSite=Lax;Secure", cookie_expires: 180 * 86400,
      ...(import.meta.env.VITE_GA_ENABLE_DEV === "true" ? { debug_mode: true } : {}),
    });
    const script = document.createElement("script");
    script.async = true;
    script.dataset.siteAnalytics = "true";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.measurement_id}`;
    document.head.appendChild(script);
  }
  if (!pageSent) { pageSent = true; track("page_view"); }
  return true;
}
export function track(name, params = {}) {
  if (!initialized || !canTrack() || !events.has(name)) return false;
  gtag("event", name, {
    send_to: config.measurement_id,
    page_location: safePageLocation(), page_referrer: referrerOrigin(),
    page_title: "Cartez Dewberry — Web Design & Development", page_id: "landing_page",
    ...acquisition(), ...sanitizeParams(params),
  });
  return true;
}
export function disable() {
  if (config.measurement_id) window[`ga-disable-${config.measurement_id}`] = true;
}
export function refreshConsent() {
  consentOverride = undefined;
  if (readConsent() !== true) revoke();
  window.dispatchEvent(new Event("analytics-consent-change"));
}
function revoke() {
    disable();
    try { sessionStorage.removeItem(CAMPAIGN_KEY); } catch { /* Optional. */ }
    if (initialized) gtag("consent", "update", { analytics_storage: "denied" });
    const domains = ["", window.location.hostname, `.${window.location.hostname.replace(/^www\./, "")}`];
    for (const item of document.cookie.split(";")) {
      const name = item.split("=")[0].trim();
      if (name === "_ga" || name.startsWith("_ga_")) for (const domain of domains)
        document.cookie = `${name}=; Max-Age=0; path=/;${domain ? ` domain=${domain};` : ""} SameSite=Lax; Secure`;
    }
}
export function chooseConsent(granted) {
  granted = granted === true && !privacySignal();
  consentOverride = granted;
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ granted, expires: Date.now() + TTL })); } catch { /* Session-only choice. */ }
  if (!granted) revoke();
  else {
    if (initialized) gtag("consent", "update", { analytics_storage: "granted" });
    initialize();
  }
  window.dispatchEvent(new Event("analytics-consent-change"));
}
export async function submissionContext() {
  if (!canTrack() || !initialized) return null;
  const context = { consent: true, ...acquisition() };
  if (!config.server_conversions) return context;
  const get = (field) => new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 350);
    gtag("get", config.measurement_id, field, (value) => { clearTimeout(timer); resolve(value); });
  });
  const [clientId, sessionId] = await Promise.all([get("client_id"), get("session_id")]);
  if (!canTrack()) return null;
  if (/^\d{1,20}\.\d{1,20}$/.test(String(clientId)) && /^[1-9]\d{0,15}$/.test(String(sessionId))) {
    context.client_id = String(clientId); context.session_id = String(sessionId);
  }
  return context;
}
export function trackSaved(id, formType, properties = {}) {
  const key = `${formType}:${id}`;
  if (!id || saved.has(key)) return;
  saved.add(key);
  track("form_submit_success", { form_type: formType, ...properties });
  if (!config.server_conversions) track("generate_lead", { form_type: formType, source_layer: "browser", ...properties });
}
export function failureClass(error) {
  return error?.status === 0 ? "network" : error?.status === 409 ? "unavailable" : error?.status === 429 ? "rate_limit" : error?.status === 403 ? "security" : error?.status >= 500 ? "server" : error?.status === 400 ? "validation" : "unknown";
}
export const durationBucket = (seconds) => seconds < 3 ? "under_3s" : seconds < 10 ? "3_10s" : seconds < 30 ? "10_30s" : seconds < 60 ? "30_60s" : seconds < 300 ? "1_5m" : "over_5m";
