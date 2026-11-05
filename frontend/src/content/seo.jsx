export const siteUrl = (
  import.meta.env.VITE_SITE_URL || "https://marcdbycartez.com"
).replace(/\/$/, "");
// 1200×630 JPEG: the size and format every link-preview crawler accepts.
const shareImage = `${siteUrl}/og-image.jpg`;
const shareImageAlt =
  "Cartez Dewberry: websites that make small businesses feel big. Web design and development in metro Atlanta.";
export function pageMeta(title, description, path = "/", noindex = false) {
  const url = siteUrl + path;
  return [
    { title: `${title} | Cartez Dewberry` },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Cartez Dewberry Web Design" },
    { property: "og:locale", content: "en_US" },
    { property: "og:image", content: shareImage },
    { property: "og:image:type", content: "image/jpeg" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: shareImageAlt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: shareImage },
    { name: "twitter:image:alt", content: shareImageAlt },
    ...(noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
  ];
}
export function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
