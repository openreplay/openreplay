import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { darkTokens, lightTokens } from '../../app/ui/styles/token-values';

// token-values.ts mirrors tokens.css for code that needs resolved strings
// (canvas charts, the saas billing page); this keeps the two from drifting.
const css = readFileSync(
  join(__dirname, '../../app/ui/styles/tokens.css'),
  'utf8',
);

const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf('\n}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--m-([\w-]+):\s*([^;]+);/g))
    out[m[1]] = m[2].trim();
  return out;
};

const resolve = (tokens: Record<string, string>) => {
  const get = (k: string, depth = 0): string => {
    const v = tokens[k];
    const ref = v?.match(/^var\(--m-([\w-]+)\)$/);
    return ref && depth < 8 ? get(ref[1], depth + 1) : v;
  };
  return Object.fromEntries(Object.keys(tokens).map((k) => [k, get(k)]));
};

const light = resolve(block(':root'));
const dark = resolve({ ...block(':root'), ...block(':root.dark') });

describe('token-values', () => {
  test.each([
    ['light', light, lightTokens],
    ['dark', dark, darkTokens],
  ])('%s matches tokens.css', (_, fromCss, mirrored) => {
    const unresolved = (v: string) => v.includes('var(');
    const expected = Object.fromEntries(
      Object.entries(fromCss).filter(([, v]) => !unresolved(v)),
    );
    expect(mirrored).toEqual(expected);
  });
});
