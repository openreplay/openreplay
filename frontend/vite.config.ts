import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindPostcss from '@tailwindcss/postcss';
import postcssImport from 'postcss-import';
import postcssMixins from 'postcss-mixins';
import postcssNesting from 'postcss-nesting';
import postcssSimpleVars from 'postcss-simple-vars';
import sirv from 'sirv';
import { defineConfig, loadEnv } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tsconfigPaths from 'vite-tsconfig-paths';

import colors from './app/theme/colors';

const APP_ASSETS_DIR = path.resolve(__dirname, 'app/assets');
const PLAYER_DIR = path.resolve(__dirname, '../player');
const PLAYER_SRC_DIR = path.resolve(PLAYER_DIR, 'src');
const STYLES_IMPORT_DIR = path.resolve(__dirname, 'app/styles/import');

const transformColorsToCssVars = (
  colorsObj: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(colorsObj)) {
    if (typeof value === 'object' && value !== null && key !== 'dark') {
      const transformedNested: Record<string, string> = {};
      for (const nestedKey of Object.keys(value)) {
        transformedNested[nestedKey] = `var(--color-${key}-${nestedKey})`;
      }
      result[key] = transformedNested;
    } else if (key !== 'dark') {
      result[key] = `var(--color-${key})`;
    }
  }
  return result;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const processEnvDefine = Object.fromEntries(
    Object.keys(env)
      .filter((key) => key !== 'NODE_ENV')
      .map((key) => [`process.env.${key}`, JSON.stringify(env[key])]),
  );

  // NODE_ENV has to be resolved the same way Vite resolves `isProduction`,
  // which is `VITE_USER_NODE_ENV ?? mode` — VITE_USER_NODE_ENV being whatever
  // NODE_ENV the .env files set. It cannot come from `env` above: loadEnv with
  // an empty prefix folds the real process.env in on top of the .env files, and
  // `vite build` has already set process.env.NODE_ENV=production there, so
  // env.NODE_ENV reads "production" even when .env says development.
  //
  // If the two disagree the build compiles but dies on load: plugin-react sees
  // isProduction=false and emits the development JSX transform (jsxDEV from
  // react/jsx-dev-runtime), while this define sends React to its *production*
  // jsx-dev-runtime, which is a stub exporting `jsxDEV = undefined` — hence
  // "(0 , X.jsxDEV) is not a function" at startup.
  processEnvDefine['process.env.NODE_ENV'] = JSON.stringify(
    process.env.VITE_USER_NODE_ENV ?? mode,
  );

  return {
    root: __dirname,
    publicDir: false,
    plugins: [
      react({
        include: /\.(mjs|js|jsx|ts|tsx)$/,
      }),
      tsconfigPaths({ projects: ['./tsconfig.json'] }),
      viteStaticCopy({
        // `app/assets/*` matched only the top-level *files* (the plugin globs
        // with onlyFiles), so img/, integrations/, mocks/ and prism/ were never
        // copied, and the files it did copy kept their path relative to the
        // project root — landing in assets/app/assets/ instead of assets/.
        // `**/*` picks up the subdirectories; stripBase drops the two leading
        // `app/assets` segments so the tree mirrors app/assets at /assets.
        targets: [
          {
            src: 'app/assets/**/*',
            dest: 'assets',
            rename: { stripBase: 2 },
          },
        ],
      }),
      {
        name: 'serve-app-assets-dev',
        configureServer(server) {
          server.middlewares.use(
            '/assets',
            sirv(APP_ASSETS_DIR, { dev: true, etag: true }),
          );
        },
      },
      {
        name: 'watch-player-source',
        configureServer(server) {
          // Player lives outside the project root; chokidar's default watch
          // tree doesn't include it, so add it explicitly. With
          // preserveSymlinks: false, Vite's module graph keys player files
          // by their real path under PLAYER_SRC_DIR, which matches what
          // chokidar emits — HMR fires correctly.
          server.watcher.add(PLAYER_SRC_DIR);
        },
      },
    ],
    resolve: {
      alias: [
        { find: 'antd', replacement: 'antd/es/index.js' },
        // @ant-design/icons hardcodes its SVG imports to the CJS `/lib/asn/*`
        // subpath, and @ant-design/icons-svg ships no `exports` map to redirect
        // them. Rolldown mis-tree-shakes those CJS modules — it drops the
        // `exports.default = <icon>` assignment (sideEffects:false), leaving the
        // icon definition undefined so AntdIcon crashes on `icon.name` (prod
        // only; dev serves unbundled ESM). Route them to the pure-ESM `/es/`
        // build, which has no reassignment pattern and tree-shakes correctly.
        {
          find: /^@ant-design\/icons-svg\/lib\/(.*)$/,
          replacement: path.resolve(
            __dirname,
            'node_modules/@ant-design/icons-svg/es/$1',
          ),
        },
        {
          find: 'icons.css',
          replacement: path.resolve(STYLES_IMPORT_DIR, 'icons.css'),
        },
        {
          find: 'mixins.css',
          replacement: path.resolve(STYLES_IMPORT_DIR, 'mixins.css'),
        },
        {
          find: 'zindex.css',
          replacement: path.resolve(STYLES_IMPORT_DIR, 'zindex.css'),
        },
        {
          find: 'animations.css',
          replacement: path.resolve(STYLES_IMPORT_DIR, 'animations.css'),
        },
        // Player package's deps that aren't installed in player/node_modules
        // (yarn berry portal hoists deps to the consumer's node_modules, so
        // when player files are loaded by their real path, node-style
        // resolution from there fails to find these). Explicit aliases keep
        // resolution working without enabling preserveSymlinks (which breaks
        // HMR for node_modules-prefixed paths).
        {
          find: '@medv/finder',
          replacement: path.resolve(__dirname, 'node_modules/@medv/finder'),
        },
      ],
      preserveSymlinks: false,
    },
    define: processEnvDefine,
    css: {
      postcss: {
        plugins: [
          postcssImport({ path: STYLES_IMPORT_DIR }),
          postcssMixins(),
          postcssSimpleVars({
            variables: transformColorsToCssVars(colors as Record<string, unknown>),
          }),
          postcssNesting(),
          tailwindPostcss(),
        ],
      },
    },
    server: {
      port: 3333,
      open: !process.env.CI,
      fs: {
        allow: [path.resolve(__dirname), PLAYER_DIR],
      },
    },
    optimizeDeps: {
      exclude: ['@openreplay/player'],
    },
    build: {
      outDir: 'public',
      emptyOutDir: true,
      sourcemap: env.SOURCEMAP === 'true',
      target: 'es2022',
    },
  };
});
