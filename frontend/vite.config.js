import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
export default defineConfig({
  plugins: [reactRouter()],
  server: { host: "127.0.0.1", proxy: { "/api": "http://127.0.0.1:8000" } },
});
