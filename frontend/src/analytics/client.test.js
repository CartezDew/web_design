import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

let analytics;
const commands = () => (window.dataLayer || []).map((entry) => Array.from(entry));
const events = (name) => commands().filter(([type, event]) => type === "event" && (!name || event === name));

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("VITE_GA_ENABLE_DEV", "true");
  window.history.replaceState({}, "", "/");
  localStorage.clear(); sessionStorage.clear();
  window.dataLayer = [];
  document.querySelectorAll("script[data-site-analytics]").forEach((s) => s.remove());
  analytics = await import("./client");
  analytics.setConfig({ measurement_id: "G-TEST12345", server_conversions: false });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

it("makes no Google calls before consent or after declining", () => {
  expect(analytics.initialize()).toBe(false);
  expect(analytics.track("button_click", { button_id: "cta_hero_plan" })).toBe(false);
  analytics.chooseConsent(false);
  expect(window.dataLayer).toEqual([]);
  expect(document.querySelector("script[data-site-analytics]")).toBeNull();
});

it("initializes once with the Google Arguments queue shape and a single pageview", () => {
  analytics.chooseConsent(true);
  analytics.initialize(); analytics.initialize();
  expect(events("page_view")).toHaveLength(1);
  expect(document.querySelectorAll("script[data-site-analytics]")).toHaveLength(1);
  expect(window.dataLayer.every((command) => !Array.isArray(command))).toBe(true);
  expect(commands().find(([type]) => type === "config")[2]).toMatchObject({ send_page_view: false, allow_google_signals: false });
});

it("removes query secrets, fragments, free text and unknown fields from all events", () => {
  window.history.replaceState({}, "", "/?token=private&email=alex%40example.test&utm_source=linkedin&utm_campaign=spring_launch#secret");
  analytics.chooseConsent(true);
  analytics.track("form_choice", { form_type: "brief", business_type: "retail", primary_goal: "sell_products", email: "alex@example.test", notes: "private description", arbitrary: "never", service_interest: "someone@example.test" });
  const event = events("form_choice")[0][2];
  expect(event).toMatchObject({ business_type: "retail", primary_goal: "sell_products", campaign_source: "linkedin" });
  const serialized = JSON.stringify(commands());
  for (const privateText of ["private", "alex", "secret", "never", "someone"]) expect(serialized).not.toContain(privateText);
  expect(analytics.campaignValue("abc123456789")).toBe("");
});

it("does not load analytics on private routes or send new events after navigation", () => {
  window.history.replaceState({}, "", "/confirm?token=private");
  analytics.chooseConsent(true);
  expect(window.dataLayer).toHaveLength(0);
  window.history.replaceState({}, "", "/");
  analytics.initialize();
  const count = commands().length;
  window.history.replaceState({}, "", "/dashboard/projects");
  expect(analytics.track("page_view")).toBe(false);
  expect(commands()).toHaveLength(count);
});

it("revocation stops events and acquisition; another tab's decline is respected", () => {
  analytics.chooseConsent(true);
  analytics.chooseConsent(false);
  expect(analytics.track("form_start", { form_type: "brief" })).toBe(false);
  expect(window["ga-disable-G-TEST12345"]).toBe(true);
  expect(analytics.acquisition()).toEqual({});
  analytics.chooseConsent(true);
  localStorage.setItem(analytics.CONSENT_KEY, JSON.stringify({ granted: false, expires: Date.now() + 60000 }));
  analytics.refreshConsent();
  expect(analytics.readConsent()).toBe(false);
  expect(analytics.track("page_view")).toBe(false);
});

it("only sends a browser conversion once, and never also sends a backend conversion", () => {
  analytics.chooseConsent(true);
  analytics.trackSaved("private-record-id", "brief", { business_type: "retail" });
  analytics.trackSaved("private-record-id", "brief", { business_type: "retail" });
  expect(events("generate_lead")).toHaveLength(1);
  expect(JSON.stringify(events())).not.toContain("private-record-id");
  analytics.setConfig({ measurement_id: "G-TEST12345", server_conversions: true });
  analytics.trackSaved("another-id", "booking");
  expect(events("generate_lead")).toHaveLength(1);
  expect(events("form_submit_success")).toHaveLength(2);
});

it("bounded ID lookup never blocks a form when the tag is blocked", async () => {
  vi.useFakeTimers();
  analytics.setConfig({ measurement_id: "G-TEST12345", server_conversions: true });
  analytics.chooseConsent(true);
  const context = analytics.submissionContext();
  await vi.advanceTimersByTimeAsync(350);
  expect(await context).toMatchObject({ consent: true, campaign_source: "direct" });
  expect(await context).not.toHaveProperty("client_id");
});

it("uses Google client and session IDs only in consented submission context", async () => {
  analytics.setConfig({ measurement_id: "G-TEST12345", server_conversions: true });
  analytics.chooseConsent(true);
  const pending = analytics.submissionContext();
  for (const [type, , field, callback] of commands()) if (type === "get") callback(field === "client_id" ? "12345.67890" : "1234567");
  expect(await pending).toMatchObject({ client_id: "12345.67890", session_id: "1234567" });
  analytics.chooseConsent(false);
  expect(await analytics.submissionContext()).toBeNull();
});

it("keeps localhost and previews out of production reporting by default", () => {
  vi.stubEnv("VITE_GA_ENABLE_DEV", "false");
  vi.stubEnv("PROD", true);
  analytics.chooseConsent(true);
  expect(window.dataLayer).toHaveLength(0);
});


it("allows the US default only after a trusted policy arrives, without storing an explicit choice", () => {
  expect(analytics.readConsent()).toBe(false);
  analytics.setPolicy({ automatic_analytics: true });
  expect(analytics.initialize()).toBe(true);
  expect(analytics.readChoice()).toBeNull();
  expect(events("page_view")).toHaveLength(1);
});

it("preserves existing opt-outs across default policy changes", () => {
  localStorage.setItem(analytics.CONSENT_KEY, JSON.stringify({ granted: false, expires: Date.now() + 60000 }));
  analytics.setPolicy({ automatic_analytics: true });
  expect(analytics.initialize()).toBe(false);
  expect(analytics.readChoice()).toBe(false);
});

it.each(["browser GPC", "browser DNT", "edge privacy header"])("honors %s even over a saved allow choice", (source) => {
  analytics.chooseConsent(true);
  if (source === "browser GPC") vi.stubGlobal("navigator", { globalPrivacyControl: true });
  if (source === "browser DNT") vi.stubGlobal("navigator", { doNotTrack: "1" });
  analytics.setPolicy({ automatic_analytics: true, privacy_signal: source === "edge privacy header" });
  analytics.chooseConsent(true);
  expect(analytics.readConsent()).toBe(false);
  expect(analytics.track("page_view")).toBe(false);
  expect(commands().at(-1)).toEqual(["consent", "update", { analytics_storage: "denied" }]);
});

it("removes Google cookies and acquisition data when a different tab opts out", () => {
  analytics.chooseConsent(true);
  document.cookie = "_ga=123.456;path=/";
  document.cookie = "_ga_TEST12345=session;path=/";
  localStorage.setItem(analytics.CONSENT_KEY, JSON.stringify({ granted: false, expires: Date.now() + 60000 }));
  analytics.refreshConsent();
  expect(document.cookie).not.toContain("_ga");
  expect(sessionStorage.getItem("marcdbycartez.acquisition.v1")).toBeNull();
  expect(analytics.canTrack()).toBe(false);
});
