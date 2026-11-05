import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { publicPaths, legacySections } from "../src/content/paths.js";

// site.js imports images, so load it through Vite to reuse the real copy for llms.txt.
const vite = await createServer({
  configFile: false,
  logLevel: "error",
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
const { services, packages, faqs } = await vite.ssrLoadModule(
  "/src/content/site.js",
);
await vite.close();
const site = (process.env.VITE_SITE_URL || "https://marcdbycartez.com").replace(
  /\/$/,
  "",
);
const fallbackPath = "dist/client/__spa-fallback.html";
const fallback = await readFile(fallbackPath, "utf8");
await writeFile(
  fallbackPath,
  fallback.replace(
    "</head>",
    '<meta name="robots" content="noindex, nofollow"></head>',
  ),
);
const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
await writeFile(
  "dist/client/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPaths.map((path) => `<url><loc>${escape(site + path)}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`).join("")}</urlset>`,
);
// AI search and answer engines may read the public pages so the site is found and
// cited in AI answers. Each is named with the same private paths blocked, so a
// crawler that only honors its own group still skips the portal.
const aiSearchCrawlers = [
  "OAI-SearchBot", // ChatGPT search
  "ChatGPT-User", // ChatGPT fetching a page for a user
  "Claude-SearchBot", // Claude search
  "Claude-User", // Claude fetching a page for a user
  "PerplexityBot",
  "Perplexity-User",
  "Applebot", // Siri and Spotlight answers
  "Bingbot", // Bing and Microsoft Copilot
  "Amazonbot", // Alexa answers
  "DuckAssistBot",
  "MistralAI-User",
  "YouBot",
];
// Crawlers that collect pages to train AI models are blocked from the whole site.
// Blocking Google-Extended and Applebot-Extended opts out of Gemini and Apple model
// training only; Google Search, AI Overviews and Siri answers are unaffected.
const aiTrainingCrawlers = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "CCBot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "Bytespider",
  "Diffbot",
  "omgili",
];
const privatePaths = [
  "/dashboard",
  "/sign-in",
  "/reset-password",
  "/accept-invitation",
  "/book/manage",
  "/confirm",
  "/api/",
];
const disallowPrivate = privatePaths
  .map((path) => `Disallow: ${path}`)
  .join("\n");
await writeFile(
  "dist/client/robots.txt",
  [
    `User-agent: *\nAllow: /\n${disallowPrivate}`,
    ...aiSearchCrawlers.map(
      (agent) => `User-agent: ${agent}\nAllow: /\n${disallowPrivate}`,
    ),
    ...aiTrainingCrawlers.map((agent) => `User-agent: ${agent}\nDisallow: /`),
    `Sitemap: ${site}/sitemap.xml`,
  ].join("\n\n") + "\n",
);

const areas =
  "Based in metro Atlanta, Georgia. Serves Atlanta, Sandy Springs, Roswell, Alpharetta, Milton, Johns Creek, Marietta, Smyrna, Kennesaw, Acworth, Austell, Powder Springs, Mableton, Douglasville, Decatur, Brookhaven, Dunwoody, Chamblee, Tucker, Stone Mountain, Lawrenceville, Duluth, Norcross, Peachtree Corners, Suwanee, Buford, Snellville, Lilburn, Loganville, Jonesboro, Riverdale, Forest Park, East Point, College Park, Union City, Fairburn, McDonough, Stockbridge, Hampton, Conyers, Covington, Monroe, Winder, Woodstock, Canton, Cumming, Dallas, Hiram, Newnan, Senoia, Peachtree City, Fayetteville, Tyrone, Griffin, Jackson, Cartersville, Villa Rica, Carrollton, Gainesville, and nearby metro Atlanta communities. Also supports Macon, Warner Robins, Augusta, Valdosta, Columbus, Albany, Athens, Savannah, Rome, Dalton, and LaGrange in Georgia; Chattanooga, Knoxville, and Nashville in Tennessee; and Montgomery, Mobile, Birmingham, Huntsville, Auburn, and Dothan in Alabama. Remote projects are welcome anywhere in the United States, and in-person meetings are available around Atlanta.";
const llms = `# Cartez Dewberry — Web Design & Development

> Cartez Dewberry is a software engineer and U.S. Marine veteran who designs and builds custom websites, booking systems, integrations, and SEO/AEO foundations for small businesses. Clients work directly with him from first idea to launch. Business: Marc-D Group LLC, metro Atlanta, Georgia.

## Key facts
- Website: ${site}/
- Contact: letsbuild@marcdbycartez.com · +1 404-354-1272
- Free 30-minute consultation: ${site}/#book
- Project intake (share an idea and up to 12 files): ${site}/#start-a-project
- Starting prices: ${packages.map((plan) => `${plan.name} ${plan.price}+`).join(", ")}
- Service area: ${areas}

## Services
${services.map((service) => `- **${service.title}**: ${service.copy} ${service.value}`).join("\n")}

## Packages
${packages
  .map(
    (plan) =>
      `- **${plan.name}, from ${plan.price}** (${plan.timeline.toLowerCase()}): ${plan.description} Includes ${plan.features.join(", ").toLowerCase()}.`,
  )
  .join("\n")}

Package prices are starting points. Final scope and cost are confirmed after the intake and discovery call.

## Frequently asked questions
${faqs.map((faq) => `### ${faq.question}\n${faq.answer}`).join("\n\n")}

## Sections
- [Work](${site}/#work): Live client and project sites.
- [Services](${site}/#services)
- [About](${site}/#about)
- [Process](${site}/#process): Listen, design, build, launch.
- [Pricing](${site}/#pricing)
- [FAQ](${site}/#faq)

Search placement and business results are not guaranteed. Client data and project files are private.
`;
await writeFile("dist/client/llms.txt", llms);
await writeFile(
  "dist/client/404.html",
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>Page not found | Cartez Dewberry</title><body style="font:18px system-ui;padding:12vw;line-height:1.6"><h1>This page took a different path.</h1><p>Let’s get you back to something useful.</p><a href="/">Back to the homepage →</a></body></html>',
);

await writeFile(
  "dist/client/_redirects",
  Object.entries(legacySections)
    .map(([from, section]) => `${from} /#${section} 301`)
    .join("\n") + "\n",
);
