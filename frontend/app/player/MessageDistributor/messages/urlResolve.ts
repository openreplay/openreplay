export function resolveURL(baseURL: string, relURL: string): string {
  if (relURL.startsWith('#') || relURL === "") {
    return relURL;
  }
  return new URL(relURL, baseURL).toString();
}


const re1 = /url\(("[^"]*"|'[^']*'|[^)]*)\)/g
const re2 = /@import "(.*?)"/g
function cssUrlsIndex(css: string): Array<[number, number]> {
  const idxs: Array<[number, number]> = [];
  const i1 = css.matchAll(re1);
  // @ts-ignore
  for (let m of i1) {
    // @ts-ignore
    const s: number = m.index + m[0].indexOf(m[1]);
    const e: number = s + m[1].length;
    idxs.push([s, e]);
  }
  const i2 = css.matchAll(re2);
  // @ts-ignore
  for (let m of i2) {
    // @ts-ignore
    const s = m.index + m[0].indexOf(m[1]);
    const e = s + m[1].length;
    idxs.push([s, e])
  }
  return idxs.reverse()
}
function unquote(str: string): [string, string] {
  if (str.length <= 2) {
    return [str, ""]
  }
  if (str[0] == '"' && str[str.length-1] == '"') {
    return [ str.substring(1, str.length-1), "\""];
  }
  if (str[0] == '\'' && str[str.length-1] == '\'') {
    return [ str.substring(1, str.length-1), "'" ];
  }
  return [str, ""]
}
function rewriteCSSLinks(css: string, rewriter: (rawurl: string) => string): string {
  for (let idx of cssUrlsIndex(css)) {
    const f = idx[0]
    const t = idx[1]
    const [ rawurl, q ] = unquote(css.substring(f, t));
    css = css.substring(0,f) + q + rewriter(rawurl) + q + css.substring(t);
  }
  return css
}

export function resolveCSS(baseURL: string, css: string): string {
  return rewriteCSSLinks(css, rawurl => resolveURL(baseURL, rawurl));
}