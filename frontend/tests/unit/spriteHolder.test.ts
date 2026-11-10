/**
 * Recorded sprite markup is untrusted and is turned into `<symbol>`s through the HTML
 * parser. It used to be parsed into nodes created by the app's `document`, where markup
 * can load resources and run handlers even while detached, outside of the replay frame's
 * sandbox and of sanitize.ts.
 */
import { describe, it, expect, afterEach, jest } from '@jest/globals';
import {
  SPRITE_MARKER,
  createSpriteHolder,
  handleSprites,
} from '../../../player/src/web/managers/DOM/spriteMap';
import { MType } from '../../../player/src/web/messages/raw.gen';

const SVG = 'http://www.w3.org/2000/svg';

const spriteMessage = (id: number, markup: string) => ({
  tp: MType.SetNodeAttribute,
  id,
  name: 'href',
  value: `icons.svg${SPRITE_MARKER}${markup}`,
  time: 1,
});

const ICON = `<svg xmlns="${SVG}" viewBox="0 0 16 16"><path d="M0 0"/></svg>`;

afterEach(() => {
  jest.restoreAllMocks();
});

describe('sprite holder', () => {
  it('lives in a document that is not the app page and has no browsing context', () => {
    const holder = createSpriteHolder();

    expect(holder.ownerDocument).not.toBe(document);
    expect(holder.ownerDocument.defaultView).toBeNull();
    expect(holder.isConnected).toBe(false);
  });

  it('builds the symbol without creating any node in the app document', () => {
    const appCreate = jest.spyOn(document, 'createElementNS');
    const holder = createSpriteHolder();
    const msg = spriteMessage(7, ICON);

    handleSprites({}, new DOMParser(), msg, holder);

    expect(appCreate).not.toHaveBeenCalled();
    expect(msg.value).toBe('#symbol-7');
    const symbol = holder.querySelector('symbol')!;
    expect(symbol.ownerDocument).toBe(holder.ownerDocument);
    expect(symbol.getAttribute('id')).toBe('symbol-7');
    expect(symbol.getAttribute('viewBox')).toBe('0 0 16 16');
    expect(symbol.querySelector('path')!.getAttribute('d')).toBe('M0 0');
  });

  it('reuses the symbol when the same markup is recorded again', () => {
    const holder = createSpriteHolder();
    const known = {};
    const parser = new DOMParser();
    const first = spriteMessage(7, ICON);
    const second = spriteMessage(9, ICON);

    handleSprites(known, parser, first, holder);
    handleSprites(known, parser, second, holder);

    expect(second.value).toBe('#symbol-7');
    expect(holder.querySelectorAll('symbol')).toHaveLength(1);
  });

  it('applies the message stream rules to the recorded markup', () => {
    const holder = createSpriteHolder();
    const markup =
      `<svg xmlns="${SVG}" viewBox="0 0 16 16">` +
      '<script>void 0</script>' +
      '<path d="M0 0" onclick="void 0" fill="red"/>' +
      '<a href="javascript:void 0"><circle r="1"/></a>' +
      '</svg>';

    handleSprites({}, new DOMParser(), spriteMessage(7, markup), holder);

    const symbol = holder.querySelector('symbol')!;
    expect(symbol.querySelector('script')).toBeNull();
    const path = symbol.querySelector('path')!;
    expect(path.hasAttribute('onclick')).toBe(false);
    expect(path.getAttribute('fill')).toBe('red');
    expect(symbol.querySelector('a')!.hasAttribute('href')).toBe(false);
    expect(symbol.querySelector('circle')).not.toBeNull();
  });

  // The markup is read as XML, then written back and read again as HTML. The two parsers
  // disagree on where a comment or a processing instruction ends, so the rules have to
  // hold on the tree the HTML parser built: that is the one sent to the replay frame.
  it.each([
    ['a comment', '<!--><path d="M0 0" onclick="void 0"/>-->'],
    ['a processing instruction', '<?x ><path d="M0 0" onclick="void 0"/>?>'],
  ])('applies the rules to markup hidden from XML in %s', (_, hidden) => {
    const holder = createSpriteHolder();
    const markup = `<svg xmlns="${SVG}" viewBox="0 0 16 16">${hidden}</svg>`;

    handleSprites({}, new DOMParser(), spriteMessage(7, markup), holder);

    expect(holder.querySelector('symbol')).not.toBeNull();
    expect(holder.querySelector('[onclick]')).toBeNull();
  });
});
