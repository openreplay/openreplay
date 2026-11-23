import { describe, expect, test } from '@jest/globals';

import { copyPage } from 'App/components/Session/Player/ClickMapRenderer/pageCopy';

function frameDoc() {
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  return frame.contentDocument!;
}

function replayed() {
  const doc = frameDoc();
  doc.body.innerHTML = `
    <style id="css-in-js"></style>
    <div id="host"></div>
    <video autoplay src="https://example.com/v.mp4"></video>
    <iframe src="https://example.com/embed"></iframe>
    <meta http-equiv="refresh" content="0;url=https://example.com">
    <p>Hello</p>`;
  (doc.getElementById('css-in-js') as HTMLStyleElement).sheet!.insertRule(
    '.card { color: red; }',
  );
  const shadow = doc.getElementById('host')!.attachShadow({ mode: 'open' });
  shadow.innerHTML =
    '<style>span { font-weight: 700; }</style><span>inside</span>';
  return doc;
}

describe('heatmap minimap page copy', () => {
  test('carries rules inserted through CSSOM and shadow roots', () => {
    const target = frameDoc();
    copyPage(replayed(), target);

    expect(target.querySelector('p')?.textContent).toBe('Hello');
    expect(target.getElementById('css-in-js')?.textContent).toContain(
      'color: red',
    );
    const shadow = target.getElementById('host')?.shadowRoot;
    expect(shadow?.querySelector('span')?.textContent).toBe('inside');
    expect(shadow?.querySelector('style')?.textContent).toContain(
      'font-weight',
    );
  });

  test('loads and plays nothing of its own', () => {
    const target = frameDoc();
    copyPage(replayed(), target);

    const video = target.querySelector('video')!;
    expect(video.hasAttribute('autoplay')).toBe(false);
    expect(video.getAttribute('preload')).toBe('none');
    expect(target.querySelector('iframe')?.hasAttribute('src')).toBe(false);
    expect(target.querySelector('meta')?.hasAttribute('http-equiv')).toBe(
      false,
    );
  });
});
