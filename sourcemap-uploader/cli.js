#!/usr/bin/env node
'use strict';

const { ArgumentParser } = require('argparse');
const { version, description } = require('./package.json');

const { uploadFile, uploadDir } = require('./index.js');

const parser = new ArgumentParser({
  description,
});
parser.add_argument('-v', '--version', { action: 'version', version });
parser.add_argument('-k', '--api-key', {
  help: 'API key',
  required: true,
});
parser.add_argument('-p', '-i', '--project-key', {
  // -i is depricated
  help: 'Project Key',
  required: true,
});
parser.add_argument('-s', '--server', {
  help: 'OpenReplay API server URL for upload',
});
// Should be verbose, but conflicting on npm compilation into bin
parser.add_argument('-l', '--logs', {
  help: 'Log requests information',
  action: 'store_true',
});

const subparsers = parser.add_subparsers({
  title: 'commands',
  dest: 'command',
  required: true,
});

const file = subparsers.add_parser('file');
file.add_argument('-m', '--sourcemap-file-path', {
  help: 'Local path to the sourcemap file',
  required: true,
});
file.add_argument('-u', '--js-file-url', {
  help: 'URL to the minified js file',
  required: true,
});

const dir = subparsers.add_parser('dir');
dir.add_argument('-m', '--sourcemap-dir-path', {
  help: 'Dir with the sourcemap files',
  required: true,
});
dir.add_argument('-u', '--js-dir-url', {
  help: 'Base URL where the corresponding dir will be placed',
  required: true,
});

// TODO: exclude in dir

const { command, api_key, project_key, server, logs, ...args } =
  parser.parse_args();

global._VERBOSE = !!logs;
console.log(command);
(command === 'file'
  ? uploadFile(
      api_key,
      project_key,
      args.sourcemap_file_path,
      args.js_file_url,
      server,
    )
  : uploadDir(
      api_key,
      project_key,
      args.sourcemap_dir_path,
      args.js_dir_url,
      server,
    )
)
  .then((sourceFiles) => console.log('asd') ||
    sourceFiles.length > 0
      ? console.log(
          `Successfully uploaded ${sourceFiles.length} sourcemap file${
            sourceFiles.length > 1 ? 's' : ''
          } for: \n` + sourceFiles.join('\t\n'),
        )
      : console.log(`No sourcemaps found in ${args.sourcemap_dir_path}`),
  )
  .catch((e) => console.error(`Sourcemap Uploader: ${e}`));
