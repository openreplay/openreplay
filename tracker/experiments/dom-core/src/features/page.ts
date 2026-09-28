import CanvasRecorder, { watchCanvasContexts } from '../../../../tracker/src/main/app/canvas.js'
import adoptedSS from '../../../../tracker/src/main/modules/constructedStyleSheets.js'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function opaquePixels(blob: Blob) {
  const bmp = await createImageBitmap(blob)
  const c = document.createElement('canvas')
  c.width = bmp.width
  c.height = bmp.height
  const ctx = c.getContext('2d')!
  ctx.drawImage(bmp, 0, 0)
  const d = ctx.getImageData(0, 0, c.width, c.height).data
  let n = 0
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++
  return n
}

function glCanvas(color: [number, number, number]) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  document.body.append(c)
  const gl = c.getContext('webgl')!
  const draw = () => {
    gl.clearColor(color[0], color[1], color[2], 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.POINTS, 0, 0)
  }
  return { c, draw }
}

;(window as any).webgl = async () => {
  const early = glCanvas([1, 0, 0]) // context created before the hook: old path
  watchCanvasContexts(window)
  const onDemand = glCanvas([0, 1, 0])
  const continuous = glCanvas([0, 0, 1])
  const ids = new Map<Node, number>([
    [early.c, 1],
    [onDemand.c, 2],
    [continuous.c, 3],
  ])
  let nodeCb: any
  const app: any = {
    nodes: {
      getID: (n: Node) => ids.get(n),
      scanTree: (cb: any) => ids.forEach((_, n) => cb(n)),
      attachNodeCallback: (cb: any) => (nodeCb = cb),
    },
    attachResanitizeCallback() {},
    sanitizer: { isObscured: () => false, isHidden: () => false },
    timestamp: () => Date.now(),
    send() {},
    debug: { log() {}, warn() {}, error() {} },
  }
  const rec = new CanvasRecorder(app, { fps: 10, quality: 'medium' })
  const frames: Record<number, Blob[]> = { 1: [], 2: [], 3: [] }
  ;(rec as any).sendSnaps = (images: any[], id: number) => frames[id].push(...images.map((i) => i.data))
  const snaps = (rec as any).snapshots
  rec.startTracking()
  early.draw()
  onDemand.draw()
  let stop = false
  const loop = () => {
    if (stop) return
    continuous.draw()
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
  await sleep(400)
  early.draw()
  onDemand.draw() // on-demand render, e.g. after user input
  await sleep(400)
  onDemand.draw()
  await sleep(400)
  stop = true
  for (const id of [1, 2, 3]) frames[id].push(...(snaps[id]?.images.map((i: any) => i.data) ?? []))
  const out: any = {}
  for (const id of [1, 2, 3]) {
    const counts: number[] = []
    for (const b of frames[id]) counts.push(await opaquePixels(b))
    const label = ({ 1: 'createdBeforeHook', 2: 'onDemand', 3: 'continuous' } as Record<number, string>)[id]
    out[label] = {
      frames: counts.length,
      nonBlankFrames: counts.filter((c) => c > 0).length,
    }
  }
  return out
}

;(window as any).adopted = async () => {
  const sent: any[] = []
  const starts: any[] = []
  const app: any = {
    send: (m: any) => sent.push(m),
    getBaseHref: () => location.href,
    debug: { log() {} },
    safe: (f: any) => f,
    nodes: { getID: () => undefined, attachNodeCallback() {} },
    observer: { attachContextCallback() {} },
    attachStopCallback() {},
    attachStartCallback: (cb: any) => starts.push(cb),
  }
  adoptedSS(app)
  starts.forEach((cb) => cb())
  await sleep(50)
  const s = new CSSStyleSheet()
  s.replaceSync('p { color: red; }')
  document.adoptedStyleSheets.push(s)
  await sleep(80)
  const s2 = new CSSStyleSheet()
  s2.replaceSync('b { color: blue; }')
  const held = document.adoptedStyleSheets
  held.splice(0, 1, s2)
  await sleep(80)
  return {
    sameArrayIdentity: document.adoptedStyleSheets === held,
    isArray: Array.isArray(document.adoptedStyleSheets),
    length: document.adoptedStyleSheets.length,
    messages: sent.map((m) => m[0] + ':' + m.slice(1).join('|')),
  }
}
