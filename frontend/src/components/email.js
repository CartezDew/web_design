// Common public TLDs plus a few reserved for local tests. Typo TLDs like "con" stay out.
const ALLOWED_TLDS = new Set([
  "com",
  "org",
  "net",
  "edu",
  "gov",
  "mil",
  "int",
  "io",
  "ai",
  "app",
  "dev",
  "co",
  "us",
  "uk",
  "ca",
  "au",
  "nz",
  "de",
  "fr",
  "nl",
  "es",
  "it",
  "ie",
  "in",
  "jp",
  "kr",
  "sg",
  "br",
  "mx",
  "za",
  "info",
  "biz",
  "me",
  "tv",
  "cc",
  "xyz",
  "online",
  "site",
  "tech",
  "store",
  "shop",
  "cloud",
  "pro",
  "name",
  "mobi",
  "asia",
  "jobs",
  "agency",
  "studio",
  "design",
  "media",
  "email",
  "test",
]);

const MULTI_PART_TLDS = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
  "co.jp",
  "com.br",
  "co.in",
  "com.mx",
  "co.za",
]);

function validDomainLabel(label) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
}

export function validContactEmail(value) {
  const email = String(value || "").trim();
  if (!email || email.length > 254) return false;
  const at = email.lastIndexOf("@");
  if (at < 1 || at !== email.indexOf("@")) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (!local || local.length > 64 || /\s/.test(local)) return false;
  if (
    !domain ||
    domain.includes("..") ||
    domain.startsWith(".") ||
    domain.startsWith("-") ||
    domain.endsWith(".") ||
    domain.endsWith("-")
  ) {
    return false;
  }
  const labels = domain.split(".");
  if (labels.length < 2 || !labels.every(validDomainLabel)) return false;
  const tld = labels.at(-1);
  if (labels.length >= 3) {
    const compound = `${labels.at(-2)}.${tld}`;
    if (MULTI_PART_TLDS.has(compound)) return true;
  }
  return ALLOWED_TLDS.has(tld);
}
