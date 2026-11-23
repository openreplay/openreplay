/**
 * Moves every rule with a positive `:hover` into `@media (hover: hover)`,
 * right after where it was, so a phone never keeps the hover of the last thing
 * tapped ("sticky hover"). Desktops match `hover: hover`: nothing changes there.
 *
 * Mixed selector lists are split; only the `:hover` ones move. Left alone:
 * rules already in a hover media query, `:not(:hover)` (a rest state) and
 * `:is(:hover, :focus…)` (the focus half must work on a tablet with a keyboard).
 */
const positiveHover = (sel) => {
  if (/:is\([^)]*:hover[^)]*:focus|:is\([^)]*:focus[^)]*:hover/.test(sel))
    return false;
  return /:hover/.test(sel.replace(/:not\([^()]*(\([^()]*\)[^()]*)*\)/g, ''));
};

const insideHoverMedia = (node) => {
  for (let p = node.parent; p; p = p.parent)
    if (p.type === 'atrule' && p.name === 'media' && /hover/.test(p.params))
      return true;
  return false;
};

export default function hoverMedia() {
  return {
    postcssPlugin: 'hover-media',
    Once(root, { AtRule }) {
      root.walkRules((rule) => {
        if (!rule.selector.includes(':hover') || insideHoverMedia(rule)) return;
        if (
          rule.parent?.type === 'atrule' &&
          /keyframes/.test(rule.parent.name)
        )
          return;
        const hovers = rule.selectors.filter(positiveHover);
        if (!hovers.length) return;
        const rest = rule.selectors.filter((s) => !positiveHover(s));
        const media = new AtRule({ name: 'media', params: '(hover: hover)' });
        media.append(rule.clone({ selectors: hovers }));
        rule.after(media);
        if (rest.length) rule.selectors = rest;
        else rule.remove();
      });
    },
  };
}
hoverMedia.postcss = true;
