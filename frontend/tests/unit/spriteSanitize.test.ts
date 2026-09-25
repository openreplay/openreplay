/**
 * Sprite markup comes from the recorded page (the tracker inlines `<use>` targets), so
 * it is untrusted: it must never reach an innerHTML sink and must lose anything that
 * can run script before it is imported into any document.
 */
import { describe, it, expect } from '@jest/globals';
import {
  parseSanitizedSvg,
  parseSanitizedSvgContent,
} from '../../../player/src/web/managers/DOM/sanitize';
import { VSpriteMap } from '../../../player/src/web/managers/DOM/VirtualDOM';

const XHTML_IMG =
  '<foreignObject><img xmlns="http://www.w3.org/1999/xhtml" src="x" onerror="window.__pwned=1"/></foreignObject>';
const PAYLOAD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" onload="window.__pwned=1">
  <path d="M0 0" onclick="window.__pwned=1"/>
  <image href="x" onerror="window.__pwned=1"/>
  ${XHTML_IMG}
  <script>window.__pwned=1</script>
  <a href="javascript:window.__pwned=1"><circle r="1"/></a>
  <set attributeName="onmouseover" to="window.__pwned=1"/>
  <animate attributeName="href" values="javascript:window.__pwned=1"/>
  <?x ><foreignObject><img src=x onerror=window.__pwned=1></foreignObject>?>
  <!-- comment -->
</svg>`;

function assertClean(root: Element) {
  const all = [root, ...Array.from(root.querySelectorAll('*'))];
  all.forEach((el) => {
    expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(['script', 'foreignObject', 'set']).not.toContain(el.localName);
    Array.from(el.attributes).forEach((a) => {
      expect(a.name.toLowerCase().startsWith('on')).toBe(false);
      expect(a.value.toLowerCase()).not.toContain('javascript:');
    });
  });
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ALL);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    expect([Node.ELEMENT_NODE, Node.TEXT_NODE]).toContain(n.nodeType);
  }
}

describe('sprite sanitization', () => {
  it('strips script-capable content from recorded SVG', () => {
    const svg = parseSanitizedSvg(PAYLOAD)!;
    expect(svg).not.toBeNull();
    assertClean(svg);
    expect(svg.querySelector('path')).not.toBeNull();
    expect(svg.querySelector('circle')).not.toBeNull();
  });

  it('rejects markup that is not SVG', () => {
    expect(parseSanitizedSvg('<div>x</div>')).toBeNull();
    expect(parseSanitizedSvg('plain text')).toBeNull();
  });

  it('accepts HTML-serialized sprites (entities, undeclared xlink) and still sanitizes them', () => {
    const svg = parseSanitizedSvg(
      `<svg viewBox="0 0 8 8"><text>a&nbsp;b</text><use xlink:href="#x"/><path d="M0 0" onclick="window.__pwned=1"/>${XHTML_IMG}</svg>`,
    )!;
    expect(svg).not.toBeNull();
    expect(svg.querySelector('path')).not.toBeNull();
    expect(svg.querySelector('text')!.textContent).toBe('a\u00a0b');
    assertClean(svg);
  });

  it('sprite host imports sanitized nodes instead of parsing HTML', () => {
    const host = new VSpriteMap('svg', true, 0, 0);
    host.setContent(`<symbol id="s1">${XHTML_IMG}<path d="M0 0"/></symbol>`);
    host.applyChanges();
    const node = host.node;
    expect(node.querySelector('#s1 path')).not.toBeNull();
    expect(node.querySelector('img')).toBeNull();
    expect(node.getElementsByTagNameNS('*', 'foreignObject').length).toBe(0);
    const reparsed = parseSanitizedSvgContent(node.innerHTML)!;
    assertClean(reparsed);
  });
});
