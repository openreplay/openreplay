## Local build


### `tracker` and `tracker-assist`

These two are a bun workspace. Install from this directory (`tracker/`), not from
the package folder, so the workspace root's `bun.lock` and its dependency
`overrides` are applied — those overrides pin patched versions of some transitive
dependencies, and installing with another package manager silently skips them:

```sh
bun install --frozen-lockfile
```

Then build the package you need:

```sh
cd tracker          # or tracker-assist
bun run build
```

### Other `tracker-*` plugins

Each plugin is its own yarn project with its own committed `yarn.lock`:

```sh
cd tracker-axios    # or any other tracker-* plugin
yarn --frozen-lockfile
yarn build
```

You can then use it as a local javascript package by executing the folowing line under your local project location:

```sh
yarn add file:../path/to/openreplay/monorepo/tracker/tracker
````
OR
```sh
npm install --save ../path/to/openreplay/monorepo/tracker/tracker
```


## Contributing notes

read [CONTRIBUTING.md](./CONTRIBUTING.md)