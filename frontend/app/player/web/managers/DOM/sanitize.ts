/**
 * Security sanitization for replay DOM construction.
 *
 * The player rebuilds a live DOM from a stream of session messages. That stream
 * is untrusted input: a crafted recording (or a tampered websocket/asset
 * payload) could try to make the player construct a node or set an attribute
 * that executes script. Because the player renders into a same-origin iframe
 * (see Screen.ts), any such execution would run in the OpenReplay app origin —
 * i.e. a stored XSS against whoever opens the replay.
 *
 * The legitimate tracker never captures these (see tracker observer.ts:
 * `isIgnored` skips SCRIPT/NOSCRIPT/META/TITLE/BASE, and `sendNodeAttribute`
 * drops `on*` / `src` / `srcset` for HTML elements), so rejecting them here is a
 * zero-regression trust boundary that also covers crafted streams which bypass
 * the tracker entirely.
 */

/**
 * Tags that can execute script or hijack resource/URL resolution. They are
 * never useful for replay and must never be created. This mirrors the tracker's
 * own `isIgnored` blocklist, so legit recordings are unaffected.
 */
const FORBIDDEN_TAGS = new Set([
  'SCRIPT', // executes JS when inserted (createElement + insert runs it)
  'NOSCRIPT',
  'BASE', // <base href> rewrites relative URL resolution for the whole replay
  'META', // <meta http-equiv="refresh"> can navigate/redirect the frame
  'TITLE',
]);

export function isForbiddenTag(tag: string): boolean {
  // SVG elements keep their original case (e.g. <script>, <style>); HTML tags
  // arrive upper-cased. Normalize so `script` and `SCRIPT` are both caught.
  return FORBIDDEN_TAGS.has(tag.toUpperCase());
}

/** Attributes whose value is interpreted as a URL and so can carry a scheme. */
const URL_ATTRS = new Set([
  'href',
  'xlink:href', // tracker strips the `xlink:` prefix, but be safe
  'src',
  'srcset',
  'action',
  'formaction',
  'background',
  'poster',
  'data',
  'cite',
  'longdesc',
  'ping',
]);

/**
 * Schemes that execute script. `data:` is intentionally NOT here: it is heavily
 * used for legitimate inlined images / masked content / sprites. `data:` only
 * becomes dangerous in a navigable context (iframe/object/embed), which we
 * handle separately by stripping iframe src/srcdoc.
 */
const SCRIPT_SCHEMES = new Set(['javascript', 'vbscript']);

/** Whitespace and control characters a browser ignores inside a URL scheme. */
const URL_SCHEME_NOISE = /[\u0000-\u0020]+/g;

/**
 * Extract a URL's scheme the way a browser would: control characters and
 * whitespace inside the scheme are ignored by the URL parser, so `java\tscript:`
 * resolves to `javascript:`. We strip them before comparing. (Values reach us
 * via setAttribute, never the HTML parser, so HTML entities are NOT decoded and
 * cannot be used to obfuscate the scheme.)
 */
function getScheme(url: string): string {
  const colon = url.indexOf(':');
  if (colon === -1) return '';
  return url.slice(0, colon).replace(URL_SCHEME_NOISE, '').toLowerCase();
}

export interface SanitizedAttribute {
  value: string;
}

/**
 * Validate a message-driven attribute write. Returns the (possibly unchanged)
 * value to apply, or `null` if the attribute must be dropped entirely.
 *
 * @param tagName - owner element tag (HTML tags are upper-case)
 * @param name    - attribute name
 * @param value   - attribute value
 */
export function sanitizeAttribute(
  tagName: string,
  name: string,
  value: string,
): SanitizedAttribute | null {
  const lname = name.toLowerCase();

  // 1) Event handler content attributes (onload, onerror, onclick, ...) compile
  //    into listeners as soon as they're set and run in the app origin. They are
  //    never needed for replay. Mirrors the tracker's `name.substring(0,2)==='on'`.
  if (lname.startsWith('on')) {
    return null;
  }

  // 2) A reconstructed iframe gets its content rebuilt from messages
  //    (CreateIFrameDocument). It must never load a remote page or an inline
  //    document, both of which can run script. Strip its navigation sources.
  if (
    tagName.toUpperCase() === 'IFRAME' &&
    (lname === 'src' || lname === 'srcdoc')
  ) {
    return null;
  }

  // 3) Script-executing URL schemes in any URL-bearing attribute.
  if (URL_ATTRS.has(lname) && SCRIPT_SCHEMES.has(getScheme(value))) {
    return null;
  }

  return { value };
}

/**
 * Sandbox applied to every reconstructed iframe.
 *
 * `allow-same-origin` is required so the player (running in the parent document)
 * can reach `contentDocument` to rebuild the iframe's content. We deliberately
 * omit `allow-scripts`, `allow-top-navigation`, `allow-popups`, etc., so even if
 * a crafted stream slips content into the frame it cannot execute JS or break
 * out. Note: allow-same-origin WITHOUT allow-scripts is safe — the
 * "sandbox can remove itself" caveat only applies when both are present.
 */
export const REPLAY_IFRAME_SANDBOX = 'allow-same-origin';

/**
 * Defense-in-depth scrub for CSS text (style tags, adopted stylesheets, inline
 * style). Modern browsers do not execute JS from CSS, but legacy/vendor
 * constructs (`expression()`, Firefox `-moz-binding: url(...)`) historically did.
 * We neutralize them rather than reject the whole rule, so a single bad token
 * cannot break sheet indexing.
 */
const CSS_SCRIPT_CONSTRUCTS =
  /(expression\s*\(|-moz-binding\s*:|(?:javascript|vbscript)\s*:)/gi;

export function sanitizeCssText(cssText: string): string {
  CSS_SCRIPT_CONSTRUCTS.lastIndex = 0;
  if (!CSS_SCRIPT_CONSTRUCTS.test(cssText)) {
    return cssText;
  }
  CSS_SCRIPT_CONSTRUCTS.lastIndex = 0;
  return cssText.replace(CSS_SCRIPT_CONSTRUCTS, '/* blocked */');
}
