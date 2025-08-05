import fs from 'node:fs';

export function checkDir(outDir) {
  const dirExists = fs.existsSync(process.env.OUTDIR);
  if (dirExists) {
    // remove all
    fs.readdirSync(outDir).forEach(file => {
      const filePath = `${outDir}/${file}`;
      if (fs.lstatSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      } else if (fs.lstatSync(filePath).isDirectory()) {
        fs.rm(filePath, () => console.log('removed old dir'));
      }
    });
  } else {
    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(`${outDir}/pages`, { recursive: true })
  }
}
