#!/usr/bin/env node
// Design system audit. Run from the repo root: node .cursor/skills/design-review/scripts/audit.mjs
import { globSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const src = join(root, "frontend/src");

const errors = [];
const warnings = [];

const files = globSync("**/*.{css,jsx}", { cwd: src }).sort();
const read = (file) => readFileSync(join(src, file), "utf8");

// Cool greys that fight the warm palette. Tailwind slate/gray plus common blue-greys.
const COOL = [
  "#0f172a", "#0f1729", "#1e293b", "#334155", "#475569", "#64748b",
  "#94a3b8", "#cbd5e1", "#e2e8f0", "#e2e8ec", "#f1f5f9", "#f8fafc",
  "#617080", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb", "#f3f4f6",
];

// Strict token enforcement here; the rest of the app is advisory for now.
const STRICT = /^(styles|sections)\//;

for (const file of files) {
  const text = read(file);
  const label = relative(root, join(src, file));

  if (file.endsWith(".css")) {
    // Ignore hexes inside inline SVG data URIs (the grain texture legitimately needs them).
    const scrubbed = text.replace(/url\(["']?data:[^)]*\)/g, "");

    for (const [index, line] of scrubbed.split("\n").entries()) {
      if (line.trimStart().startsWith("/*")) continue;
      // Deliberate exceptions the owner asked for. Only honoured in tokens.css.
      if (file.endsWith("tokens.css") && line.includes("audit-allow")) continue;
      const where = `${label}:${index + 1}`;

      for (const hex of line.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
        const lower = hex.toLowerCase();
        if (COOL.includes(lower)) {
          errors.push(`${where}  cool grey ${hex} clashes with the warm palette`);
        } else if (STRICT.test(file) && !file.endsWith("tokens.css")) {
          errors.push(`${where}  hardcoded ${hex} — use a token`);
        } else if (!file.endsWith("tokens.css")) {
          warnings.push(`${where}  hardcoded ${hex} — use a token`);
        }
      }

      if (/background(-color)?:\s*(#fff(f{3})?|white)\b/i.test(line)) {
        errors.push(`${where}  pure white background — use var(--paper)`);
      }

      // Cool rgba() shadows read blue against warm paper. Warm ink is 26, 21, 18.
      for (const rgba of line.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g) ?? []) {
        const [r, g, b] = rgba.match(/\d+/g).map(Number);
        const grey = Math.max(r, g, b) - Math.min(r, g, b) < 6;
        if (!grey && b > r + 8) {
          errors.push(`${where}  cool ${rgba}) — warm it toward rgba(26, 21, 18, …)`);
        }
      }
    }

    // Only pseudo-element overlays can swallow clicks; grain as a background layer cannot.
    const grainOverlay = /::(?:before|after)[^{]*\{[^}]*var\(--grain\)[^}]*\}/s.exec(text);
    if (grainOverlay && !/pointer-events:\s*none/.test(grainOverlay[0])) {
      errors.push(`${label}  grain overlay without pointer-events: none`);
    }

    const hoverTransform = /:hover[^{]*\{[^}]*(transform|translate|scale):/s.test(text);
    if (hoverTransform && !/prefers-reduced-motion/.test(text)) {
      warnings.push(`${label}  hover transform with no prefers-reduced-motion guard`);
    }
  }
}

// Adjacent sections must not share a surface — that sameness is what read as bland.
const SURFACE = /surface--([a-z]+)/;
const homePath = "routes/home.jsx";
if (files.includes(homePath)) {
  const home = read(homePath);
  const order = [...home.matchAll(/<([A-Z][A-Za-z]*)\b/g)].map((m) => m[1]);
  const surfaceOf = new Map();

  const composed = (f) =>
    (f.startsWith("sections/") || f.startsWith("pages/")) && f.endsWith(".jsx");

  for (const file of files.filter(composed)) {
    const name = file.replace(/^(sections|pages)\//, "").replace(/\.jsx$/, "");
    // surface--light marks a card inside a section, not the section itself.
    const match = [...read(file).matchAll(new RegExp(SURFACE, "g"))].find(
      (m) => m[1] !== "light",
    );
    if (match) surfaceOf.set(name, match[1]);
  }

  let previous = null;
  for (const name of order) {
    const surface = surfaceOf.get(name);
    if (!surface) continue;
    if (surface === previous) {
      errors.push(`routes/home.jsx  <${name}> repeats the "${surface}" surface of the section above it`);
    }
    previous = surface;
  }

  if (surfaceOf.size === 0) {
    warnings.push("no section declares a surface-- class; section rhythm cannot be checked");
  }
}

const report = (title, items) => {
  if (!items.length) return;
  console.log(`\n${title} (${items.length})`);
  for (const item of items) console.log(`  ${item}`);
};

report("ERRORS", errors);
report("WARNINGS", warnings);

if (!errors.length && !warnings.length) {
  console.log(`Design audit clean across ${files.length} files.`);
} else {
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s) across ${files.length} files.`);
}

process.exit(errors.length ? 1 : 0);
