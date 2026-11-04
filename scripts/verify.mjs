import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import createConfig from "../rspack.config.mjs";

const results = [];
for (const bundler of process.argv.slice(2)) {
  assert.ok(["rspack", "webpack", "canary"].includes(bundler), "Unknown bundler");
  for (const example of ["minimal", "fluid"]) {
    const output = createConfig(bundler, example).output.path;
    const code = await fs.readFile(path.join(output, "main.cjs"), "utf8");
    const stats = JSON.parse(await fs.readFile(path.join(output, "stats.json"), "utf8"));
    const context = {
      module: { exports: {} },
      console,
      TextEncoder,
      TextDecoder,
      performance,
      crypto,
      setTimeout,
      clearTimeout,
    };
    vm.runInNewContext(code, context, { filename: `${bundler}/${example}/main.cjs` });
    const api = context.module.exports;
    const run = api.run(42);
    assert.equal(run.value, 42);
    assert.equal(run.predicateCalls, 0, "Production callback must not execute");
    const factory = api.runFactory();
    assert.equal(factory.factoryCalls, 1, "Argument factory side effect must survive");
    assert.equal(factory.predicateCalls, 0);
    if (example === "fluid") {
      assert.throws(() => api.runtimeAssert(), /0x123/);
      const tree = api.runTree();
      assert.equal(tree.included, false);
      assert.equal(JSON.stringify(tree.titles), '["after","second"]');
    } else {
      assert.ok(
        stats.modules.some((group) =>
          group.modules?.some((module) => module.name === "./src/minimal.js") &&
          group.modules?.some((module) => module.name === "./src/noop-wrapper.js"),
        ),
        "Minimal entry and wrapper must be concatenated into the same module",
      );
    }
    const marker = example === "minimal" ? "MINIMAL_CALLBACK_BODY" : "FLUID_CALLBACK_BODY";
    const retained = code.includes(marker);
    assert.equal(retained, bundler !== "webpack", `${bundler}/${example}: unexpected DCE result`);
    const existingSharedTreeBodyRetained =
      example === "fluid" ? code.includes("No options for structural types") : null;
    if (example === "fluid") {
      assert.equal(
        existingSharedTreeBodyRetained,
        bundler !== "webpack",
        "Existing SchemaFactory debug-assert callback must show the same gap",
      );
    }
    results.push({
      bundler,
      version: stats.version,
      example,
      callbackBodyRetained: retained,
      existingSharedTreeBodyRetained,
      predicateCalls: run.predicateCalls,
      factoryCalls: factory.factoryCalls,
      bytes: Buffer.byteLength(code),
    });
  }
}
assert.ok(results.length > 0, "Specify at least one bundler");
console.table(results);
console.log("Reproduced the expected optimization gap; runtime checks passed.");
