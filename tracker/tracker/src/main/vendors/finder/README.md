![finder](https://medv.io/assets/finder.png)

# finder

[![npm](https://img.shields.io/npm/v/@medv/finder?color=grightgreen)](https://www.npmjs.com/package/@medv/finder)
[![Build status](https://img.shields.io/travis/antonmedv/finder)](https://travis-ci.org/antonmedv/finder)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@medv/finder?label=size)](https://bundlephobia.com/result?p=@medv/finder)

> CSS Selector Generator

## Features

* Generates **shortest** selectors
* **Unique** selectors per page
* Stable and **robust** selectors
* **2.1 kB** gzip and minify size

## Install

```bash
npm install @medv/finder
```

Finder can be used via modules:

```html
<script type="module">
  import {finder} from 'https://medv.io/finder/finder.js'
</script>
```

## Usage 

```js
import {finder} from '@medv/finder'

document.addEventListener('click', event => {
  const selector = finder(event.target)
  console.log(selector)  
})
```

## Example

Example of generated selector:

```css
.blog > article:nth-child(3) .add-comment
```

## Configuration

`finder` takes configuration object as second parameters. Here is example of all params with default values:

```js
const selector = finder(event.target, {
  root: document.body,
  className: (name) => true,
  tagName: (name) => true,
  attr: (name, value) => false,
  seedMinLength: 1,
  optimizedMinLength: 2,
  threshold: 1000,
  maxNumberOfTries: 10_000,
})
```

#### `root: Element`

Root of search, defaults to `document.body`.

#### `idName: (name: string) => boolean`

Check if this ID can be used. For example you can restrict using framework specific IDs:

```js
const selector = finder(event.target, {
  idName: name => !name.startsWith('ember')
})
```

#### `className: (name: string) => boolean`

Check if this class name can be used. For example you can restrict using _is-*_ class names:

```js
const selector = finder(event.target, {
  className: name => !name.startsWith('is-')
})
```

#### `tagName: (name: string) => boolean`

Check if tag name can be used, same as `className`.

#### `attr: (name: string, value: string) => boolean`

Check if attr name can be used.

#### `seedMinLength: number`

Minimum length of levels in fining selector. Starts from `1`. 
For more robust selectors give this param value around 4-5 depending on depth of you DOM tree. 
If `finder` hits `root` this param is ignored.

#### `optimizedMinLength: number`

Minimum length for optimising selector. Starts from `2`. 
For example selector `body > div > div > p` can be optimized to `body p`.

#### `threshold: number`

Max number of selectors to check before falling into `nth-child` usage. 
Checking for uniqueness of selector is very costs operation, if you have DOM tree depth of 5, with 5 classes on each level, 
that gives you more than 3k selectors to check. 
`finder` uses two step approach so it's reaching this threshold in some cases twice.
Default `1000` is good enough in most cases.  

#### `maxNumberOfTries: number`

Max number of tries when we do the optimization. It is a trade-off between optimization and efficiency.
Default `10_000` is good enough in most cases.  

### Google Chrome Extension

![Chrome Extension](https://user-images.githubusercontent.com/141232/36737287-4a999d84-1c0d-11e8-8a14-43bcf9baf7ca.png)

Generate the unique selectors in your browser by using [Chrome Extension](https://chrome.google.com/webstore/detail/get-unique-css-selector/lkfaghhbdebclkklgjhhonadomejckai)

## License

[MIT](LICENSE)
