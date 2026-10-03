import { readFile, writeFile } from "node:fs/promises";
import { publicPaths, legacySections } from "../src/content/paths.js";
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
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPaths.map((path) => `<url><loc>${escape(site + path)}</loc></url>`).join("")}</urlset>`,
);
await writeFile(
  "dist/client/robots.txt",
  `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /sign-in\nDisallow: /reset-password\nDisallow: /accept-invitation\nDisallow: /book/manage\nDisallow: /confirm\nDisallow: /api/\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n\nSitemap: ${site}/sitemap.xml\n`,
);
await writeFile(
  "dist/client/llms.txt",
  `# Cartez Dewberry — Web Design & Development\n\nWork directly with Cartez on custom websites, booking systems, integrations, and SEO/AEO for small businesses. Based in metro Atlanta, Georgia.\n\n## Public information\n- [Services](${site}/#services): Web design, full-stack development, integrations, SEO/AEO, AI content, security, and launch support.\n- [Work](${site}/#work): Project examples and context.\n- [About](${site}/#about): Background and approach.\n- [Process](${site}/#process): Discovery, design, development, testing, and handoff.\n- [Pricing](${site}/#pricing): Starting packages and scope guidance.\n- Service areas: Based in metro Atlanta, Georgia. Serves Atlanta, Sandy Springs, Roswell, Alpharetta, Milton, Johns Creek, Marietta, Smyrna, Kennesaw, Acworth, Austell, Powder Springs, Mableton, Douglasville, Decatur, Brookhaven, Dunwoody, Chamblee, Tucker, Stone Mountain, Lawrenceville, Duluth, Norcross, Peachtree Corners, Suwanee, Buford, Snellville, Lilburn, Loganville, Jonesboro, Riverdale, Forest Park, East Point, College Park, Union City, Fairburn, McDonough, Stockbridge, Hampton, Conyers, Covington, Monroe, Winder, Woodstock, Canton, Cumming, Dallas, Hiram, Newnan, Senoia, Peachtree City, Fayetteville, Tyrone, Griffin, Jackson, Cartersville, Villa Rica, Carrollton, Gainesville, and nearby metro Atlanta communities. Also supports Macon, Warner Robins, Augusta, Valdosta, Columbus, Albany, Athens, Savannah, Rome, Dalton, and LaGrange in Georgia; Chattanooga, Knoxville, and Nashville in Tennessee; and Montgomery, Mobile, Birmingham, Huntsville, Auburn, and Dothan in Alabama. Remote projects are welcome anywhere in the United States, and in-person meetings are available around Atlanta.\n- [Questions](${site}/#faq): Plain-language answers about timelines, pricing, SEO/AEO, and collaboration.\n- [Book a call](${site}/#book): Free 30-minute consultation.\n- [Project intake](${site}/#start-a-project): Share an idea, optional discovery details, and up to 12 files.\n- [Contact](${site}/#contact): letsbuild@marcdbycartez.com or +1 404-354-1272.\n\nPricing is scoped per project. Search placement and business results are not guaranteed. This optional reference file does not provide a ranking benefit in Google Search. Client data and project files are private.\n`,
);
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
