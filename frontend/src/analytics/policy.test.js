import { expect, it } from "vitest";
import policy from "../../netlify/edge-functions/analytics-policy";

it.each(["US", "GB", "DE", "CA", undefined])("only permits the US default using trusted edge geography: %s", async (country) => {
  const result = policy(new Request("https://example.test/analytics-policy?country=US", { headers: { "X-Country": "US" } }), { geo: { country: { code: country } } });
  expect(await result.json()).toEqual({ automatic_analytics: country === "US", privacy_signal: false });
  expect(result.headers.get("Cache-Control")).toBe("private, no-store");
});
it.each(["Sec-GPC", "DNT"])("honors %s without returning any visitor information", async (header) => {
  const result = policy(new Request("https://example.test/analytics-policy", { headers: { [header]: "1" } }), { ip: "203.0.113.1", geo: { country: { code: "US" } } });
  expect(await result.json()).toEqual({ automatic_analytics: false, privacy_signal: true });
});
