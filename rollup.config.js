import resolve from "rollup-plugin-node-resolve";
import babel from "rollup-plugin-babel";
import { terser } from "rollup-plugin-terser";

export default {
  input: "index.js",
  output: { file: "index.min.js", format: "esm" },
  external: [],
  plugins: [
    resolve(),
    babel({
      exclude: "node_modules/**",
      presets: [
        ["@babel/env", { targets: { node: 12 } }],
        "@babel/preset-react",
      ],
    }),
    terser(),
  ],
};
