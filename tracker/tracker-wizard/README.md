# @openreplay/wizard

Sets up the OpenReplay web tracker in an existing project:

```sh
npx @openreplay/wizard
```

It detects the framework, asks for the project key and a few options, installs the
packages, writes the tracker config and imports it from the app's client entry.
It shows every change before writing anything.

| Detected                     | What it writes                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Next.js 15.3+                | `openreplay.ts` + an import in `instrumentation-client.ts` (created if missing)              |
| Next.js < 15.3, App Router   | `openreplay.ts` + `app/openreplay-client.tsx` rendered in the root layout's `<body>`         |
| Next.js < 15.3, Pages Router | `openreplay.ts` + an import in `pages/_app` (created if missing)                             |
| Nuxt 3/4                     | `plugins/openreplay.client.ts` (`app/plugins` on Nuxt 4)                                     |
| Angular                      | `src/openreplay.ts` + an import in the `browser`/`main` file from `angular.json`             |
| React Router 7+ / Remix      | `app/openreplay.ts` + an import in `app/entry.client.tsx` (created if missing)               |
| React, Vue, Vite (any)       | `src/openreplay.ts` + an import in the entry from `index.html` (`src/main.*`, `src/index.*`) |
| Static HTML                  | the CDN script tag before `</head>` in the selected pages                                    |

The generated config starts with a comment pointing at the tracker's own docs
(`node_modules/@openreplay/tracker/docs/usage.md` and `api.md`, written for coding agents too)
when the installed version ships them (20+, 19.x after 19.1.2), otherwise at docs.openreplay.com.

The import goes first in the entry, so the tracker starts before the app's modules run.
Edits keep the file's quotes, semicolons and indentation (or the Prettier config).

## Questions

1. OpenReplay Cloud or self-hosted (sets `ingestPoint`)
2. Project key
3. Privacy: mask inputs and emails (default) / mask everything (`privateMode`) / record input values
4. Options (checkboxes):
   - record on localhost in development (on)
   - new DOM observer, `nextObserver` (on; tracker 20+ only)
   - test-id attributes as click labels, `customAttributes` (on, shown when `data-testid`/`-test`/`-cy`/`-qa` are found in the sources)
   - network request and response bodies
   - link backend logs: `X-OpenReplay-SessionToken` on same-origin requests or on an API URL it asks for (`sessionTokenHeader` + `tokenUrlMatcher`)
   - mask numbers in page text; respect Do Not Track
   - read stylesheets in the browser (`inlineCss: 1`) for CSS the backend can't fetch (VPN, login, CORS)
   - cross-origin iframes (`crossdomain`, shown when the sources render iframes; prints the iframe-side setup)
   - product analytics
5. Plugins: Assist, and the state plugin for each store library found in `package.json`

State plugins are wired automatically for Pinia (`createPinia().use(...)`, `$pinia` in Nuxt) and
for a single Redux Toolkit `configureStore()` without custom middleware. Zustand, MobX, Vuex,
NgRx and anything unusual get a short "to do" with the code to paste and the files to put it in.

## Without prompts

For CI and coding agents:

```sh
npx @openreplay/wizard --yes --key=<project key> [--host=https://openreplay.example.com] \
  [--assist] [--state=redux] [--privacy=strict] [--features=localhost,network]
```

`--dry-run` prints the changes and diffs without writing. `--help` lists all flags.

## Development

```sh
bun install
bun test            # transforms and per-framework plans on generated fixtures
bun run typecheck
bun run build       # dist/index.js, a single Node ESM file without runtime dependencies
bun src/index.ts --cwd ../some-app --dry-run
```

### Playground

Throwaway React (Redux Toolkit) and Vue (Pinia) apps in `playground/` (gitignored) for trying
the wizard by hand. Each is its own git repo, so `git diff` shows what the wizard changed.

```sh
bun run playground              # scaffold both (or: bun run playground vue)
cd playground/react
bun ../../src/index.ts          # the wizard from source; node ../../dist/index.js for the build
npm run dev
bun run playground:reset        # back to the scaffold, wizard packages pruned
bun run playground:down         # delete playground/
```

For TypeScript projects below tracker 20 the `network` object is written with every field,
because 19.x types reject a partial one.

`nextObserver` is written only when the project ends up on tracker 20+ (older type
definitions reject the option): the installed version when the tracker is already there, otherwise
the registry's `latest`, re-checked against what the package manager actually installed. There it
is written either way, `true` or `false` when unchecked: tracker 20 runs the new observer by
default and warns in the console when the option is left unset. The script tag loads
`static.openreplay.com/latest/`, so it always gets the option; builds before 20 ignore it.
