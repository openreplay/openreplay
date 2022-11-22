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
parser.addArgument(['-p', '-i', '--project-key'], {
  // -i is depricated
  help: 'Project Key',
  required: true,
});
parser.addArgument(['-s', '--server'], {
  help: 'OpenReplay API server URL for upload',
});
// Should be verbose, but conflicting on npm compilation into bin
parser.addArgument(['-l', '--logs'], {
  help: 'Log requests information',
  action: 'storeTrue',
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

// TODO: exclude in dir

const { command, api_key, project_key, server, logs, ...args } =
  parser.parseArgs();

global._VERBOSE = !!logs;

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
  .then((sourceFiles) =>
    sourceFiles.length > 0
      ? console.log(
          `Successfully uploaded ${sourceFiles.length} sourcemap file${
            sourceFiles.length > 1 ? 's' : ''
          } for: \n` + sourceFiles.join('\t\n'),
        )
      : console.log(`No sourcemaps found in ${args.sourcemap_dir_path}`),
  )
  .catch((e) => console.error(`Sourcemap Uploader: ${e}`));
