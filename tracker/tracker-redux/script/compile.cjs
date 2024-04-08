const { promises: fs } = require('fs');
const replaceInFiles = require('replace-in-files');

async function main() {
  const webworker = await fs.readFile('build/webworker.js', 'utf8');
  await replaceInFiles({
    files: 'cjs/**/*',
    from: 'WEBWORKER_BODY',
    to: webworker.replace(/'/g, "\\'").replace(/\n/g, ''),
  });
  await replaceInFiles({
    files: 'lib/**/*',
    from: 'WEBWORKER_BODY',
    to: webworker.replace(/'/g, "\\'").replace(/\n/g, ''),
  });
  await fs.writeFile('cjs/package.json', `{ "type": "commonjs" }`);
  await replaceInFiles({
    files: 'cjs/*',
    from: /\.\.\/common/g,
    to: './common',
  });
  await replaceInFiles({
    files: 'cjs/**/*',
    from: /\.\.\/\.\.\/common/g,
    to: '../common',
  });
}
main()
  .then(() => console.log('compiled'))
  .catch(err => console.error(err));
