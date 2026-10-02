// Absolute already, or not resolvable against a base; also skips parsing multi-MB data: URIs
const NON_RELATIVE_SCHEME = /^(?:data|blob|javascript|mailto|tel|about):/i;

/** Never throws: a value the URL parser rejects (e.g. href="http://") is returned as is. */
export function resolveURL(baseURL: string, relURL: string): string {
  if (relURL === '' || relURL.startsWith('#') || NON_RELATIVE_SCHEME.test(relURL)) {
    return relURL;
  }
  try {
    return new URL(relURL, baseURL).toString();
  } catch {
    return relURL;
  }
}

function rewriteCSSLinks(
  css: string,
  rewriter: (rawurl: string) => string,
): string {
  // Replace url() functions
  css = css.replace(/url\(\s*(['"]?)([\s\S]*?)\1\s*\)/g, (match, quote, url) => {
    const newurl = rewriter(url.trim());
    return `url(${quote}${newurl}${quote})`;
  });

  // Replace @import statements
  css = css.replace(
    /@import\s+(url\(\s*(['"]?)([\s\S]*?)\2\s*\)|(['"])([\s\S]*?)\4)([^;]*);?/g,
    (match, _, quote1, url1, quote2, url2, media) => {
      const url = url1 || url2;
      const newurl = rewriter(url.trim());
      const quote = quote1 || quote2 || '';
      return `@import ${
        quote ? `url(${quote}${newurl}${quote})` : `"${newurl}"`
      }${media};`;
    },
  );

  // Ensure the CSS ends with a semicolon
  const dontNeedSemi = css.trim().endsWith(';') || css.trim().endsWith('}');
  return dontNeedSemi ? css : `${css};`;
}

/**
 * Media/import preludes are copied untouched so `(hover:hover)` stays a valid media feature,
 * and an escaped colon is part of a class name (`.dark\:hover\:bg-x`), not a pseudo-class.
 */
const PSEUDO_CLASS = /(@(?:media|custom-media|import)[^{;]*)|(\\?):(hover|focus)/g;

export function rewritePseudoclasses(css: string): string {
  return css.replace(PSEUDO_CLASS, (match, prelude, escape, pseudo) => {
    if (prelude !== undefined || escape) return match;
    return `.-openreplay-${pseudo}`;
  });
}

export function resolveCSS(baseURL: string, css: string): string {
  return rewritePseudoclasses(
    rewriteCSSLinks(css, (rawurl) => resolveURL(baseURL, rawurl)),
  );
}
