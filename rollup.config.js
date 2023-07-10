import { createPlugins } from "rollup-plugin-atomic";

const plugins = createPlugins(["js", "babel"]);
const deps = Object.keys(require("./package.json").dependencies);

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
