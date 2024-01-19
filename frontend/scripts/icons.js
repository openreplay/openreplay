/// <reference types="node" />
/* eslint-disable @typescript-eslint/no-var-requires */
const { optimize } = require('svgo');
const fs = require('fs');
const { collectFilenames } = require('./fs');
const path = require('path');

const svgRE = /\.svg$/;
const ICONS_DIRNAME =  path.join(__dirname, '../app/svg/icons')
const UI_DIRNAME = path.join(__dirname, '../app/components/ui')
const icons = collectFilenames(ICONS_DIRNAME, n => svgRE.test(n));

const getDirectories = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
const titleCase = (string) => {
  return string[0].toUpperCase() + string.slice(1).toLowerCase();
}

const plugins = (removeFill = true) => {
  return {
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            inlineStyles: {
              onlyMatchedOnce: false
            }
          }
        }
      },
      {
        name: 'removeAttrs',
        params: {
          attrs: ['xml', 'class', 'style', 'data-name', 'dataName', 'svg:width', 'svg:height', 'fill-rule', 'clip-path']
        }
      },
      {
        name: 'addAttributesToSVGElement',
        params: {
          attributes: ['width={ `${ width }px` }', 'height={ `${ height }px` }', !removeFill ? 'fill={ `${ fill }` }' : '']
        }
      },
      { name: 'removeXMLNS' }
    ]
  };
};

const iconPaths = [];
const dirs = getDirectories(ICONS_DIRNAME);

console.log(ICONS_DIRNAME, UI_DIRNAME, icons, dirs)

fs.mkdirSync(`${UI_DIRNAME}/Icons`, { recursive: true });
dirs.forEach((dir) => {
  fs.mkdirSync(`${UI_DIRNAME}/Icons/${dir.replaceAll('-', '_')}`, { recursive: true });
})

icons.forEach((icon) => {
  const fileName = icon.slice(0, -4).replaceAll('-', '_').replaceAll('/', '_');
  const name = fileName
  const path = `${UI_DIRNAME}/Icons/${name}.tsx`
  iconPaths.push({ path: `./Icons/${name}`, name, oldName: icon.slice(0, -4), fileName });
  const svg = fs.readFileSync(`${ICONS_DIRNAME}/${icon}`, 'utf-8');
  const canOptimize = !icon.includes('integrations');
  const { data } = optimize(svg, plugins(canOptimize));
  fs.writeFileSync(path, `
/* Auto-generated, do not edit */
import React from 'react';

interface Props {
    size?: number | string;
    width?: number | string;
    height?: number | string;
    fill?: string;
}

function ${titleCase(fileName)}(props: Props) {
    const { size = 14, width = size, height = size, fill = '' } = props;
    return (
      ${data.replaceAll(/xlink\:href/g, 'xlinkHref')
        .replaceAll(/xmlns\:xlink/g, 'xmlnsXlink')
        .replaceAll(/clip\-path/g, 'clipPath')
        .replaceAll(/clip\-rule/g, 'clipRule')
        // hack to keep fill rule for some icons like stop recording square
        .replaceAll(/clipRule="evenoddCustomFill"/g, 'clipRule="evenodd" fillRule="evenodd"')
        .replaceAll(/fill-rule/g, 'fillRule')
        .replaceAll(/fill-opacity/g, 'fillOpacity')
        .replaceAll(/stop-color/g, 'stopColor')
        .replaceAll(/stroke-width/g, 'strokeWidth')
        .replaceAll(/stroke-linecap/g, 'strokeLinecap')
        .replaceAll(/stroke-linejoin/g, 'strokeLinejoin')
        .replaceAll(/stroke-miterlimit/g, 'strokeMiterlimit')
        .replaceAll(/xml:space="preserve"/g, '')
    }
  );
}

export default ${titleCase(fileName)};
`)
})

fs.writeFileSync(`${UI_DIRNAME}/Icons/index.ts`, `
/* Auto-generated, do not edit */
${iconPaths.map((icon) => `export { default as ${titleCase(icon.fileName)} } from './${icon.fileName}';`).join('\n')}
`);

// MAIN FILE
fs.writeFileSync(`${UI_DIRNAME}/SVG.tsx`, `
/* Auto-generated, do not edit */
import React from 'react';
import {
${iconPaths.map(icon => `  ${titleCase(icon.fileName)}`).join(',\n')}
} from './Icons'


// export type NewIconNames = ${icons.map((icon) => '\'' + icon.slice(0, -4).replaceAll('-', '_') + '\'').join(' | ')};
export type IconNames = ${icons.map((icon) => '\'' + icon.slice(0, -4) + '\'').join(' | ')};

interface Props {
    name: IconNames;
    size?: number | string;
    width?: number | string;
    height?: number | string;
    fill?: string;
}

/* Auto-generated, do not edit */
const SVG = (props: Props) => {
    const { name, size = 14, width = size, height = size, fill = '' } = props;
    switch (name) {
${iconPaths.map(icon => {
  return `
    ${icon.oldName !== icon.name ? `// case '${icon.oldName}':` : ''}
    case '${icon.oldName}': return <${titleCase(icon.fileName)} width={ width } height={ height } fill={ fill } />;
  `}
).join('')}
default:
        return <svg width={ width } height={ height } />;
            // if (window.ENV.PRODUCTION) return null;
            // throw "unknown icon name " + name;
    }
}
SVG.displayName = 'SVG';
export default SVG;
`);
