import dts from 'rollup-plugin-dts'

// Bundles the per-file declarations emitted into dist/types into one flat .d.ts
// per entry point. Flattening removes every relative import, which is what keeps
// the published types resolvable under moduleResolution: node16/nodenext.
const entryPoints = ['entry', 'index']

export default entryPoints.map((name) => ({
  input: `dist/types/main/${name}.d.ts`,
  output: { file: `dist/lib/${name}.d.ts`, format: 'es' },
  plugins: [dts()],
}))
