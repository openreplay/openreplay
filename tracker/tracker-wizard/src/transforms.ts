import { parse, type ParserPlugin } from '@babel/parser'

import type { Style } from './types.js'

/*
 * Edits locate nodes with the parser and splice text at their offsets, so the rest of
 * the user's file keeps its exact formatting. Each returns the new code, the same code
 * when the change is already there, or null when the file doesn't have the expected shape.
 */

type Node = { type: string; start: number; end: number; [key: string]: any }

export function parseCode(code: string, file: string): Node | null {
  const plugins: ParserPlugin[] = ['decorators-legacy']
  if (/\.[cm]?tsx?$/.test(file)) {
    plugins.push('typescript')
    if (file.endsWith('.tsx')) plugins.push('jsx')
  } else {
    plugins.push('jsx')
  }
  try {
    return parse(code, {
      sourceType: 'module',
      plugins,
      errorRecovery: true,
      allowAwaitOutsideFunction: true,
    }).program as unknown as Node
  } catch {
    return null
  }
}

const SKIP_KEYS = new Set(['loc', 'leadingComments', 'trailingComments', 'innerComments', 'extra'])

function find(root: Node, test: (n: Node) => boolean): Node[] {
  const out: Node[] = []
  const walk = (node: any) => {
    if (!node || typeof node.type !== 'string') return
    if (test(node)) out.push(node)
    for (const key of Object.keys(node)) {
      if (SKIP_KEYS.has(key)) continue
      const v = node[key]
      if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') walk(v)
    }
  }
  walk(root)
  return out
}

const lineStart = (code: string, pos: number) => code.lastIndexOf('\n', pos - 1) + 1
const indentAt = (code: string, pos: number) => {
  const start = lineStart(code, pos)
  return code.slice(start).match(/^[ \t]*/)![0]
}
const splice = (code: string, at: number, text: string, removeTo = at) =>
  code.slice(0, at) + text + code.slice(removeTo)

/** Quote style, semicolons and indentation of an existing file. */
export function detectStyle(code?: string | null): Style {
  const style: Style = { quote: "'", semi: true, indent: '  ' }
  if (!code) return style
  let single = 0
  let double = 0
  let semi = 0
  let bare = 0
  const re = /(?:\bfrom\s+|^\s*import\s+)(['"])[^'"\n]+\1([ \t]*;)?/gm
  for (const m of code.matchAll(re)) {
    if (m[1] === "'") single++
    else double++
    if (m[2]) semi++
    else bare++
  }
  if (single + double) {
    style.quote = double > single ? '"' : "'"
    style.semi = semi >= bare
  } else {
    style.semi = /;[ \t]*$/m.test(code)
  }
  if (/^\t+\S/m.test(code)) {
    style.indent = '\t'
  } else {
    const sizes = [...code.matchAll(/^( +)[^\s*]/gm)].map((m) => m[1].length).filter((n) => n <= 8)
    if (sizes.length) style.indent = ' '.repeat(Math.max(2, Math.min(...sizes)))
  }
  return style
}

export interface ImportSpec {
  source: string
  default?: string
  named?: string[]
  typeOnly?: boolean
}

export function importLine(spec: ImportSpec, s: Style): string {
  const src = `${s.quote}${spec.source}${s.quote}${s.semi ? ';' : ''}`
  const parts: string[] = []
  if (spec.default) parts.push(spec.default)
  if (spec.named?.length) parts.push(`{ ${spec.named.join(', ')} }`)
  if (!parts.length) return `import ${src}`
  return `import ${spec.typeOnly ? 'type ' : ''}${parts.join(', ')} from ${src}`
}

/** Start of the comment block glued to a statement (no blank line in between), else the statement. */
function attachedStart(code: string, node: Node): number {
  let start = node.start
  const comments: Node[] = node.leadingComments ?? []
  for (let i = comments.length - 1; i >= 0; i--) {
    const between = code.slice(comments[i].end, start)
    if ((between.match(/\n/g) ?? []).length > 1) break
    start = comments[i].start
  }
  return lineStart(code, start)
}

/**
 * Adds an import. `first` puts it before the other imports (so it runs before the app's
 * modules), otherwise after the last one.
 */
export function addImport(
  code: string,
  file: string,
  spec: ImportSpec,
  style: Style,
  position: 'first' | 'last' = 'last',
): string | null {
  const program = parseCode(code, file)
  if (!program) return null
  const body: Node[] = program.body
  const imports = body.filter((n) => n.type === 'ImportDeclaration')
  const same = imports.find(
    (n) => n.source.value === spec.source && (n.importKind === 'type') === !!spec.typeOnly,
  )
  if (same) {
    const specifiers: Node[] = same.specifiers
    const missing = (spec.named ?? []).filter(
      (name) => !specifiers.some((x) => x.type === 'ImportSpecifier' && x.local.name === name),
    )
    const needsDefault =
      !!spec.default && !specifiers.some((x) => x.type === 'ImportDefaultSpecifier')
    if (!missing.length && !needsDefault) return code
    if (specifiers.some((x) => x.type === 'ImportNamespaceSpecifier')) {
      // can't merge into `import * as x`; add a separate line below
    } else if (!specifiers.length) {
      return splice(code, same.start, importLine(spec, style), same.end)
    } else if (!needsDefault) {
      const named = specifiers.filter((x) => x.type === 'ImportSpecifier')
      if (named.length) {
        const last = named[named.length - 1]
        return splice(code, last.end, `, ${missing.join(', ')}`)
      }
      return splice(code, specifiers[0].end, `, { ${missing.join(', ')} }`)
    } else {
      const merged = {
        ...spec,
        named: [
          ...new Set([
            ...specifiers
              .filter((x) => x.type === 'ImportSpecifier')
              .map((x) => code.slice(x.start, x.end)),
            ...(spec.named ?? []),
          ]),
        ],
      }
      return splice(code, same.start, importLine(merged, style), same.end)
    }
  }

  const line = importLine(spec, style)
  if (imports.length && position === 'first') {
    const at = attachedStart(code, imports[0])
    return splice(code, at, `${line}\n`)
  }
  if (imports.length) {
    return splice(code, imports[imports.length - 1].end, `\n${line}`)
  }
  const directives: Node[] = program.directives ?? []
  if (directives.length) {
    return splice(code, directives[directives.length - 1].end, `\n\n${line}`)
  }
  if (body.length) {
    const at = attachedStart(code, body[0])
    return splice(code, at, `${line}\n\n`)
  }
  return `${line}\n${code}`
}

/** Renders `child` as the first child of the `<tag>` JSX element (`<body>` in a Next.js layout). */
export function insertJsxChild(
  code: string,
  file: string,
  tag: string,
  child: string,
  style: Style,
): string | null {
  const program = parseCode(code, file)
  if (!program) return null
  const [el] = find(
    program,
    (n) =>
      n.type === 'JSXElement' &&
      n.openingElement.name.type === 'JSXIdentifier' &&
      n.openingElement.name.name === tag &&
      !n.openingElement.selfClosing,
  )
  if (!el) return null
  const childName = child.match(/^<([\w.]+)/)?.[1]
  if (childName && code.slice(el.start, el.end).includes(`<${childName}`)) return code
  const at = el.openingElement.end
  const rest = code.slice(at)
  if (/^[ \t]*\r?\n/.test(rest)) {
    const indent = indentAt(code, el.openingElement.start) + style.indent
    return splice(code, at, `\n${indent}${child}`)
  }
  return splice(code, at, child)
}

const isCall = (n: Node, name: string) =>
  n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === name

/** `createPinia()` → `createPinia().use(plugin)`; `Pinia.use()` returns the instance. */
export function wirePinia(code: string, file: string, plugin: string): string | null {
  const program = parseCode(code, file)
  if (!program) return null
  const [call] = find(program, (n) => isCall(n, 'createPinia'))
  if (!call) return null
  if (code.slice(call.end).startsWith(`.use(${plugin})`)) return code
  return splice(code, call.end, `.use(${plugin})`)
}

/**
 * Adds `middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(mw)` to the
 * single `configureStore({...})` of a file. Null when the store already sets `middleware`
 * (merging into user code is left to the user) or the file has no/several stores.
 */
export function wireReduxToolkit(code: string, file: string, middleware: string): string | null {
  const program = parseCode(code, file)
  if (!program) return null
  if (code.includes(`.concat(${middleware})`)) return code
  const calls = find(program, (n) => isCall(n, 'configureStore'))
  if (calls.length !== 1) return null
  const arg: Node | undefined = calls[0].arguments[0]
  if (!arg || arg.type !== 'ObjectExpression') return null
  const props: Node[] = arg.properties
  const keyName = (p: Node) =>
    p.key?.type === 'Identifier' ? p.key.name : p.key?.type === 'StringLiteral' ? p.key.value : null
  if (props.some((p) => p.type === 'SpreadElement' || keyName(p) === 'middleware')) return null
  const prop = `middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(${middleware})`
  if (!props.length) return splice(code, arg.start, `{ ${prop} }`, arg.end)
  const last = props[props.length - 1]
  const after = code.slice(last.end, arg.end - 1)
  const comma = after.match(/^\s*,/)
  const multiline = code.slice(arg.start, arg.end).includes('\n')
  if (!multiline) return splice(code, last.end, `, ${prop}`)
  const indent = indentAt(code, last.start)
  if (comma) return splice(code, last.end + comma[0].length, `\n${indent}${prop},`)
  return splice(code, last.end, `,\n${indent}${prop}`)
}

/** Puts `snippet` (multi-line) right before `</head>`, matching the head's indentation. */
export function injectIntoHead(html: string, snippet: string): string {
  const close = html.search(/<\/head\s*>/i)
  const indentLines = (text: string, indent: string) =>
    text
      .split('\n')
      .map((l) => (l ? indent + l : l))
      .join('\n')
  if (close >= 0) {
    const start = lineStart(html, close)
    const ownLine = /^[ \t]*$/.test(html.slice(start, close))
    const headIndent = ownLine ? html.slice(start, close) : ''
    const prev = html.slice(0, start).trimEnd()
    const prevIndent = prev ? indentAt(prev, prev.length) : ''
    const indent = prevIndent.length > headIndent.length ? prevIndent : `${headIndent}  `
    if (ownLine) return splice(html, start, `${indentLines(snippet, indent)}\n`)
    return splice(html, close, `\n${indentLines(snippet, indent)}\n`)
  }
  const body = html.search(/<body[\s>]/i)
  if (body >= 0) return splice(html, body, `<head>\n${indentLines(snippet, '  ')}\n</head>\n`)
  return `${snippet}\n${html}`
}
