// Use only the edge-provided country. Never return or store an IP or precise location.
// Default-on is limited to the US; all other/unknown regions require a saved choice.
export default function analyticsPolicy(request, context) {
  const privacySignal = request.headers.get("Sec-GPC") === "1" || request.headers.get("DNT") === "1";
  return Response.json({
    automatic_analytics: context.geo?.country?.code === "US" && !privacySignal,
    privacy_signal: privacySignal,
  }, { headers: { "Cache-Control": "private, no-store", "Netlify-CDN-Cache-Control": "no-store" } });
}
export const config = { path: "/analytics-policy" };
