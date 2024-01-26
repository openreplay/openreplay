const { promises: fs } = require('fs')
const replaceInFiles = require('replace-in-files')
const packageConfig = require('../package.json')

async function main() {
  await replaceInFiles({
    files: 'build/**/*',
    from: 'TRACKER_VERSION',
    to: packageConfig.version,
  });
  await fs.rename('build/main', 'lib');
  await fs.rename('build/common', 'lib/common');
  await replaceInFiles({
    files: 'lib/*',
    from: /\.\.\/common/g,
    to: './common',
  });
  await replaceInFiles({
    files: 'lib/**/*',
    from: /\.\.\/\.\.\/common/g,
    to: '../common',
  });


  await fs.rename('build/cjs/main', 'cjs');
  await fs.rename('build/cjs/common', 'cjs/common');
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
  .catch((err) => console.error(err));
