export const siteUrl = (
  import.meta.env.VITE_SITE_URL || "https://marcdbycartez.com"
).replace(/\/$/, "");
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
    { property: "og:image", content: siteUrl + "/social-preview.webp" },
    {
      property: "og:image:alt",
      content: "Cartez Dewberry — custom web design and development",
    },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: siteUrl + "/social-preview.webp" },
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
