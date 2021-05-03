# sourcemaps-uploader

A NPM module to upload your JS sourcemaps files to [OpenReplay](https://openreplay.com/).

## Installation

```
npm i @openreplay/sourcemap-uploader -D
```

## CLI

Upload sourcemap for one file

```
sourcemap-uploader -k API_KEY -p PROJECT_KEY file -m ./dist/index.js.map -u https://openreplay.com/index.js
```

Upload all sourcemaps in the directory. The path will be appended to the base url

```
sourcemap-uploader -k API_KEY -p PROJECT_KEY dir -m ./dist -u https://openreplay.com/
```

## NPM

There are two functions inside `index.js` of the package

```
uploadFile(api_key, project_key, sourcemap_file_path, js_file_url)
uploadDir(api_key, project_key, sourcemap_dir_path, js_dir_url)
```

Both functions return Promise.
