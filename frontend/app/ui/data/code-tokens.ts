export type CodeTokenType =
  | 'comment'
  | 'string'
  | 'keyword'
  | 'number'
  | 'punct'
  | 'tag'
  | 'fn'
  | 'builtin'
  | 'plain';

export interface CodeToken {
  type: CodeTokenType;
  text: string;
}

const KEYWORDS = new Set([
  'import',
  'from',
  'export',
  'default',
  'const',
  'let',
  'var',
  'function',
  'return',
  'new',
  'this',
  'if',
  'else',
  'true',
  'false',
  'null',
  'undefined',
  'async',
  'await',

  'class',
  'func',
  'override',
  'let',
  'var',
  'return',
  'import',
  'self',
  'super',
  'nil',

  'fun',
  'val',
  'override',
  'class',
  'super',
  'applicationContext',
]);

const TOKEN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(<\/?[a-zA-Z][^>]*>)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([{}()[\];,.:=<>+\-*/!?&|]+)|(\s+|.)/g;

const LITERALS = new Set(['true', 'false', 'null', 'nil', 'undefined']);

function wordType(word: string, after: string, dotted: boolean): CodeTokenType {
  if (LITERALS.has(word)) return 'number';
  if (KEYWORDS.has(word)) return 'keyword';
  if (after === '(') return 'fn';
  if (after === '.' && !dotted) return 'builtin';
  return 'plain';
}

export function tokenize(code: string): CodeToken[] {
  const out: CodeToken[] = [];

  let dotted = false;
  for (const m of code.matchAll(TOKEN)) {
    const [text, comment, string, tag, number, word, punct] = m;
    if (comment) out.push({ type: 'comment', text });
    else if (string) out.push({ type: 'string', text });
    else if (tag) out.push({ type: 'tag', text });
    else if (number) out.push({ type: 'number', text });
    else if (word) {
      const rest = code.slice((m.index ?? 0) + text.length);
      const after = rest.replace(/^[ \t]+/, '').charAt(0);
      out.push({ type: wordType(word, after, dotted), text });
      dotted = false;
    } else if (punct) {
      out.push({ type: 'punct', text });
      dotted = punct.trim().endsWith('.');
    } else out.push({ type: 'plain', text });
  }

  return out.reduce<CodeToken[]>((acc, t) => {
    const last = acc[acc.length - 1];
    if (last && last.type === 'plain' && t.type === 'plain')
      last.text += t.text;
    else acc.push({ ...t });
    return acc;
  }, []);
}
