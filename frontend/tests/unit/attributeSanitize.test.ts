import { describe, it, expect } from '@jest/globals';
import { sanitizeAttribute } from '../../../player/src/web/managers/DOM/sanitize';

describe('referrerpolicy sanitization', () => {
  it('drops policies that send other origins more than the document does', () => {
    [
      'unsafe-url',
      'UNSAFE-URL',
      'no-referrer-when-downgrade',
      'origin',
      'strict-origin-when-cross-origin',
      '',
    ].forEach((policy) => {
      expect(sanitizeAttribute('IMG', 'referrerpolicy', policy)).toBeNull();
      expect(sanitizeAttribute('a', 'ReferrerPolicy', policy)).toBeNull();
    });
  });

  it('keeps policies that send other origins nothing', () => {
    ['no-referrer', 'same-origin'].forEach((policy) => {
      expect(sanitizeAttribute('IMG', 'referrerpolicy', policy)).toEqual({
        value: policy,
      });
    });
  });
});
