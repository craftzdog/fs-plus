import { createPlugins } from "rollup-plugin-atomic";
import { readFileSync } from "fs";

const plugins = createPlugins(["js"]);
const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const deps = Object.keys(pkg.dependencies);

export default [
  {
    input: "src/fs-plus.mjs",
    output: [
      {
        dir: "lib",
        format: "cjs",
        sourcemap: true,
      },
    ],
    // loaded externally
    external: [...deps],
    plugins: plugins,
  },
];
