/// <reference types="node" />
/* eslint-disable @typescript-eslint/no-var-requires */
const { optimize } = require('svgo');
const fs = require('fs');
const { collectFilenames } = require('./fs');
const path = require('path');

const svgRE = /\.svg$/;
const ICONS_DIRNAME = path.join(__dirname, '../app/svg/icons');
const UI_DIRNAME = path.join(__dirname, '../app/components/ui');
const icons = collectFilenames(ICONS_DIRNAME, (n) => svgRE.test(n));

const getDirectories = (source) =>
  fs
    .readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
const titleCase = (string) => {
  return string[0].toUpperCase() + string.slice(1).toLowerCase();
};

const plugins = (removeFill = true) => {
  return {
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: false,
            inlineStyles: {
              onlyMatchedOnce: false,
            },
          },
        },
      },
      {
        name: 'removeAttrs',
        params: {
          attrs: [
            'xml',
            'class',
            'style',
            'data-name',
            'dataName',
            'svg:width',
            'svg:height',
            'fill-rule',
            'clip-path',
          ],
        },
      },
      {
        name: 'addAttributesToSVGElement',
        params: {
          attributes: [
            'width={ `${ width }px` }',
            'height={ `${ height }px` }',
            !removeFill ? 'fill={ `${ fill }` }' : '',
          ],
        },
      },
      { name: 'removeXMLNS' },
    ],
  };
};

const iconPaths = [];
const dirs = getDirectories(ICONS_DIRNAME);

fs.mkdirSync(`${UI_DIRNAME}/Icons`, { recursive: true });
dirs.forEach((dir) => {
  fs.mkdirSync(`${UI_DIRNAME}/Icons/${dir.replaceAll('-', '_')}`, {
    recursive: true,
  });
});

icons.forEach((icon) => {
  const fileName = icon.slice(0, -4).replaceAll('-', '_').replaceAll('/', '_');
  const name = fileName;
  const path = `${UI_DIRNAME}/Icons/${name}.tsx`;
  iconPaths.push({
    path: `./Icons/${name}`,
    name,
    oldName: icon.slice(0, -4),
    fileName,
  });
  const svg = fs.readFileSync(`${ICONS_DIRNAME}/${icon}`, 'utf-8');
  const canOptimize = !icon.includes('integrations');
  const keepOriginal = icon.includes('color');
  const { data } = keepOriginal
    ? { data: svg }
    : optimize(svg, plugins(canOptimize));
  fs.writeFileSync(
    path,
    `/* Auto-generated, do not edit */
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
      ${data
        .replaceAll(/xlink\:href/g, 'xlinkHref')
        .replaceAll(/xmlns\:xlink/g, 'xmlnsXlink')
        .replaceAll(/clip\-path/g, 'clipPath')
        .replaceAll(/clip\-rule/g, 'clipRule')
        // hack to keep fill rule for some icons like stop recording square
        .replaceAll(
          /clipRule="evenoddCustomFill"/g,
          'clipRule="evenodd" fillRule="evenodd"'
        )
        .replaceAll(`stroke="no-fill"`, 'fill="none"')
        .replaceAll(/fill-rule/g, 'fillRule')
        .replaceAll(/fill-opacity/g, 'fillOpacity')
        .replaceAll(/stop-color/g, 'stopColor')
        .replaceAll(/stroke-width/g, 'strokeWidth')
        .replaceAll(/stroke-linecap/g, 'strokeLinecap')
        .replaceAll(/stroke-linejoin/g, 'strokeLinejoin')
        .replaceAll(/stroke-miterlimit/g, 'strokeMiterlimit')
        .replaceAll(/xml:space="preserve"/g, '')
        .replaceAll(/flood-opacity/g, 'floodOpacity')
        .replaceAll(/stop-opacity/g, 'stopOpacity')
        .replaceAll(
          /color-interpolation-filters/g,
          'colorInterpolationFilters'
        )}
  );
}

export default ${titleCase(fileName)};
`
  );
});

fs.writeFileSync(
  `${UI_DIRNAME}/Icons/index.ts`,
  `
/* Auto-generated, do not edit */
${iconPaths
  .map(
    (icon) =>
      `export { default as ${titleCase(icon.fileName)} } from './${
        icon.fileName
      }';`
  )
  .join('\n')}
`
);

// MAIN FILE
fs.writeFileSync(
  `${UI_DIRNAME}/SVG.tsx`,
  `
/* Auto-generated, do not edit */
import React from 'react';

export type IconNames = ${icons
    .map((icon, i) => `'${icon.slice(0, -4)}'`)
    .join(' | ')};

interface Props {
    name: IconNames;
    size?: number | string;
    width?: number | string;
    height?: number | string;
    fill?: string;
}

type IconComponent = React.ComponentType<Omit<Props, 'name'>>;

/* The ~${icons.length} icon modules are reached through a single dynamic import of the
   ./Icons barrel, so they land in one lazily fetched chunk rather than in the
   entry bundle (they used to be ~14% of it) or in ~${icons.length} separate requests.
   Export names are derived from the icon name instead of kept in a lookup
   table, so nothing but this file stays on the critical path. */
let registry: Record<string, IconComponent> | null = null;
let loading: Promise<void> | null = null;
let version = 0;
const subscribers = new Set<() => void>();

export function preloadIcons(): Promise<void> {
    if (registry) return Promise.resolve();
    loading ??= import('./Icons').then((mod) => {
        registry = mod as unknown as Record<string, IconComponent>;
        version += 1;
        subscribers.forEach((notify) => notify());
    });
    return loading;
}

function subscribe(notify: () => void) {
    subscribers.add(notify);
    return () => {
        subscribers.delete(notify);
    };
}

const getVersion = () => version;

/* Mirrors the file/export naming this script applies to app/svg/icons/*.svg. */
const exportName = (name: string) => {
    const id = name.replaceAll('-', '_').replaceAll('/', '_');
    return id[0].toUpperCase() + id.slice(1).toLowerCase();
};

/* Auto-generated, do not edit */
const SVG = (props: Props) => {
    const { name, size = 14, width = size, height = size, fill = '' } = props;
    React.useSyncExternalStore(subscribe, getVersion, getVersion);

    if (!registry) {
        void preloadIcons();
        // Reserves the icon's box so nothing reflows once the chunk lands.
        return <svg width={ \`\${ width }px\` } height={ \`\${ height }px\` } aria-hidden />;
    }

    const Icon = registry[exportName(name)];
    if (!Icon) {
        console.trace('Unknown icon name ' + name);
        return null;
    }
    return <Icon width={ width } height={ height } fill={ fill } />;
}
SVG.displayName = 'SVG';
export default SVG;
`
);
