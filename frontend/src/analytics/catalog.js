import { services } from "../content/site";

export const businessTypes = [
  ["professional_services", "Professional services"],
  ["home_services", "Home services & trades"],
  ["retail", "Retail & e-commerce"],
  ["food_hospitality", "Food & hospitality"],
  ["beauty_wellness", "Beauty & wellness"],
  ["creative_media", "Creative & media"],
  ["education", "Education & coaching"],
  ["nonprofit", "Nonprofit & community"],
  ["technology", "Technology"],
  ["other", "Another kind of business"],
  ["not_sure", "I’m still exploring"],
].map(([value, label]) => ({ value, label }));
export const serviceInterests = [
  ...services.map(({ slug, title }) => ({ value: slug, label: title })),
  { value: "not_sure", label: "I’d like a recommendation" },
];
export const packages = {
  Launch: "launch",
  Business: "business",
  Professional: "professional",
  Custom: "custom",
  "I need a recommendation": "recommendation",
};
export const goals = Object.fromEntries([
  ["Attract clients", "attract_clients"],
  ["Take bookings", "take_bookings"],
  ["Sell products", "sell_products"],
  ["Improve my website", "improve_website"],
  ["Build an app", "build_app"],
  ["Connect my tools", "connect_tools"],
  ["Let’s figure it out", "not_sure"],
]);
export const contentReadiness = Object.fromEntries([
  ["My copy and images are ready", "ready"],
  ["Some materials are ready", "partial"],
  ["I need help with copy or visuals", "needs_help"],
  ["I’m not sure yet", "not_sure"],
]);
export const sections = [
  "top",
  "work",
  "services",
  "about",
  "process",
  "pricing",
  "faq",
  "contact",
  "book",
  "start-a-project",
];
export function leadProperties(form = {}) {
  const launch = form.launch_date
    ? new Date(`${form.launch_date}T00:00:00`)
    : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = launch ? Math.round((launch - today) / 86400000) : NaN;
  return {
    business_type: businessTypes.some((b) => b.value === form.business_type)
      ? form.business_type
      : "unspecified",
    service_interest: serviceInterests.some(
      (s) => s.value === form.service_interest,
    )
      ? form.service_interest
      : "unspecified",
    package_tier: packages[form.package] || "unspecified",
    primary_goal: goals[form.goal] || "unspecified",
    content_readiness:
      contentReadiness[form.content_readiness] || "unspecified",
    existing_website: form.domain ? "yes" : "no",
    launch_window: Number.isFinite(days)
      ? days <= 30
        ? "within_month"
        : days <= 90
          ? "one_to_three_months"
          : "later"
      : "unspecified",
  };
}
