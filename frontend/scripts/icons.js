const fs = require('fs');
const SVGO = require('svgo');
const deasync = require('deasync-promise');

const { collectFilenames }  = require('./fs');

const ICONS_DIRNAME = 'app/svg/icons';
const UI_DIRNAME = 'app/components/ui';

const svgo = new SVGO({ plugins: [
  { removeAttrs: { attrs: [ "class", "data-name", "dataName", "svg:width", "svg:height" ] } },
  { addAttributesToSVGElement: { attributes: [ "width={ `${ width }px` }", "height={ `${ height }px` }" ] } },
  { convertPathData: true }, // ?
  { removeViewBox: false },  // ?
  // { removeXMLNS: true }, // ?
  { inlineStyles: { onlyMatchedOnce: false } }, // ?
  { replaceDashes: {
    type: 'perItem',
    fn: (item) => {
      item.eachAttr(attr => {
        attr.name = attr.name.replace(/-([a-z])/g, gr => gr[1].toUpperCase())
      })
    }
  }}
]});

const svgRE = /\.svg$/;

const icons = collectFilenames(ICONS_DIRNAME, n => svgRE.test(n));

fs.writeFileSync(`${ UI_DIRNAME }/SVG.js`, `
/* Auto-generated, do not edit */

const SVG = ({ name, size, width=size, height=size }) => {
  switch (name) {
${ icons.map(name => `    case '${ name.slice(0, -4) }': return ${
    deasync(svgo.optimize(fs.readFileSync(
      `${ ICONS_DIRNAME }/${ name }`,
      'utf8',
    ))).data
    .replace(/xlink\:href/g, 'xlinkHref')
    .replace(/xmlns\:xlink/g, 'xmlnsXlink')
  }`).join('\n') }
    default:
      if (window.ENV.PRODUCTION) return null;
      throw "unknown icon name " + name;
  }
}

SVG.displayName = 'SVG';
export default SVG;
`);

console.log('SVG.js generated')
