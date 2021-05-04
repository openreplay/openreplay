#!/usr/bin/env node
'use strict';

const { ArgumentParser } = require('argparse');
const { version, description } = require('./package.json');

const { uploadFile, uploadDir } = require('./index.js');

const parser = new ArgumentParser({
  version,
  description,
});
parser.addArgument(['-k', '--api-key'], {
  help: 'API key',
  required: true,
});
parser.addArgument(['-p', '-i', '--project-key'], { // -i is depricated
  help: 'Project Key',
  required: true,
});

parser.addArgument(['-s', '--server'], {
  help: 'OpenReplay API server URL for upload',
});

const subparsers = parser.addSubparsers({
  title: 'commands',
  dest: 'command',
});

const file = subparsers.addParser('file');
file.addArgument(['-m', '--sourcemap-file-path'], {
  help: 'Local path to the sourcemap file',
  required: true,
});
file.addArgument(['-u', '--js-file-url'], {
  help: 'URL to the minified js file',
  required: true,
});

const dir = subparsers.addParser('dir');
dir.addArgument(['-m', '--sourcemap-dir-path'], {
  help: 'Dir with the sourcemap files',
  required: true,
});
dir.addArgument(['-u', '--js-dir-url'], {
  help: 'Base URL where the corresponding dir will be placed',
  required: true,
});

const { command, api_key, project_key, server, ...args } = parser.parseArgs();

try {
  global.SERVER = new URL(server || "https://api.openreplay.com");
} catch (e) {
  console.error(`Sourcemap Uploader: server URL parse error. ${e}`)
}

(command === 'file'
  ? uploadFile(api_key, project_key, args.sourcemap_file_path, args.js_file_url)
  : uploadDir(api_key, project_key, args.sourcemap_dir_path, args.js_dir_url)
)
.then((uploadedFiles) => 
  console.log(`Sourcemap${uploadedFiles.length > 1 ? "s" : ""} successfully uploaded! (${uploadedFiles.length} files)\n` 
    + uploadedFiles.join("\t\n")
  )
)
.catch(e => console.error(`Sourcemap Uploader: ${e}`));
