export function resolveURL(baseURL: string, relURL: string): string {
  if (relURL.startsWith('#') || relURL === '') {
    return relURL;
  }
  return new URL(relURL, baseURL).toString();
}

function rewriteCSSLinks(
  css: string,
  rewriter: (rawurl: string) => string,
): string {
  // Replace url() functions
  css = css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gs, (match, quote, url) => {
    const newurl = rewriter(url.trim());
    return `url(${quote}${newurl}${quote})`;
  });

  // Replace @import statements
  css = css.replace(
    /@import\s+(url\(\s*(['"]?)(.*?)\2\s*\)|(['"])(.*?)\4)([^;]*);?/gs,
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

function rewritePseudoclasses(css: string): string {
  return css
    .replace(/:hover/g, '.-openreplay-hover')
    .replace(/:focus/g, '.-openreplay-focus');
}

export function resolveCSS(baseURL: string, css: string): string {
  return rewritePseudoclasses(
    rewriteCSSLinks(css, (rawurl) => resolveURL(baseURL, rawurl)),
  );
}
