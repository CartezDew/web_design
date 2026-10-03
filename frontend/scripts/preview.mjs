// Local production preview with the same public/private route split as Netlify.
import { createServer, request } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";

import { legacySections } from "../src/content/paths.js";

const root = resolve("dist/client");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".webp": "image/webp",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};
createServer(async (req, res) => {
  if (req.url.startsWith("/api/")) {
    const upstream = request(
      {
        hostname: "127.0.0.1",
        port: 8000,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (response) => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
      },
    );
    upstream.on("error", () => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          detail: "Start the local Django backend to use this feature.",
        }),
      );
    });
    req.pipe(upstream);
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const legacy = legacySections[pathname.replace(/\/$/, "")];
    if (legacy) {
      const search = new URL(req.url, "http://localhost").search;
      res.writeHead(301, { Location: `/${search}#${legacy}` });
      res.end();
      return;
    }
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}/`)) {
      res.writeHead(403);
      res.end();
      return;
    }
    let status = 200;
    try {
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
      await stat(file);
    } catch {
      const privateRoute =
        /^\/(dashboard(?:\/.*)?|sign-in|reset-password|accept-invitation|book\/manage|confirm)\/?$/.test(
          pathname,
        );
      file = resolve(root, privateRoute ? "__spa-fallback.html" : "404.html");
      status = privateRoute ? 200 : 404;
    }
    res.writeHead(status, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(500);
    res.end("Build the frontend before previewing it.");
  }
}).listen(4173, "127.0.0.1", () =>
  console.log("Production preview: http://127.0.0.1:4173"),
);
