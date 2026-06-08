// Metro config tuned for an npm-workspaces monorepo so the app can resolve the
// shared `@pace/shared` package and hoisted node_modules at the repo root.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole monorepo so changes in packages/shared are picked up.
config.watchFolders = [monorepoRoot];

// 2. Let Metro resolve modules from both the app and the monorepo root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. On constrained/Windows environments where forking worker processes
//    fails, allow forcing Metro to bundle in-band via PACE_METRO_SINGLE=1.
if (process.env.PACE_METRO_SINGLE === "1") {
  config.maxWorkers = 1;
}

module.exports = config;
