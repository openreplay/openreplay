/* eslint-disable @typescript-eslint/no-var-requires */
const { optimize } = require('svgo');
const fs = require('fs');
const { collectFilenames }  = require('./fs');

const svgRE = /\.svg$/;
const ICONS_DIRNAME = 'app/svg/icons';
const UI_DIRNAME = 'app/components/ui';
const icons = collectFilenames(ICONS_DIRNAME, n => svgRE.test(n));
const plugins = { 
    plugins: [
        {
            name: 'preset-default',
            params: {
              overrides: {
                inlineStyles: {
                  onlyMatchedOnce: false,
                },
              },
            },
        },
        {
            name: 'removeAttrs',
            params: {
                attrs: ['xml', 'style', 'class', 'data-name', 'dataName', 'width', 'height']
            }
        },
        {
            name: 'addAttributesToSVGElement',
            params: {
                attributes: [ "width={ `${ width }px` }", "height={ `${ height }px` }", "fill={ `${ fill }` }" ]
            }
        },
        { name: 'removeXMLNS' },
        // { name: 'replaceDashes', params: { 
        //     type: 'perItem',
        //     fn: (item) => {
        //         item.eachAttr(attr => {
        //           attr.name = attr.name.replace(/-([a-z])/g, gr => gr[1].toUpperCase())
        //         })
        //     }
        //  } },

    ]
 }
// fs.promises.mkdir('/tmp/a/apple', { recursive: true })
//     .then(() => {
        fs.writeFileSync(`${UI_DIRNAME}/SVG.tsx`, `
import React from 'react';

interface Props {
    name: string;
    size?: number;
    width?: number;
    height?: number;
    fill?: string;
}

/* Auto-generated, do not edit */
const SVG = (props: Props) => {
    const { name, size = 14, width = size, height = size, fill = '' } = props;
    switch (name) {
${icons.map(icon => {
    const svg = fs.readFileSync(`${ICONS_DIRNAME}/${icon}`, 'utf-8');
    const { data } = optimize(svg, plugins);
    return `    case '${icon.slice(0, -4)}': return ${data.replace(/xlink\:href/g, 'xlinkHref')
    .replace(/xmlns\:xlink/g, 'xmlnsXlink')
    .replace(/xml:space="preserve"/g, '')};`
}).join('\n')}
default:
        return <svg width={ width } height={ height } fill={ fill } />;
            // if (window.ENV.PRODUCTION) return null;
            // throw "unknown icon name " + name;
    }
}
SVG.displayName = 'SVG';
export default SVG;
`)
    // })
    // .catch(console.error);