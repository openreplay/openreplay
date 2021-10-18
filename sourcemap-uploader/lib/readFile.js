const fs = require('fs').promises;

module.exports = (sourcemap_file_path, js_file_url) =>
  fs.readFile(sourcemap_file_path, 'utf8').then((body) => {
    return { sourcemap_file_path, js_file_url, body };
  });
