let fakeIdHolder = 1000000 * 99;

export function inlineRemoteCss(
  node: HTMLLinkElement,
  id: number,
  baseHref: string,
  getNextID: () => number,
  insertRule: (id: number, cssText: string, index: number, baseHref: string) => any[],
  addOwner: (sheetId: number, ownerId: number) => any[],
  forceFetch?: boolean,
  sendPlain?: boolean,
  onPlain?: (cssText: string, id: number) => void,
) {
  const sheetId = sendPlain ? null : getNextID();
  if (!sendPlain) {
    addOwner(sheetId!, id);
  }

  const sheet = node.sheet;

  if (sheet && !forceFetch) {
    try {
      const cssText = stringifyStylesheet(sheet);

      if (cssText) {
        processCssText(cssText);
        return;
      }
    } catch (e) {
      // console.warn("Could not stringify sheet, falling back to fetch:", e);
    }
  }

  // Fall back to fetching if we couldn't get or stringify the sheet
  if (node.href) {
    fetch(node.href)
      .then(response => {
        if (!response.ok) {
          throw new Error(`response status ${response.status}`);
        }
        return response.text();
      })
      .then(cssText => {
        if (sendPlain && onPlain) {
          onPlain(cssText, fakeIdHolder++);
        } else {
          processCssText(cssText);
        }
      })
      .catch(error => {
        console.error(`OpenReplay: Failed to fetch CSS from ${node.href}:`, error);
      });
  }

  function processCssText(cssText: string) {
    // Remove comments
    cssText = cssText.replace(/\/\*[\s\S]*?\*\//g, '');

    // Parse and process the CSS text to extract rules
    const ruleTexts = parseCSS(cssText);

    for (let i = 0; i < ruleTexts.length; i++) {
      insertRule(sheetId!, ruleTexts[i], i, baseHref);
    }
  }


  function parseCSS(cssText: string): string[] {
    const rules: string[] = [];
    let inComment = false;
    let inString = false;
    let stringChar = '';
    let braceLevel = 0;
    let currentRule = '';

    for (let i = 0; i < cssText.length; i++) {
      const char = cssText[i];
      const nextChar = cssText[i + 1] || '';

      // comments
      if (!inString && char === '/' && nextChar === '*') {
        inComment = true;
        i++; // Skip the next character
        continue;
      }

      if (inComment) {
        if (char === '*' && nextChar === '/') {
          inComment = false;
          i++; // Skip the next character
        }
        continue;
      }


      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        currentRule += char;
        continue;
      }

      if (inString) {
        currentRule += char;
        if (char === stringChar && cssText[i - 1] !== '\\') {
          inString = false;
        }
        continue;
      }


      currentRule += char;

      if (char === '{') {
        braceLevel++;
      } else if (char === '}') {
        braceLevel--;

        if (braceLevel === 0) {
          // End of a top-level rule
          rules.push(currentRule.trim());
          currentRule = '';
        }
      }
    }

    // Handle any remaining text (should be rare)
    if (currentRule.trim()) {
      rules.push(currentRule.trim());
    }

    return rules;
  }


  function stringifyStylesheet(s: CSSStyleSheet): string | null {
    try {
      const rules = s.rules || s.cssRules;
      if (!rules) {
        return null;
      }

      let sheetHref = s.href;
      if (!sheetHref && s.ownerNode && (s.ownerNode as HTMLElement).ownerDocument) {
        // an inline <style> element
        sheetHref = (s.ownerNode as HTMLElement).ownerDocument.location.href;
      }

      const stringifiedRules = Array.from(rules, (rule: CSSRule) =>
        stringifyRule(rule, sheetHref)
      ).join('');

      return fixBrowserCompatibilityIssuesInCSS(stringifiedRules);
    } catch (error) {
      return null;
    }
  }
  function stringifyRule(rule: CSSRule, sheetHref: string | null): string {
    if (isCSSImportRule(rule)) {
      let importStringified;
      try {
        importStringified =
          // for same-origin stylesheets,
          // we can access the imported stylesheet rules directly
          stringifyStylesheet((rule as any).styleSheet) ||
          // work around browser issues with the raw string `@import url(...)` statement
          escapeImportStatement(rule as any);
      } catch (error) {
        importStringified = rule.cssText;
      }
      if ((rule as any).styleSheet.href) {
        // url()s within the imported stylesheet are relative to _that_ sheet's href
        return absolutifyURLs(importStringified, (rule as any).styleSheet.href);
      }
      return importStringified;
    } else {
      let ruleStringified = rule.cssText;
      if (isCSSStyleRule(rule) && (rule as any).selectorText.includes(':')) {
        // Safari does not escape selectors with : properly
        ruleStringified = fixSafariColons(ruleStringified);
      }
      if (sheetHref) {
        return absolutifyURLs(ruleStringified, sheetHref);
      }
      return ruleStringified;
    }
  }
  function fixBrowserCompatibilityIssuesInCSS(cssText: string): string {
    // Fix for Chrome's handling of webkit-background-clip
    if (
      cssText.includes(' background-clip: text;') &&
      !cssText.includes(' -webkit-background-clip: text;')
    ) {
      cssText = cssText.replace(
        /\sbackground-clip:\s*text;/g,
        ' -webkit-background-clip: text; background-clip: text;',
      );
    }
    return cssText;
  }

  function escapeImportStatement(rule: any): string {
    const { cssText } = rule;
    if (cssText.split('"').length < 3) return cssText;

    const statement = ['@import', `url(${JSON.stringify(rule.href)})`];
    if (rule.layerName === '') {
      statement.push(`layer`);
    } else if (rule.layerName) {
      statement.push(`layer(${rule.layerName})`);
    }
    if (rule.supportsText) {
      statement.push(`supports(${rule.supportsText})`);
    }
    if (rule.media.length) {
      statement.push(rule.media.mediaText);
    }
    return statement.join(' ') + ';';
  }

  function fixSafariColons(cssStringified: string): string {
    const regex = /(\[(?:[\w-]+)[^\\])(:(?:[\w-]+)\])/gm;
    return cssStringified.replace(regex, '$1\\$2');
  }

  function isCSSImportRule(rule: CSSRule): boolean {
    return 'styleSheet' in rule;
  }

  function isCSSStyleRule(rule: CSSRule): boolean {
    return 'selectorText' in rule;
  }

  function absolutifyURLs(cssText: string | null, href: string): string {
    if (!cssText) return '';

    const URL_IN_CSS_REF = /url\((?:(')([^']*)'|(")(.*?)"|([^)]*))\)/gm;
    const URL_PROTOCOL_MATCH = /^(?:[a-z+]+:)?\/\//i;
    const URL_WWW_MATCH = /^www\..*/i;
    const DATA_URI = /^(data:)([^,]*),(.*)/i;

    return cssText.replace(
      URL_IN_CSS_REF,
      (
        origin: string,
        quote1: string,
        path1: string,
        quote2: string,
        path2: string,
        path3: string,
      ) => {
        const filePath = path1 || path2 || path3;
        const maybeQuote = quote1 || quote2 || '';
        if (!filePath) {
          return origin;
        }
        if (URL_PROTOCOL_MATCH.test(filePath) || URL_WWW_MATCH.test(filePath)) {
          return `url(${maybeQuote}${filePath}${maybeQuote})`;
        }
        if (DATA_URI.test(filePath)) {
          return `url(${maybeQuote}${filePath}${maybeQuote})`;
        }
        if (filePath[0] === '/') {
          return `url(${maybeQuote}${
            extractOrigin(href) + filePath
          }${maybeQuote})`;
        }
        const stack = href.split('/');
        const parts = filePath.split('/');
        stack.pop();
        for (const part of parts) {
          if (part === '.') {
            continue;
          } else if (part === '..') {
            stack.pop();
          } else {
            stack.push(part);
          }
        }
        return `url(${maybeQuote}${stack.join('/')}${maybeQuote})`;
      },
    );
  }

  function extractOrigin(url: string): string {
    let origin = '';
    if (url.indexOf('//') > -1) {
      origin = url.split('/').slice(0, 3).join('/');
    } else {
      origin = url.split('/')[0];
    }
    origin = origin.split('?')[0];
    return origin;
  }
}
