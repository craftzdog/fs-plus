import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/fs-plus.ts',
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  sourcemap: true,
  dts: true
})
