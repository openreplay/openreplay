const fs = require('fs');
const countries = require('country-data').countries;

delete countries['UK'];
delete countries['EU'];
for (let code in countries) {
  const country = countries[code];
  if (code.length != 2) {
    delete countries[code];
    continue;
  }
  countries[code] = countries[code].name;
}

function fromArray(data) {
  const d = {};
  data.forEach(v => d[v.toLowerCase().replace(/ /g, '_')] = v);
  return d;
};
const os = fromArray(['Windows', 'Mac OS X', 'Android', 'Linux']);
const browsers = fromArray(['Chrome', 'Firefox', 'Opera', 'Edge', 'IE', 'Safari']);

function toExport(name, data) {
  return `\n\nexport const ${ name } = ${ JSON.stringify(data, null, 2) };`;
};
fs.writeFileSync('app/constants.js',
  "/* eslint-disable */" +
  toExport('countries', countries) +
  toExport('os', os) +
  toExport('browser', browsers)
);

function toStyles(prefix, data) {
  const r = Object.keys(data).map(key => `[data-${ prefix }="${ key }"] {
  @mixin icon-before ${ prefix }/${ key }, $gray-medium, 12px {
    display: inline-block;
    vertical-align: middle;
    margin-right: 5px;
  }
  &::after{
    color: $gray-medium;
    content: "${ data[key] }";
  }
}`);
  return "@import \"icons.css\";\n@import \"colors.css\";\n\n" + r.join("\n");
};
fs.writeFileSync('app/styles/browsers.css', toStyles('browser', browsers));
fs.writeFileSync('app/styles/os.css', toStyles('os', os));
