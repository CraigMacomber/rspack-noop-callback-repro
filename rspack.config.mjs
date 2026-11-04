import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default function createConfig(bundler, example) {
  return {
    context: root,
    mode: "production",
    target: "web",
    devtool: false,
    entry: `./src/${example}.js`,
    output: {
      path: path.join(root, `${bundler}-dist`, example),
      filename: "main.cjs",
      library: { type: "commonjs2" },
      clean: true,
    },
    optimization: {
      concatenateModules: true,
      // Use the bundler's actual default minimizer, including its default passes.
      minimizer: ["..."],
    },
  };
}
