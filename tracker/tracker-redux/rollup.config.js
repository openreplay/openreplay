import resolve from '@rollup/plugin-node-resolve'
import { babel } from '@rollup/plugin-babel'
import { terser } from 'rollup-plugin-terser'

export default {
  input: 'lib/worker/worker.js',
  output: {
    file: 'build/webworker.js',
    format: 'cjs',
  },
  plugins: [resolve(), babel({ babelHelpers: 'bundled' }), terser({ mangle: { reserved: ['$'] } })],
}
