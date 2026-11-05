import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
} from "react-router-dom";
import { useLayoutEffect } from "react";
import SiteAnalytics from "./analytics/SiteAnalytics";
import { confirmMotion, motionBootScript } from "./motion";
import "./styles/tokens.css";
import "./styles/global.css";
import bricolageFont from "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2?url";
import interFont from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";

// The hero paints in Bricolage and Inter, so fetch them alongside the CSS instead of
// after it. That stops the late font swap that shifted the hero on desktop.
const apiOrigin = (() => {
  try {
    return new URL(import.meta.env.VITE_API_BASE_URL || "").origin;
  } catch {
    return null;
  }
})();
export const links = () => [
  ...[bricolageFont, interFont].map((href) => ({
    rel: "preload",
    as: "font",
    type: "font/woff2",
    href,
    crossOrigin: "anonymous",
  })),
  ...(apiOrigin
    ? [{ rel: "preconnect", href: apiOrigin, crossOrigin: "use-credentials" }]
    : []),
];
export function Layout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: motionBootScript }} />
        <meta name="theme-color" content="#fcfaf5" />
        <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon.png"
          sizes="180x180"
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
export default function Root() {
  useLayoutEffect(confirmMotion, []);
  return (
    <>
      <Outlet />
      <SiteAnalytics />
    </>
  );
}
export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <main className="shell page-intro">
      <h1>
        {isRouteErrorResponse(error) && error.status === 404
          ? "This page took a different path."
          : "Something didn’t load."}
      </h1>
      <p>Please try again, or get in touch with Cartez.</p>
      <a className="button" href="/">
        Back to the homepage
      </a>
    </main>
  );
}
