const readFile = require('./lib/readFile.js'),
  readDir = require('./lib/readDir.js'),
  uploadSourcemaps = require('./lib/uploadSourcemaps.js');

module.exports = {
  async uploadFile(
    api_key,
    project_key,
    sourcemap_file_path,
    js_file_url,
    server,
  ) {
    const sourcemap = await readFile(sourcemap_file_path, js_file_url);
    return uploadSourcemaps(api_key, project_key, [sourcemap], server);
  },
  async uploadDir(
    api_key,
    project_key,
    sourcemap_dir_path,
    js_dir_url,
    server,
  ) {
    const sourcemaps = await readDir(sourcemap_dir_path, js_dir_url);

    return uploadSourcemaps(api_key, project_key, sourcemaps, server);
  },
};
