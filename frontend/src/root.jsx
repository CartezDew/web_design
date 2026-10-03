import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
} from "react-router-dom";
import SiteAnalytics from "./analytics/SiteAnalytics";
import "./styles/tokens.css";
import "./styles/global.css";
export function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
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
