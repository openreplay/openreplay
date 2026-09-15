import babel, { defineRolldownBabelPreset } from '@rolldown/plugin-babel';
import tailwindPostcss from '@tailwindcss/postcss';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import postcssImport from 'postcss-import';
import postcssMixins from 'postcss-mixins';
import postcssNesting from 'postcss-nesting';
import postcssSimpleVars from 'postcss-simple-vars';
import sirv from 'sirv';
import { defineConfig, loadEnv } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tsconfigPaths from 'vite-tsconfig-paths';

import colors from './app/theme/colors';
import babelMobxNoMemo from './scripts/babelMobxNoMemo';

const APP_ASSETS_DIR = path.resolve(__dirname, 'app/assets');
const PLAYER_DIR = path.resolve(__dirname, '../player');
const PLAYER_SRC_DIR = path.resolve(PLAYER_DIR, 'src');
const STYLES_IMPORT_DIR = path.resolve(__dirname, 'app/styles/import');

const COMPRESSIBLE_RE = /\.(js|css|html|json|svg|map)$/;
const COMPRESS_MIN_BYTES = 1024;

/* Emits .gz/.br next to every asset for nginx `gzip_static` / `brotli_static`,
   at the slowest settings an on-the-fly pass could not afford. */
const precompress = () => {
  let outDir = 'public';

  return {
    name: 'precompress-assets',
    apply: 'build' as const,
    configResolved(resolved: { build: { outDir: string } }) {
      outDir = resolved.build.outDir;
    },
    closeBundle() {
      const walk = (dir: string): string[] =>
        fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
          const p = path.join(dir, e.name);
          return e.isDirectory() ? walk(p) : [p];
        });

      const root = path.resolve(__dirname, outDir);
      if (!fs.existsSync(root)) return;

      for (const file of walk(root)) {
        if (!COMPRESSIBLE_RE.test(file)) continue;
        const raw = fs.readFileSync(file);
        if (raw.length < COMPRESS_MIN_BYTES) continue;

        fs.writeFileSync(`${file}.gz`, zlib.gzipSync(raw, { level: 9 }));
        fs.writeFileSync(
          `${file}.br`,
          zlib.brotliCompressSync(raw, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
              [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
            },
          }),
        );
      }
    },
  };
};

/**
 * Tags that depend on build-time config, so index.html can stay static.
 *
 *  - preconnect to the API and asset hosts; skipped when the host is unset or
 *    already same-origin, where it would do nothing.
 *  - Turnstile, which is unreachable unless CAPTCHA_ENABLED.
 */
const injectHtmlHints = (env: Record<string, string>) => ({
  name: 'inject-html-hints',
  transformIndexHtml() {
    const tags: {
      tag: string;
      attrs: Record<string, string | boolean>;
      injectTo: 'head-prepend' | 'head';
    }[] = [];

    const origins = new Set<string>();
    for (const value of [env.API_EDP, env.ASSETS_HOST]) {
      if (!value || !/^https?:\/\//i.test(value)) continue;
      try {
        origins.add(new URL(value).origin);
      } catch {
        /* not an absolute URL — nothing to preconnect to */
      }
    }
    for (const origin of origins) {
      tags.push({
        tag: 'link',
        attrs: { rel: 'preconnect', href: origin, crossorigin: true },
        // Ahead of the module preloads, so the socket is open by the time the
        // bundle parses and fires its first request.
        injectTo: 'head-prepend',
      });
    }

    if (env.CAPTCHA_ENABLED === 'true') {
      tags.push({
        tag: 'script',
        attrs: {
          src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?compat=recaptcha',
          async: true,
          defer: true,
        },
        injectTo: 'head',
      });
    }

    return tags;
  },
});

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
      // React Compiler, through the official Babel plugin. Runs at the `pre`
      // stage on raw TSX, before Vite's oxc transform strips types/JSX and adds
      // Fast Refresh. Babel applies presets last-to-first, so the MobX opt-out
      // preset below runs before the compiler and its "use no memo" directives
      // are already in place when the compiler decides what to memoize.
      babel({
        include: /[\\/]frontend[\\/]app[\\/].*\.[jt]sx?(?:$|\?)/,
        presets: [
          reactCompilerPreset(),
          defineRolldownBabelPreset({
            preset: () => ({ plugins: [babelMobxNoMemo] }),
            rolldown: {
              filter: { code: /\b(?:observer|useStore)\b/ },
              applyToEnvironmentHook: (env) => env.config.consumer === 'client',
            },
          }),
        ],
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
      injectHtmlHints(env),
      precompress(),
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
            variables: transformColorsToCssVars(
              colors as Record<string, unknown>,
            ),
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
      // Every flag SVG is under the 4KB inline threshold, so all ~267 would be
      // base64'd back into the chunk that globs them. Emit files instead.
      assetsInlineLimit: (filePath: string) =>
        filePath.includes('country-flag-icons') ? false : undefined,
      reportCompressedSize: false,
      rolldownOptions: {
        output: {
          // Without a group, rolldown collapses every shared dependency into
          // one ~1.3MB chunk that the entry preloads.
          advancedChunks: {
            groups: [
              {
                name: 'react',
                test: /node_modules[/\\](react|react-dom|scheduler)[/\\]/,
                priority: 40,
              },
            ],
          },
        },
      },
    },
  };
});
