import type { Point } from './types';

function isIframe(el: Element): el is HTMLIFrameElement {
  return el.tagName === 'IFRAME';
}

/**
 * Where an iframe's content box (the origin of its document's viewport) sits in
 * the viewport of the document that contains the iframe.
 */
export function getFrameContentOffset(frame: Element): Point {
  const rect = frame.getBoundingClientRect();
  const style = frame.ownerDocument?.defaultView?.getComputedStyle(frame);
  const padLeft = style ? parseFloat(style.paddingLeft) || 0 : 0;
  const padTop = style ? parseFloat(style.paddingTop) || 0 : 0;
  return {
    x: rect.left + frame.clientLeft + padLeft,
    y: rect.top + frame.clientTop + padTop,
  };
}

/** Offset of `doc`'s viewport inside `rootWin`'s viewport, summed over nested iframes. */
export function getDocumentOffset(
  doc: Document,
  rootWin: Window | null,
): Point {
  let x = 0;
  let y = 0;
  let win: Window | null = doc.defaultView;
  while (win && win !== rootWin && win.frameElement) {
    const offset = getFrameContentOffset(win.frameElement);
    x += offset.x;
    y += offset.y;
    win = win.parent === win ? null : win.parent;
  }
  return { x, y };
}

function getElementsFromPoint(doc: Document, { x, y }: Point): Element[] {
  if (typeof doc.elementsFromPoint === 'function') {
    return doc.elementsFromPoint(x, y);
  }
  const el = doc.elementFromPoint(x, y);
  return el ? [el] : [];
}

/** Hit-test through same-origin iframes; `point` is in `doc`'s viewport coordinates. */
export function getElementsFromPointDeep(
  doc: Document,
  point: Point,
): Element[] {
  const hits = getElementsFromPoint(doc, point);
  const result = hits.slice();
  for (const el of hits) {
    if (!isIframe(el)) continue;
    const innerDoc = el.contentDocument;
    if (!innerDoc) continue;
    const offset = getFrameContentOffset(el);
    result.push(
      ...getElementsFromPointDeep(
        innerDoc,
        { x: point.x - offset.x, y: point.y - offset.y },
      ),
    );
  }
  return result;
}
