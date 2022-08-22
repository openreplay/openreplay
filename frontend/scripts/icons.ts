/* eslint-disable @typescript-eslint/no-var-requires */
const { optimize } = require('svgo');
const fs = require('fs');
const { collectFilenames }  = require('./fs');

const svgRE = /\.svg$/;
const ICONS_DIRNAME = 'app/svg/icons';
const UI_DIRNAME = 'app/components/ui';
const icons = collectFilenames(ICONS_DIRNAME, n => svgRE.test(n));
const basePlugins = {
    plugins: [
        // { name: 'preset-default' },
        {
            name: 'removeAttrs',
            params: {
                attrs: ['fill-rule', 'clip-rule', 'fill', 'class'],
            },
        },
        'removeTitle',
        'removeComments',
        'removeXMLProcInst',
        'removeXMLNS',
        'mergeStyles',
        'inlineStyles',
        'removeStyleElement',
    ]
}
const plugins = (removeFill = true) => { 
    return {
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
                    attrs: ['xml', 'class' ,'style', 'data-name', 'dataName', 'svg:width', 'svg:height', 'fill-rule', removeFill ? 'svg:fill' : ''],
                }
            },
            {
                name: 'addAttributesToSVGElement',
                params: {
                    attributes: [ "width={ `${ width }px` }", "height={ `${ height }px` }", !removeFill ? "fill={ `${ fill }` }" : '' ],
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
 }
// fs.promises.mkdir('/tmp/a/apple', { recursive: true })
//     .then(() => {
        fs.writeFileSync(`${UI_DIRNAME}/SVG.tsx`, `
import React from 'react';

export type IconNames = ${icons.map(icon => "'"+ icon.slice(0, -4) + "'").join(' | ')};

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
${icons.map(icon => {
    const svg = fs.readFileSync(`${ICONS_DIRNAME}/${icon}`, 'utf-8');
    const canOptimize = !icon.includes('integrations');
    const { data } = optimize(svg, plugins(canOptimize));
    return `    case '${icon.slice(0, -4)}': return ${data.replace(/xlink\:href/g, 'xlinkHref')
    .replace(/xmlns\:xlink/g, 'xmlnsXlink')
    .replace(/clip-path/g, 'clipPath')
    .replace(/clip-rule/g, 'clipRule')
    .replace(/xml:space="preserve"/g, '')};`
}).join('\n')}
default:
        return <svg width={ width } height={ height } />;
            // if (window.ENV.PRODUCTION) return null;
            // throw "unknown icon name " + name;
    }
}
SVG.displayName = 'SVG';
export default SVG;
`)
    // })
    // .catch(console.error);
