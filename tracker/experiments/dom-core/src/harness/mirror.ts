// Minimal re-implementation of the player's DOMManager tree semantics
// (splice-at-index insert, RemoveNode drops only the top id, CreateIFrameDocument replaces root).

export const T = {
  CreateDocument: 7,
  CreateElementNode: 8,
  CreateTextNode: 9,
  MoveNode: 10,
  RemoveNode: 11,
  SetNodeAttribute: 12,
  RemoveNodeAttribute: 13,
  SetNodeData: 14,
  StringDictGlobal: 34,
  SetNodeAttributeDictGlobal: 35,
  SetNodeAttributeURLBased: 60,
  SetCSSDataURLBased: 61,
  SetNodeSlot: 65,
  CreateIFrameDocument: 70,
  UnbindNodes: 115,
} as const

class MNode {
  children: MNode[] = []
  parent: MNode | null = null
  attrs = new Map<string, string>()
  root: MNode | null = null // iframe document / shadow root
  text = ''
  constructor(
    public id: number,
    public tag: string, // '#text' | '#root' | TAG
  ) {}
}

export class Mirror {
  nodes = new Map<number, MNode>()
  dict = new Map<number, string>()
  top: MNode | null = null
  errors: string[] = []
  unbind = 0

  private err(s: string) {
    if (this.errors.length < 50) this.errors.push(s)
    else if (this.errors.length === 50) this.errors.push('...')
  }

  private insert(parentId: number, n: MNode, index: number, what: string) {
    const p = this.nodes.get(parentId)
    if (!p) return this.err(`${what}: parent ${parentId} missing for ${n.id}`)
    if (n.parent) this.detach(n)
    if (index > p.children.length) this.err(`${what}: index ${index} > ${p.children.length} (id ${n.id})`)
    p.children.splice(index, 0, n)
    n.parent = p
  }

  private detach(n: MNode) {
    const p = n.parent
    if (!p) return
    const i = p.children.indexOf(n)
    if (i >= 0) p.children.splice(i, 1)
    n.parent = null
  }

  apply(m: any[]) {
    switch (m[0]) {
      case T.CreateDocument: {
        this.nodes.clear()
        this.top = new MNode(0, 'HTML')
        this.nodes.set(0, this.top)
        return
      }
      case T.CreateElementNode: {
        const n = new MNode(m[1], String(m[4]))
        if (this.nodes.has(m[1]) && m[1] !== 0) this.err(`dup id ${m[1]}`)
        this.nodes.set(m[1], n)
        this.insert(m[2], n, m[3], 'CreateElementNode')
        return
      }
      case T.CreateTextNode: {
        const n = new MNode(m[1], '#text')
        this.nodes.set(m[1], n)
        this.insert(m[2], n, m[3], 'CreateTextNode')
        return
      }
      case T.MoveNode: {
        const n = this.nodes.get(m[1])
        if (!n) return this.err(`MoveNode: ${m[1]} missing`)
        this.insert(m[2], n, m[3], 'MoveNode')
        return
      }
      case T.RemoveNode: {
        const n = this.nodes.get(m[1])
        if (!n) return this.err(`RemoveNode: ${m[1]} missing`)
        if (!n.parent) return this.err(`RemoveNode: ${m[1]} has no parent`)
        this.detach(n)
        this.nodes.delete(m[1])
        return
      }
      case T.SetNodeAttribute:
      case T.SetNodeAttributeURLBased: {
        const n = this.nodes.get(m[1])
        if (!n) return this.err(`SetAttr: ${m[1]} missing`)
        n.attrs.set(m[2], m[3])
        return
      }
      case T.StringDictGlobal:
        this.dict.set(m[1], m[2])
        return
      case T.SetNodeAttributeDictGlobal: {
        const n = this.nodes.get(m[1])
        if (!n) return this.err(`SetAttrDict: ${m[1]} missing`)
        n.attrs.set(this.dict.get(m[2]) ?? '?', this.dict.get(m[3]) ?? '?')
        return
      }
      case T.RemoveNodeAttribute: {
        const n = this.nodes.get(m[1])
        if (!n) return this.err(`RemoveAttr: ${m[1]} missing`)
        n.attrs.delete(m[2])
        return
      }
      case T.SetNodeData:
      case T.SetCSSDataURLBased: {
        const n = this.nodes.get(m[1])
        if (!n) return this.err(`SetData: ${m[1]} missing`)
        n.text = m[2]
        return
      }
      case T.CreateIFrameDocument: {
        const host = this.nodes.get(m[1])
        if (!host) return this.err(`CreateIFrameDocument: host ${m[1]} missing`)
        const r = new MNode(m[2], '#root')
        this.nodes.set(m[2], r)
        host.root = r
        return
      }
      case T.UnbindNodes:
        this.unbind++
        return
    }
  }

  serialize(): string {
    return this.top ? ser(this.top) : ''
  }
}

function ser(n: MNode): string {
  if (n.tag === '#text') return JSON.stringify(n.text)
  const attrs = [...n.attrs.entries()]
    .filter(([k]) => !k.startsWith('__openreplay') && k !== 'orloaded')
    .filter(([k]) => !(k === 'style' && n.attrs.has('data-openreplay-hidden')))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => ` ${k}=${JSON.stringify(v)}`)
    .join('')
  const kids = n.children.map(ser).join('')
  const root = n.root ? `{#root${n.root.children.map(ser).join('')}}` : ''
  return `<${n.tag}${attrs}>${root}${kids}</${n.tag}>`
}
