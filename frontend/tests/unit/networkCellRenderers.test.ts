import { beforeAll, describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import ts from 'typescript';

// Load the actual callbacks without initializing the player/store dependency graph.
// TimeTable calls render(row) as an ordinary function, not as a React component.
const filename = resolve(
  __dirname,
  '../../app/components/shared/DevTools/NetworkPanel/NetworkPanelComp.tsx',
);
const source = ts.createSourceFile(
  filename,
  readFileSync(filename, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const callbacks = source.statements
  .filter(
    (node) =>
      ts.isFunctionDeclaration(node) &&
      ['renderStatus', 'renderDuration'].includes(node.name?.text ?? ''),
  )
  .map((node) => node.getText(source).replace(/^export /, ''));
if (callbacks.length !== 2) throw new Error('Network cell callbacks not found');
const code = ts.transpileModule(callbacks.join('\n'), {
  compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
}).outputText;
const i18n = i18next.createInstance();
const { renderStatus, renderDuration } = new Function(
  'React',
  'i18n',
  'useTranslation',
  'Tooltip',
  'Icon',
  `${code}\nreturn { renderStatus, renderDuration };`,
)(React, i18n, useTranslation, 'span', 'i');

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    initImmediate: false,
    resources: {
      en: {
        translation: {
          'Served from cache': 'Cached response',
          'Slower than average': 'Slow request',
          'Much slower than average': 'Very slow request',
        },
      },
    },
  });
});

describe('Network cell renderers', () => {
  it('renders status without requiring a React hook context', () => {
    expect(renderStatus({ status: '200', cached: true }).props.title).toBe(
      'Cached response',
    );
    expect(renderStatus({ status: '500', error: 'Timeout' }).props.title).toBe(
      'Timeout',
    );
  });

  it('renders duration without requiring a React hook context', () => {
    expect(renderDuration({ success: false })).toBe('x');
    expect(renderDuration({ success: true, duration: 118 })).toBe('118ms');
    expect(
      renderDuration({ success: true, duration: 118, isYellow: true }).props
        .title,
    ).toBe('Slow request');
    expect(
      renderDuration({ success: true, duration: 118, isRed: true }).props.title,
    ).toBe('Very slow request');
  });
});
