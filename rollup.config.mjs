import { readFileSync } from "fs";
import { builtinModules } from "module";

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
    external: [...builtinModules, ...deps],
  },
];
