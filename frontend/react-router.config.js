import { publicPaths } from "./src/content/paths.js";
export default {
  appDirectory: "src",
  buildDirectory: "dist",
  ssr: false,
  prerender: publicPaths,
};
