import { describe, expect, it } from '@jest/globals';
import { CompressionStream, DecompressionStream } from 'node:stream/web';

import {
  encodePageSnapshot,
  isPageSnapshot,
  readPageSnapshot,
  serializePage,
} from 'App/components/Session/Player/ClickMapRenderer/pageSnapshot';

Object.assign(globalThis, { CompressionStream, DecompressionStream });

// a frame, as the replay is: a document without a window has no style sheets
function replayDoc(html: string) {
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.documentElement.innerHTML = html;
  return doc;
}

function parse(html: string) {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('page snapshot', () => {
  it('carries the rules the player inserted through CSSOM', () => {
    const doc = replayDoc('<head><style></style></head><body></body>');
    doc.querySelector('style')!.sheet!.insertRule('body { color: red; }');
    const html = serializePage(doc);
    expect(parse(html).querySelector('style')!.textContent).toContain(
      'color: red',
    );
  });

  it('drops scripts and inline handlers', () => {
    const doc = replayDoc(
      '<body><script>alert(1)</script><a href="#" onclick="alert(2)">x</a></body>',
    );
    const out = parse(serializePage(doc));
    expect(out.querySelector('script')).toBeNull();
    expect(out.querySelector('a')!.hasAttribute('onclick')).toBe(false);
  });

  it('keeps what the inputs hold, not their initial markup', () => {
    const doc = replayDoc(
      '<body><input value="a"><input type="checkbox"><textarea></textarea>' +
        '<select><option>1</option><option>2</option></select></body>',
    );
    const [text, box] = Array.from(doc.querySelectorAll('input'));
    text.value = 'typed';
    box.checked = true;
    doc.querySelector('textarea')!.value = 'note';
    doc.querySelector('select')!.selectedIndex = 1;

    const out = parse(serializePage(doc));
    const [outText, outBox] = Array.from(out.querySelectorAll('input'));
    expect(outText.getAttribute('value')).toBe('typed');
    expect(outBox.hasAttribute('checked')).toBe(true);
    expect(out.querySelector('textarea')!.textContent).toBe('note');
    expect(out.querySelectorAll('option')[1].hasAttribute('selected')).toBe(
      true,
    );
  });

  it('writes shadow roots out as declarative ones', () => {
    const doc = replayDoc('<body><div id="host"></div></body>');
    const root = doc.getElementById('host')!.attachShadow({ mode: 'open' });
    root.innerHTML = '<b>inside</b>';
    const html = serializePage(doc);
    expect(html).toContain(
      '<div id="host"><template shadowrootmode="open"><b>inside</b></template></div>',
    );
  });

  it("inlines a frame's page instead of its address", () => {
    // the player builds a frame's page itself, the frame loads nothing
    const doc = replayDoc('<body><iframe></iframe></body>');
    doc.querySelector('iframe')!.contentDocument!.body.innerHTML =
      '<p>framed</p>';
    const frame = parse(serializePage(doc)).querySelector('iframe')!;
    expect(frame.getAttribute('srcdoc')).toContain('<p>framed</p>');
  });

  it('round-trips through the thumbnail field', async () => {
    const snapshot = {
      html: '<!doctype html><html><body>é ✓ page</body></html>',
      width: 1440,
      height: 3200,
      frameWidth: 1440,
      frameHeight: 3200,
    };
    const url = await encodePageSnapshot(snapshot);
    expect(isPageSnapshot(url)).toBe(true);
    expect(await readPageSnapshot(url)).toEqual(snapshot);
  });

  it('leaves a picture thumbnail alone', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    expect(isPageSnapshot(png)).toBe(false);
    expect(await readPageSnapshot(png)).toBeNull();
  });
});
