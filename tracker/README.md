## Local build


In order to build locally any of the javascript packages located under this directory, go to the corresponding folder first:

```sh
cd tracker	# or any tracker-* plugin

```
Then run
```sh
yarn
yarn build
```
OR

```sh
npm i
npm run build
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