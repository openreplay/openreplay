import { promises as fs } from 'fs';
import replaceInFiles from 'replace-in-files';
import packageConfig from '../package.json';

async function main() {
  const webworker = await fs.readFile('build/webworker.js', 'utf8');
  await replaceInFiles({
    files: 'build/**/*',
    from: 'TRACKER_VERSION',
    to: packageConfig.version,
  });
  await replaceInFiles({
    files: 'build/**/*',
    from: 'WEBWORKER_BODY',
    to: webworker.replace(/'/g, "\\'"),
  });
  await fs.rename('build/main', 'lib');
  await fs.rename('build/messages', 'lib/messages');
  await replaceInFiles({
    files: 'lib/*',
    from: /\.\.\/messages/g,
    to: './messages',
  });
  await replaceInFiles({
    files: 'lib/**/*',
    from: /\.\.\/\.\.\/messages/g,
    to: '../messages',
  });
  

  await fs.rename('build/cjs/main', 'cjs');
  await fs.rename('build/cjs/messages', 'cjs/messages');
  await fs.writeFile('cjs/package.json', `{ "type": "commonjs" }`);
  await replaceInFiles({
    files: 'cjs/*',
    from: /\.\.\/messages/g,
    to: './messages',
  });
  await replaceInFiles({
    files: 'cjs/**/*',
    from: /\.\.\/\.\.\/messages/g,
    to: '../messages',
  });
}
main()
  .then(() => console.log('compiled'))
  .catch((err) => console.error(err));
