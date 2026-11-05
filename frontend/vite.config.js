import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
export default defineConfig({
  plugins: [reactRouter()],
  server: { host: "127.0.0.1", proxy: { "/api": "http://127.0.0.1:8000" } },
  // Pre-bundle every client dependency at startup. The form libraries are lazy-loaded,
  // so without this Vite discovers them mid-session, re-bundles, and an open tab can
  // end up with two copies of React ("Cannot read properties of null (reading
  // 'useContext')").
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router",
      "react-router-dom",
      "react-router/dom",
      "framer-motion",
      "lucide-react",
      "react-aria-components",
      "@internationalized/date",
      "@marsidev/react-turnstile",
    ],
  },
});
