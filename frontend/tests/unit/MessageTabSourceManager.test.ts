import { describe, it, expect } from '@jest/globals';
import MessageTabSourceManager from '../../../player/src/web/managers/MessageTabSourceManager';

const msg = (tabId: string, time: number) => ({ tabId, time });

describe('MessageTabSourceManager', () => {
  it('maps times to the tab that produced them, the new tab winning at a switch', () => {
    const m = new MessageTabSourceManager();
    m.processMessages([msg('a', 0), msg('a', 5), msg('b', 10), msg('b', 12), msg('a', 20)]);
    expect(m.findTab(0)).toBe('a');
    expect(m.findTab(9)).toBe('a');
    expect(m.findTab(10)).toBe('b');
    expect(m.findTab(15)).toBe('b');
    expect(m.findTab(20)).toBe('a');
  });

  it('only the last segment includes its end; nothing is found outside the recording', () => {
    const m = new MessageTabSourceManager();
    m.processMessages([msg('a', 0), msg('b', 10), msg('b', 12)]);
    expect(m.findTab(13)).toBe('b');
    expect(m.findTab(14)).toBeNull();
    expect(m.findTab(-1)).toBeNull();
  });

  it('continues the current segment across files', () => {
    const m = new MessageTabSourceManager();
    m.processMessages([msg('a', 0), msg('a', 5)]);
    m.processMessages([msg('a', 6), msg('b', 8)]);
    expect(m.segments).toHaveLength(2);
    expect(m.findTab(7)).toBe('a');
    expect(m.findTab(8)).toBe('b');
  });

  it('ignores messages without a tab', () => {
    const m = new MessageTabSourceManager();
    m.processMessages([msg('a', 0), msg('', 3), msg('a', 5)]);
    expect(m.segments).toHaveLength(1);
    expect(m.findTab(3)).toBe('a');
  });
});
