# sourcemap-uploader

An NPM module to upload your JS sourcemap files to your OpenReplay instance.

## Installation

```
npm i -D @openreplay/sourcemap-uploader
```

## CLI

### Upload a sourcemap for one file:

```
sourcemap-uploader -s https://opnereplay.mycompany.com/api -k API_KEY -p PROJECT_KEY file -m ./dist/index.js.map -u https://myapp.com/index.js
```

### Upload all sourcemaps in a given directory. 
The URL must correspond to the root where you upload JS files from the directory. In other words, if you have your `app-42.js` along with  the `app-42.js.map` in the `./build` folder and then want to upload it to your OpenReplay instance so it can be reachable through the link `https://myapp.com/static/app-42.js`, then the command should be like:

```
sourcemap-uploader -s https://opnereplay.mycompany.com/api -k API_KEY -p PROJECT_KEY dir -m ./build -u https://myapp.com/static
```

- Use `-s` (`--server`) to specify the URL of your OpenReplay instance (append it with /api).
**Do not use this parameter if you use SaaS version of the OpenRplay**

- Use `-v` (`--verbose`) to see the logs.

## NPM

There are two functions you can export from the package:

```
uploadFile(api_key, project_key, sourcemap_file_path, js_file_url, [server])
uploadDir(api_key, project_key, sourcemap_dir_path, js_dir_url, [server])
```

Both functions return Promise with a result value to be the list of files for which sourcemaps were uploaded.
