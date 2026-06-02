// ─── Stayflexi Background Worker Bootstrap ───────────────────────────────────
// Registers ts-node and tsconfig-paths to execute TypeScript files with path aliases.
// ─────────────────────────────────────────────────────────────────────────────

const path = require("node:path");

// 1. Register ts-node for executing .ts files
require("ts-node").register({
  project: path.join(__dirname, "../../../tsconfig.json"),
  transpileOnly: true,
});

// 2. Register tsconfig-paths for absolute/aliased imports (e.g. @lib/*)
const tsconfig = require("../../../tsconfig.json");
const tsconfigPaths = require("tsconfig-paths");

tsconfigPaths.register({
  baseUrl: path.join(__dirname, "../../../"),
  paths: tsconfig.compilerOptions.paths,
});

// 3. Boot the TypeScript runner
require("./runner.ts");
