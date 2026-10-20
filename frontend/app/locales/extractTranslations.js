/*
 * Collects every `t('literal')` / `i18n.t('literal', …)` key in app/
 * into en.json and keeps the other locales
 * on the same keys, in the same order: keys still in use keep their place
 * and translation, unused ones go, new ones are appended (English until
 * translated).
 *
 *   node extractTranslations.js            # from app/locales
 *   node extractTranslations.js --check    # exit 1 when anything would change
 */
const fs = require('fs');
const path = require('path');

const localesDir = __dirname;
// app/ and the SaaS slots beside it: their strings are FOSS's to translate
const sourceDirs = [
  path.resolve(__dirname, '..'),
  path.resolve(__dirname, '../../saas'),
];
const LOCALES = ['es', 'fr', 'ko', 'ru', 'uk', 'zh'];
const check = process.argv.includes('--check');

const used = new Set();
// every string literal in the source: a key no `t('…')` names may still be
// translated through a variable (`t(kind.label)`), so it stays while its
// text is somewhere in the code
const literals = new Set();

function walkDirectory(directory) {
  for (const file of fs.readdirSync(directory)) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'locales')
        walkDirectory(fullPath);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // a module with its own top-level `t` (theme/colors.js) isn't i18n
      if (!/^(?:const|let|function) t\b\s*[=(]/m.test(content))
        extractTranslations(content);
      for (const m of content.matchAll(/(['"])((?:\\.|(?!\1)[^\\\n])+)\1/g))
        literals.add(unescapeJs(m[2]));
    }
  }
}

function extractTranslations(content) {
  // `t(` not part of a longer name or a member call (`x.t(`), or `i18n.t(`
  const regex = /(?<![\w$.])t\(|\bi18n\.t\(/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const literal = extractStringLiteral(
      content,
      match.index + match[0].length,
    );
    if (literal) {
      if (literal.value) used.add(literal.value);
      regex.lastIndex = literal.end;
    }
  }
}

const SIMPLE_ESCAPES = {
  n: '\n',
  t: '\t',
  r: '\r',
  b: '\b',
  f: '\f',
  v: '\v',
  0: '\0',
};
/** A string literal's source as the runtime sees it, so keys match `t()`. */
function unescapeJs(raw) {
  return raw.replace(
    /\\(u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|\r\n|[\s\S])/g,
    (_, all, cp, u4, x2) => {
      if (cp) return String.fromCodePoint(parseInt(cp, 16));
      if (u4 || x2) return String.fromCharCode(parseInt(u4 || x2, 16));
      if (all in SIMPLE_ESCAPES) return SIMPLE_ESCAPES[all];
      // a backslash before a line break continues the line
      return /^(\r\n|\n|\r)$/.test(all) ? '' : all;
    },
  );
}

/** The first argument when it is a plain string literal followed by `)` or
    by more arguments (interpolation values, options). */
function extractStringLiteral(text, startIndex) {
  let i = startIndex;
  while (/\s/.test(text[i])) i++;

  const quoteChar = text[i];
  if (quoteChar !== "'" && quoteChar !== '"') return null;

  let value = '';
  let escaped = false;
  i++;
  for (; i < text.length; i++) {
    const char = text[i];
    if (escaped) {
      value += char;
      escaped = false;
    } else if (char === '\\') {
      value += char;
      escaped = true;
    } else if (char === quoteChar) {
      i++;
      break;
    } else if (char === '\n') {
      return null;
    } else {
      value += char;
    }
  }

  while (/\s/.test(text[i])) i++;
  if (text[i] !== ')' && text[i] !== ',') return null;
  return { value: unescapeJs(value).trim(), end: i };
}

const read = (lng) =>
  JSON.parse(fs.readFileSync(path.join(localesDir, `${lng}.json`), 'utf8'));

sourceDirs.forEach(walkDirectory);

const en = read('en');
// plural forms (`key_one`, `key_few`, …) are written by hand per locale and
// follow their base key; t('key', { count }) picks one by the locale's rules
const PLURAL = /_(zero|one|two|few|many|other)$/;
const CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'];
const kept = (k) => used.has(k) || literals.has(k);
const order = [
  ...Object.keys(en).filter((k) => !PLURAL.test(k) && kept(k)),
  ...[...used].filter((k) => !(k in en)),
];
const withPlurals = (data, value) =>
  Object.fromEntries(
    order.flatMap((k) => [
      [k, value(k)],
      ...CATEGORIES.filter((c) => `${k}_${c}` in data).map((c) => [
        `${k}_${c}`,
        data[`${k}_${c}`],
      ]),
    ]),
  );

let changed = false;
const write = (lng, data) => {
  const file = path.join(localesDir, `${lng}.json`);
  const next = `${JSON.stringify(data, null, 2)}\n`;
  if (fs.readFileSync(file, 'utf8') === next) return;
  changed = true;
  if (!check) fs.writeFileSync(file, next, 'utf8');
};

write(
  'en',
  withPlurals(en, (k) => k),
);
for (const lng of LOCALES) {
  const current = read(lng);
  write(
    lng,
    withPlurals(current, (k) => current[k] ?? k),
  );
}

const added = order.filter((k) => !(k in en)).length;
const removed = Object.keys(en).filter(
  (k) => !PLURAL.test(k) && !kept(k),
).length;
console.log(`${order.length} keys: ${added} new, ${removed} no longer used`);
if (check && changed) process.exit(1);
