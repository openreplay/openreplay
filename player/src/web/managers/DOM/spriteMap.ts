import { isForbiddenTag, sanitizeAttribute } from './sanitize';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Prefix the tracker puts in front of the inlined target of a `<use href>`. */
export const SPRITE_MARKER = '_$OPENREPLAY_SPRITE$_';

/**
 * Holder for the `<symbol>`s rebuilt from recorded sprite markup.
 *
 * The markup is untrusted (see sanitize.ts) and has to go through the HTML
 * parser to become symbols, so the holder lives in a document of its own with no
 * browsing context: nothing parsed into it can load a resource or run a handler.
 * A node created by the app's `document` gives no such guarantee, even while it
 * is detached. Only the serialized symbols leave this holder, and they are
 * written into the sandboxed replay frame (see VSpriteMap).
 */
export function createSpriteHolder(): SVGElement {
  const inertDocument = document.implementation.createHTMLDocument('');
  const holder = inertDocument.createElementNS(SVG_NS, 'svg');
  holder.setAttribute('style', 'display: none;');
  holder.setAttribute('id', 'reconstructed-sprite');
  return holder;
}

/**
 * Applies the rules of the message stream to recorded sprite markup, which
 * reaches the replay as one string and so never passes DOMManager's per-message
 * checks. A second layer only: the inert holder and the frame sandbox are what
 * keep this markup from executing.
 *
 * Has to run on the tree the HTML parser built, not on the XML one the markup is
 * first read into: the two parsers disagree (on where a comment ends, for one),
 * so markup can be inert text in XML and elements after the HTML re-parse.
 */
function scrubSprite(root: Element): void {
  Array.from(root.querySelectorAll('*')).forEach((node) => {
    if (isForbiddenTag(node.localName)) {
      node.remove();
      return;
    }
    Array.from(node.attributes).forEach((attr) => {
      const allowed =
        sanitizeAttribute(node.localName, attr.name, attr.value) &&
        sanitizeAttribute(node.localName, attr.localName, attr.value);
      if (!allowed) {
        node.removeAttributeNode(attr);
      }
    });
  });
}

/**
 * Turns a `SetNodeAttribute` carrying inlined sprite markup into a reference to
 * a `<symbol>` in the holder, adding the symbol on first sight of that markup.
 */
export function handleSprites(
  potentialSpriteMap: Record<string, any>,
  parser: DOMParser,
  msg: Record<string, any>,
  spriteMapSvg: SVGElement,
) {
  const [_, svgData] = msg.value.split(SPRITE_MARKER);
  const potentialSprite = potentialSpriteMap[svgData];
  if (potentialSprite) {
    msg.value = potentialSprite;
  } else {
    const svgDoc = parser.parseFromString(svgData, 'image/svg+xml');
    const originalSvg = svgDoc.querySelector('svg');
    if (originalSvg) {
      // Created by the holder's document, never the app's: see createSpriteHolder.
      const symbol = spriteMapSvg.ownerDocument.createElementNS(
        SVG_NS,
        'symbol',
      );
      const symbolId = `symbol-${msg.id || `ind-${msg.time}`}`; // Generate an ID if missing
      symbol.setAttribute('id', symbolId);
      symbol.setAttribute(
        'viewBox',
        originalSvg.getAttribute('viewBox') || '0 0 24 24',
      );
      symbol.innerHTML = originalSvg.innerHTML;
      scrubSprite(symbol);

      spriteMapSvg.appendChild(symbol);
      msg.value = `#${symbolId}`;
      potentialSpriteMap[svgData] = `#${symbolId}`;
    }
  }
}
