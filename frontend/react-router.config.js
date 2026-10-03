import { publicPaths } from "./src/content/paths.js";
export default {
  appDirectory: "src",
  buildDirectory: "dist",
  ssr: false,
  prerender: publicPaths,
  future: {
    v8_middleware: true,
    v8_splitRouteModules: true,
    v8_viteEnvironmentApi: true,
    v8_passThroughRequests: true,
    v8_trailingSlashAwareDataRequests: true,
  },
};
