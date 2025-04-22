export function inlineRemoteCss(
  node: HTMLLinkElement,
  id: number,
  baseHref: string,
  getNextID: () => number,
  insertRule: (id: number, cssText: string, index: number, baseHref: string) => any[],
  addOwner: (sheetId: number, ownerId: number) => any[],
) {
  const sheet = node.sheet;
  const sheetId = getNextID()
  addOwner(sheetId, id);

  const processRules = (rules: CSSRuleList) => {
    if (rules.length) {
      setTimeout(() => {
        for (let i = 0; i < rules.length; i++) {
          const rule = rules[i];
          insertRule(sheetId, rule.cssText, i, baseHref);
        }
      }, 0)
    }
  };

  const processCssText = (cssText: string) => {
    cssText = cssText.replace(/\/\*[\s\S]*?\*\//g, '');

    const ruleTexts: string[] = [];
    let depth = 0;
    let currentRule = '';

    for (let i = 0; i < cssText.length; i++) {
      const char = cssText[i];

      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          currentRule += char;
          ruleTexts.push(currentRule.trim());
          currentRule = '';
          continue;
        }
      }

      currentRule += char;
    }

    for (let i = 0; i < ruleTexts.length; i++) {
      const ruleText = ruleTexts[i];
      insertRule(sheetId, ruleText, i, baseHref);
    }
  };

  if (sheet) {
    try {
      const rules = sheet.cssRules;
      processRules(rules);
    } catch (e) {
      const href = node.href;
      if (href) {
        fetch(href)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch CSS: ${response.status}`);
            }
            return response.text();
          })
          .then(cssText => {
            processCssText(cssText);
          })
          .catch(error => {
            console.error(`Failed to fetch or process CSS from ${href}:`, error);
          });
      }
    }
  } else if (node.href) {
    fetch(node.href)
      .then(response => response.text())
      .then(cssText => {
        processCssText(cssText);
      })
      .catch(error => {
        console.error(`Failed to fetch CSS from ${node.href}:`, error);
      });
  }
}