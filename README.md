# No-op wrapper calls retain callback bodies in production

Two reproductions compare Rspack's default SWC minifier with Webpack's actual
default minifier. Both use production mode and module concatenation.

- **Standalone:** [minimal.js](./src/minimal.js) and
  [noop-wrapper.js](./src/noop-wrapper.js). No Fluid imports or other runtime
  dependencies. Standard purity annotations make the leaf operation removable;
  the wrapper becomes empty, but Rspack retains its calls and callback bodies.
- **Fluid:** [fluid.js](./src/fluid.js) uses the published Fluid Framework 3.7.0
  packages, without loaders, patches, or added annotations. It calls `debugAssert`
  and constructs and edits a small SharedTree schema. An existing debug-assert
  callback in `SchemaFactory` also remains only in the Rspack bundles.

## Run

Tested with Node.js 24.15.0 and pnpm 11.27.0 on Linux x64.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm repro
```

To test the pinned Rspack canary as well:

```sh
pnpm repro:canary
```

The canary corresponds to Rspack commit
`17f2cbb42195afae33acd6d9c91b834d02c0007c`.

## Expected results

| Bundler | Standalone callback body | Fluid callback body | Existing SharedTree callback |
| --- | --- | --- | --- |
| Rspack 2.3.1 | Retained | Retained | Retained |
| Rspack 2.3.2-canary-17f2cbb4-20261104201527 | Retained | Retained | Retained |
| Webpack 5.112.2 | Removed | Removed | Removed |

The verifier succeeds when it reproduces this difference. It fails if a build
has errors, an expected marker result changes, or a runtime assertion fails.
If testing a future fix, change the Rspack retention expectations to `false`.

In **all** production outputs:

- Test callbacks execute zero times.
- Argument-factory side effects execute once.
- The Fluid schema edit returns `["after","second"]`.
- Ordinary Fluid runtime assertions still throw.
- Fluid reports that non-production conditionals were removed.

The minimal example's build stats also verify that its entry and wrapper were
concatenated into the same module. This is not a cross-chunk optimization request.

## Inspect the output

Each bundler writes `main.cjs` and `stats.json` to
`<bundler>-dist/<example>/`, where the bundler is `rspack`, `webpack`, or `canary`,
and the example is `minimal` or `fluid`.

Search the JavaScript, not the stats, for:

- `MINIMAL_CALLBACK_BODY`
- `FLUID_CALLBACK_BODY`
- `No options for structural types` (an existing Fluid callback in
  `SchemaFactory.array` / `SchemaFactory.map`)

The emitted CommonJS library is a web-target bundle, executed in a Node VM for
automated checks. No browser or development server is needed.

Both builds use `optimization.minimizer: ["..."]`; there are no custom
`pure_funcs`, source transforms, pass counts, or minifier substitutions.
In particular, the Webpack comparison uses its own default configuration rather
than constructing a bare Terser plugin with different compression defaults.

The reported byte counts are informational. Different runtimes and other
optimizations affect total bundle size; marker/body retention is the criterion.
The small Fluid Rspack bundle is actually slightly smaller overall despite
retaining these callbacks.

## Separate commands

```sh
pnpm build:rspack
pnpm build:webpack
pnpm verify
pnpm build:canary
pnpm verify:canary
```

This repository is based on
[web-infra-dev/rspack-repro](https://github.com/web-infra-dev/rspack-repro)
at commit `f3cf8fe8cae2915f6ce1517cb92bd2d098557d18`.
The template's unused HTML/CSS/RSbuild demo was replaced with programmatic builds
so the same configuration and automated checks run against each bundler.
