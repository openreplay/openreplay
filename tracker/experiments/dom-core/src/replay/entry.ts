// Replays tracker tuples through the real player (ReplayEngine = Screen + PagesManager)
// and serializes the painted DOM in the harness format.
import ReplayEngine from '../../../../../mcp_app/src/player/ReplayEngine'
import translate from '../../../../../player/src/web/messages/tracker.gen'

function ser(n: Node): string {
  if (n.nodeType === 3) return JSON.stringify((n as Text).data)
  if (n.nodeType !== 1) return ''
  const el = n as Element
  if (el.id === 'OPENREPLAY_SPRITES_MAP') return ''
  const attrs = [...el.attributes]
    .map((a) => [a.name, a.value] as [string, string])
    .filter(([k]) => !k.startsWith('__openreplay') && k !== 'orloaded' && k !== 'data-openreplay-id')
    .filter(([k]) => !(k === 'style' && el.hasAttribute('data-openreplay-hidden')))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => ` ${k}=${JSON.stringify(v)}`)
    .join('')
  let root = ''
  if (el.shadowRoot) root = `{#root${[...el.shadowRoot.childNodes].map(ser).join('')}}`
  if (el.localName === 'iframe') {
    const d = (el as HTMLIFrameElement).contentDocument
    if (d && d.documentElement) root = `{#root${[...d.childNodes].map(ser).join('')}}`
  }
  // style text comes back as the text child (SetCssData -> text node) in the player
  return `<${el.tagName}${attrs}>${root}${[...el.childNodes].map(ser).join('')}</${el.tagName}>`
}

;(window as any).replay = async (tuples: any[]) => {
  const host = document.getElementById('host')!
  const engine = new ReplayEngine({ onStateChange: () => {} })
  engine.attach(host)
  const msgs: any[] = []
  let t = 1
  for (const tu of tuples) {
    const m: any = translate(tu)
    if (!m) continue
    m.time = t++
    m.tabId = 'tab'
    msgs.push(m)
  }
  engine.loadMessages(msgs, t + 1)
  await new Promise((r) => setTimeout(r, 100))
  engine.jump(t + 1)
  await new Promise((r) => setTimeout(r, 300))
  const doc = (engine as any).screen.document as Document
  return doc && doc.documentElement ? ser(doc.documentElement) : 'NO DOC'
}
