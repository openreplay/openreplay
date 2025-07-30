import { describe, it, expect } from '@jest/globals';
import { isRootNode } from '../../app/player/guards';

describe('isRootNode', () => {
  it('returns true for document', () => {
    expect(isRootNode(document)).toBe(true);
  });

  it('returns false for element', () => {
    const div = document.createElement('div');
    expect(isRootNode(div)).toBe(false);
  });
});
