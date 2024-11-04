const fs = require('fs');

function collectFilenames(dirName, filter = () => true) {
  const files = fs.readdirSync(dirName, { withFileTypes: true });
  const names = [];
  files.map((file) => {
    if (file.isDirectory()) {
      const namesFromDir = collectFilenames(`${ dirName }/${ file.name }`, filter)
        .map(name => `${ file.name }/${ name }`);
      [].push.apply(names, namesFromDir);
    } else if(filter(file.name)) {
      names.push(file.name);
    }
  });
  return names;
}

module.exports = {
	collectFilenames,
}