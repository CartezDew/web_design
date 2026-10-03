export const serviceSlugs = [
  "web-design",
  "full-stack-development",
  "api-integrations",
  "seo-aeo",
  "ai-content-agents",
  "security",
  "launch-support",
];
export const projectSlugs = [
  "marcd",
  "bds-talent-group",
  "clip-culture",
  "leapfrog-analytics",
  "mattel-ai-lab",
];
// Only the landing page is a public marketing destination.
export const publicPaths = ["/"];
export const legacySections = Object.fromEntries([
  ...[
    "services",
    "work",
    "about",
    "pricing",
    "contact",
    "book",
    "start-a-project",
    "privacy",
  ].map((section) => [`/${section}`, section]),
  ...serviceSlugs.map((slug) => [`/services/${slug}`, `service-${slug}`]),
  ...projectSlugs.map((slug) => [`/work/${slug}`, `project-${slug}`]),
]);
