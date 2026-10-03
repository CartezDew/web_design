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
  `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /sign-in\nDisallow: /reset-password\nDisallow: /accept-invitation\nDisallow: /book/manage\nDisallow: /api/\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n\nSitemap: ${site}/sitemap.xml\n`,
);
await writeFile(
  "dist/client/llms.txt",
  `# Cartez Dewberry — Web Design & Development\n\nPersonal design and development services for businesses and founders.\n\n## Public information\n- [Services](${site}/#services): Web design, full-stack development, integrations, SEO/AEO, AI content, security, and launch support.\n- [Work](${site}/#work): Project examples and context.\n- [About](${site}/#about): Background and approach.\n- [Pricing](${site}/#pricing): Starting packages and scope guidance.\n- [Contact](${site}/#contact): Book a consultation or send a project brief.\n\nPricing is scoped per project. Search placement and business results are not guaranteed. Client data and project files are private.\n`,
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
