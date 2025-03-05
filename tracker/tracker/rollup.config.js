import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import replace from '@rollup/plugin-replace'
import { rollup } from 'rollup'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const packageConfig = require('./package.json')

export default async () => {
  const webworkerContent = await buildWebWorker()

  const commonPlugins = [
    resolve(),
    // terser(),
    replace({
      preventAssignment: true,
      values: {
        TRACKER_VERSION: packageConfig.version,
        'global.WEBWORKER_BODY': JSON.stringify(webworkerContent),
      },
    }),
  ]
  return [
    {
      input: 'src/main/index.ts',
      output: {
        dir: 'dist/lib',
        format: 'es',
        sourcemap: true,
        entryFileNames: '[name].js',
      },
      plugins: [
        ...commonPlugins,
        typescript({
          tsconfig: 'src/main/tsconfig.json',
        }),
      ],
    },
    {
      input: 'src/main/index.ts',
      output: {
        dir: 'dist/cjs',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: '[name].js',
      },
      plugins: [
        ...commonPlugins,
        typescript({
          tsconfig: 'src/main/tsconfig-cjs.json',
        }),
      ],
    },
  ]
}

async function buildWebWorker() {
  console.log('building wworker')
  const bundle = await rollup({
    input: 'src/webworker/index.ts',
    plugins: [
      resolve(),
      typescript({
        tsconfig: 'src/webworker/tsconfig.json',
      }),
      terser(),
    ],
  })

  const { output } = await bundle.generate({
    format: 'iife',
    name: 'WebWorker',
    inlineDynamicImports: true,
  })
  const webWorkerCode = output[0].code

  console.log('webworker done!', output.length)

  return webWorkerCode
}
