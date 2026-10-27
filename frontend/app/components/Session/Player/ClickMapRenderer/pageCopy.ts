type Sheets = Map<CSSStyleSheet, CSSStyleSheet>;
type StyleRoot = (Document | ShadowRoot) & {
  adoptedStyleSheets?: CSSStyleSheet[];
};

function rulesText(sheet: CSSStyleSheet | null): string | null {
  try {
    const rules = sheet?.cssRules;
    if (!rules) return null;
    let text = '';
    for (let i = 0; i < rules.length; i++) text += `${rules[i].cssText}\n`;
    return text;
  } catch {
    return null;
  }
}

function adopt(
  from: StyleRoot,
  to: StyleRoot,
  target: Document,
  sheets: Sheets,
) {
  const list = from.adoptedStyleSheets;
  const Sheet = (target.defaultView as (Window & typeof globalThis) | null)
    ?.CSSStyleSheet;
  if (!list?.length || !Sheet) return;
  to.adoptedStyleSheets = list.map((sheet) => {
    let copy = sheets.get(sheet);
    if (!copy) {
      copy = new Sheet();
      try {
        copy.replaceSync(rulesText(sheet) ?? '');
      } catch {}
      sheets.set(sheet, copy);
    }
    return copy;
  });
}

function fixElement(
  el: Element,
  copy: Element,
  target: Document,
  sheets: Sheets,
) {
  const shadow = el.shadowRoot;
  if (shadow) {
    try {
      const root = copy.attachShadow({ mode: 'open' });
      shadow.childNodes.forEach((n) =>
        root.appendChild(target.importNode(n, true)),
      );
      fixTree(shadow, root, target, sheets);
      adopt(shadow, root, target, sheets);
    } catch {}
  }
  switch (el.localName) {
    case 'style': {
      // the player inserts rules through CSSOM, which the markup doesn't carry
      const text = rulesText((el as HTMLStyleElement).sheet);
      if (text !== null) copy.textContent = text;
      break;
    }
    case 'video':
    case 'audio':
      copy.removeAttribute('autoplay');
      copy.setAttribute('preload', 'none');
      break;
    case 'iframe':
      copy.removeAttribute('src');
      copy.removeAttribute('srcdoc');
      break;
    case 'meta':
      copy.removeAttribute('http-equiv');
      break;
  }
}

function fixTree(
  from: ParentNode,
  to: ParentNode,
  target: Document,
  sheets: Sheets,
) {
  const src = from.querySelectorAll('*');
  const dst = to.querySelectorAll('*');
  if (src.length !== dst.length) return;
  for (let i = 0; i < src.length; i++)
    fixElement(src[i], dst[i], target, sheets);
}

/**
 * Copies the frozen replay into an empty same-origin document, with what the
 * player applied outside the markup: CSSOM rules, adopted sheets, shadow roots.
 */
export function copyPage(source: Document, target: Document) {
  const root = target.importNode(source.documentElement, true);
  const sheets: Sheets = new Map();
  fixTree(source.documentElement, root, target, sheets);
  if (target.documentElement) target.replaceChild(root, target.documentElement);
  else target.appendChild(root);
  adopt(source, target, target, sheets);
}
