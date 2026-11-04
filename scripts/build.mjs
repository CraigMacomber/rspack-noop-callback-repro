import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import createConfig from "../rspack.config.mjs";

const engines = {
  rspack: "@rspack/core",
  webpack: "webpack",
  canary: "@rspack-canary/core",
};
const name = process.argv[2];
assert.ok(Object.hasOwn(engines, name), "Choose rspack, webpack, or canary");
const engine = await import(engines[name]);
const compile = name === "webpack" ? engine.default : engine.rspack;
const version = name === "webpack" ? engine.default.version : engine.rspackVersion;

for (const example of ["minimal", "fluid"]) {
  const config = createConfig(name, example);
  const compiler = compile(config);
  const stats = await new Promise((resolve, reject) => {
    compiler.run((error, result) => {
      compiler.close((closeError) => {
        if (error || closeError) {
          reject(error ?? closeError);
        } else if (!result || result.hasErrors()) {
          reject(new Error(result?.toString({ all: false, errors: true }) ?? "Missing stats"));
        } else {
          resolve(result);
        }
      });
    });
  });
  if (stats.hasWarnings()) {
    console.warn(stats.toString({ all: false, warnings: true }));
  }
  const modules = stats.toJson({
    all: false,
    modules: true,
    nestedModules: true,
    orphanModules: true,
  }).modules;
  await fs.writeFile(
    path.join(config.output.path, "stats.json"),
    JSON.stringify({ bundler: name, version, modules }, null, 2) + "\n",
  );
  console.log(`${name} ${version}: ${example} -> ${config.output.path}`);
}
