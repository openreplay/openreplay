import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';

export default {
  // For /node_modules\/error-stack-parser/ which is in CommonJS format
  // https://rollupjs.org/guide/en/#context
  context: 'window', 
  output: {
    file: 'dist/tracker.js',
    format: 'cjs',
  },
  plugins: [
    resolve({ browser: true }),
    commonjs({
      include: /node_modules/, 
    }),
    babel({
      presets: ['@babel/preset-env'],
      exclude: /node_modules/,
    }),
  ],
};
