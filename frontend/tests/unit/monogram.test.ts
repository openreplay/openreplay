import { describe, expect, it } from '@jest/globals';

import { monogramOf } from '../../app/layout/nav/monogram';

describe('monogramOf', () => {
  it.each([
    ['frontend.acme.com', 'FR'],
    ['marketing.acme.com', 'MA'],
    ['https://www.acme.com', 'AC'],
    ['Mobile App', 'MA'],
    ['my-app', 'MA'],
    ['Acme', 'AC'],
    ['Acme, Inc.', 'AC'],
    ['Globex LLC', 'GL'],
    ['x', 'X'],
    ['', '?'],
  ])('%s → %s', (name, expected) => {
    expect(monogramOf(name)).toBe(expected);
  });
});
