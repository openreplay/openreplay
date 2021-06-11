# sourcemaps-uploader

A NPM module to upload your JS sourcemaps files to [OpenReplay](https://openreplay.com/).

## Installation

```
npm i -D @openreplay/sourcemap-uploader 
```

## CLI

Upload sourcemap for one file

```
sourcemap-uploader -k API_KEY -p PROJECT_KEY file -m ./dist/index.js.map -u https://myapp.com/index.js
```

Upload all sourcemaps in the directory. The url must correspond to the root where you upload JS files from the directory.

Thus, if you have your `app-42.js` along with  the `app-42.js.map` in the `./build` folder and then want to upload it to you server (you might want to avoid uploading soursemaps) so it can be reachable through the link `https://myapp.com/static/app-42.js`, the command would be the next:

```
sourcemap-uploader -k API_KEY -p PROJECT_KEY dir -m ./build -u https://myapp.com/static
```

Use `-v` (`--verbose`) key to see the logs.


## NPM

There are two functions inside `index.js` of the package

```
uploadFile(api_key, project_key, sourcemap_file_path, js_file_url)
uploadDir(api_key, project_key, sourcemap_dir_path, js_dir_url)
```

Both functions return Promise.
