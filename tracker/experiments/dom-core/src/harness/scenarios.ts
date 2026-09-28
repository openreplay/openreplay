export interface Scenario {
  kind: 'correct' | 'perf' | 'memory'
  setup?: () => void | Promise<void>
  steps: Array<() => void | Promise<void>>
  /** ms to wait after each step (iframes: current core handles them on a 250ms timer) */
  settle?: number
  verifyEach?: boolean
  note?: string
}

const $ = (s: string) => document.querySelector(s) as HTMLElement
const app = () => $('#app')

function h(tag: string, attrs: Record<string, string> = {}, ...kids: (Node | string)[]) {
  const e = document.createElement(tag)
  for (const k in attrs) e.setAttribute(k, attrs[k])
  for (const k of kids) e.append(typeof k === 'string' ? document.createTextNode(k) : k)
  return e
}

function row(i: number) {
  return h(
    'div',
    { class: `row r${i % 7}`, 'data-id': String(i) },
    h('span', { class: 'cell name' }, `Item ${i}`),
    h('span', { class: 'cell value' }, String(i * 13)),
    h('a', { href: `/items/${i}`, class: 'link' }, 'open'),
    h('button', { type: 'button', class: 'btn' }, h('i', { class: 'icon icon-edit' }), ' Edit'),
  )
}

function rows(n: number, from = 0) {
  const f = document.createDocumentFragment()
  for (let i = 0; i < n; i++) f.append(row(from + i))
  return f
}

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const repeat = (n: number, f: (i: number) => unknown) =>
  Array.from({ length: n }, (_, i) => () => f(i) as void | Promise<void>)

const waitLoad = (f: HTMLIFrameElement) =>
  new Promise<void>((r) => {
    f.addEventListener('load', () => r(), { once: true })
  })

const labels = new WeakMap<Node, string>()
let labelN = 0
export const lab = (n: Node | null | undefined): string => {
  if (!n) return 'null'
  let l = labels.get(n)
  if (!l) {
    l = `${n.nodeType === 3 ? '#t' : (n as Element).localName}${labelN++}`
    labels.set(n, l)
  }
  return l
}
export const ops: string[] = []

function fuzz(seed: number, steps: number): Scenario {
  const rnd = mulberry32(seed)
  const pick = <T>(a: T[]): T | undefined => (a.length ? a[Math.floor(rnd() * a.length)] : undefined)
  const detached: Node[] = []
  const tags = ['div', 'span', 'p', 'ul', 'li', 'section', 'b', 'script', 'svg']
  const all = () => [...app().querySelectorAll('*')].filter((e) => e.localName !== 'svg' || true) as Element[]
  const containers = () => [app(), ...all().filter((e) => !['script', 'svg'].includes(e.localName))]
  const fresh = () => {
    const tag = pick(tags)!
    if (tag === 'svg') {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      s.setAttribute('viewBox', '0 0 10 10')
      s.append(document.createElementNS('http://www.w3.org/2000/svg', 'circle'))
      return s
    }
    const e = h(tag, { class: `c${Math.floor(rnd() * 5)}` })
    if (tag === 'script') e.setAttribute('type', 'text/x-inert')
    if (rnd() < 0.6) e.append(`t${Math.floor(rnd() * 1000)}`)
    if (rnd() < 0.3) e.append(h('i', {}, 'x'))
    if (rnd() < 0.05) e.setAttribute('data-openreplay-hidden', '')
    if (rnd() < 0.05) e.setAttribute('data-openreplay-obscured', '')
    return e
  }
  const insertAt = (parent: Element, n: Node) => {
    const kids = [...parent.childNodes]
    const ref = kids.length ? kids[Math.floor(rnd() * (kids.length + 1))] ?? null : null
    if (ref === n) return
    try {
      parent.insertBefore(n, ref)
      ops.push(`insert ${lab(n)} into ${lab(parent)} before ${lab(ref)}`)
    } catch (e) {}
  }
  const op = () => {
    const r = rnd()
    const nodes = all()
    if (r < 0.25) insertAt(pick(containers())!, fresh())
    else if (r < 0.45) {
      const n = pick(nodes)
      const p = pick(containers())
      if (n && p && !n.contains(p)) insertAt(p, n)
    } else if (r < 0.58) {
      const n = pick(nodes)
      if (n) {
        ops.push(`remove ${lab(n)} from ${lab(n.parentNode)}`)
        n.remove()
        if (rnd() < 0.5) detached.push(n)
      }
    } else if (r < 0.66) {
      const n = detached.splice(Math.floor(rnd() * detached.length), 1)[0]
      if (n) insertAt(pick(containers())!, n)
    } else if (r < 0.74) {
      // pull a node out of a detached subtree back into the document
      const d = pick(detached) as Element | undefined
      const inner = d && d.querySelectorAll ? pick([...d.querySelectorAll('*')]) : undefined
      if (inner) insertAt(pick(containers())!, inner)
    } else if (r < 0.8) {
      const p = pick(containers())!
      const kids = [...p.childNodes]
      ops.push(`reverse children of ${lab(p)} (${kids.map(lab).join(',')})`)
      for (let i = kids.length - 1; i >= 0; i--) p.append(kids[i])
    } else if (r < 0.86) {
      const n = pick(nodes)
      if (n) {
        n.setAttribute('class', `c${Math.floor(rnd() * 9)}`)
        ops.push(`class ${lab(n)}`)
      }
    } else if (r < 0.92) {
      const n = pick(nodes)
      const t = n && [...n.childNodes].find((c) => c.nodeType === 3)
      if (t) {
        ;(t as Text).data = `u${Math.floor(rnd() * 1000)}`
        ops.push(`text ${lab(t)}`)
      }
    } else {
      // wrap a few siblings into a new container
      const p = pick(containers())!
      const kids = [...p.children].slice(0, 1 + Math.floor(rnd() * 3))
      if (kids.length) {
        const w = h('div', { class: 'wrap' })
        p.insertBefore(w, kids[0])
        ops.push(`wrap ${kids.map(lab).join(',')} of ${lab(p)} into new ${lab(w)}`)
        for (const k of kids) w.append(k)
      }
    }
  }
  return {
    kind: 'correct',
    verifyEach: true,
    setup: () => {
      app().append(rows(5))
    },
    steps: repeat(steps, () => {
      ops.length = 0
      if ((globalThis as any).__dlog) (globalThis as any).__dlog.length = 0
      const k = 1 + Math.floor(rnd() * 12)
      for (let i = 0; i < k; i++) op()
    }),
  }
}

export const scenarios: Record<string, Scenario> = {
  c_basic: {
    kind: 'correct',
    setup: () => {
      document.head.append(h('style', {}, '.a{color:red}'), h('link', { rel: 'stylesheet', href: '/x.css' }))
      app().innerHTML = `<!-- c --><h1 title="t">Hello <b>world</b></h1><script>1</script>
        <svg viewBox="0 0 10 10"><defs><linearGradient id="g"/></defs><use href="#g"/><circle r="4"/></svg>
        <input type="text" value="secret"><input type="checkbox" value="on" checked>
        <textarea>abc</textarea><select><option>1</option></select>
        <dialog open>d</dialog><img src="/a.png" alt="alt"><a href="/q" onclick="x()">link</a>
        <p>mail me: john.doe@example.co.uk now</p><noscript>ns</noscript>`
    },
    steps: [
      () => {
        $('h1').setAttribute('data-x', '1')
        $('b').textContent = 'there'
        $('circle').setAttribute('r', '2')
      },
    ],
  },
  c_append: {
    kind: 'correct',
    verifyEach: true,
    setup: () => app().append(h('ul', { id: 'l' }, ...Array.from({ length: 200 }, (_, i) => h('li', {}, `i${i}`)))),
    steps: [
      ...repeat(5, (i) => $('#l').append(h('li', {}, `a${i}`))),
      ...repeat(5, (i) => $('#l').prepend(h('li', {}, `p${i}`))),
      ...repeat(5, (i) => $('#l').insertBefore(h('li', {}, `m${i}`), $('#l').children[50 + i])),
    ],
  },
  c_reverse: {
    kind: 'correct',
    verifyEach: true,
    note: 'reorder several siblings in one batch (appendChild loop)',
    setup: () => app().append(h('ul', { id: 'l' }, ...'ABCDEFGH'.split('').map((c) => h('li', {}, c)))),
    steps: [
      () => {
        const l = $('#l')
        const kids = [...l.children]
        for (let i = kids.length - 2; i >= 0; i--) l.append(kids[i])
      },
      () => {
        const l = $('#l')
        l.insertBefore(l.children[5], l.children[1])
        l.insertBefore(l.children[0], null)
        l.insertBefore(l.children[3], l.children[2])
      },
    ],
  },
  c_stale_sibling: {
    kind: 'correct',
    verifyEach: true,
    note: 'insert into P, then move an earlier sibling of P elsewhere, same batch',
    setup: () => app().append(h('div', { id: 'p' }, h('i', { id: 's' }, 's'), h('i', { id: 'x' }, 'x')), h('div', { id: 'q' })),
    steps: [
      () => {
        $('#p').append(h('b', {}, 'n'))
        $('#q').append($('#s'))
      },
    ],
  },
  c_stale_reinsert: {
    kind: 'correct',
    verifyEach: true,
    note: 'remove X; later re-insert a child of X elsewhere; later re-insert X',
    setup: () => app().append(h('div', { id: 'x' }, h('p', { id: 'c' }, 'child', h('b', {}, 'deep')), h('p', {}, 'other'))),
    steps: [
      () => {
        ;(window as any).__x = $('#x')
        $('#x').remove()
      },
      () => {
        app().append((window as any).__x.querySelector('#c'))
      },
      () => {
        app().prepend((window as any).__x)
      },
      () => {
        ;(window as any).__x.append($('#c'))
      },
    ],
  },
  c_move_new_container: {
    kind: 'correct',
    verifyEach: true,
    setup: () => app().append(h('i', { id: 'a' }, 'a'), h('i', { id: 'b' }, 'b'), h('i', { id: 'c' }, 'c')),
    steps: [
      () => {
        const w = h('section', {}, h('em', {}, 'new'))
        w.append($('#a'), $('#c'))
        app().append(w)
      },
    ],
  },
  c_move_into_hidden: {
    kind: 'correct',
    verifyEach: true,
    note: 'moving a tracked node into a data-openreplay-hidden container',
    setup: () => app().append(h('div', { id: 'hid', 'data-openreplay-hidden': '' }), h('p', { id: 'm' }, 'visible text')),
    steps: [() => $('#hid').append($('#m'))],
  },
  c_move_into_obscured: {
    kind: 'correct',
    verifyEach: true,
    setup: () => app().append(h('div', { id: 'ob', 'data-openreplay-obscured': '' }), h('p', { id: 'm' }, 'plain text')),
    steps: [() => $('#ob').append($('#m'))],
  },
  c_shadow: {
    kind: 'correct',
    verifyEach: true,
    setup: () => {
      const host = h('x-card', { id: 'host' })
      const sr = host.attachShadow({ mode: 'open' })
      sr.innerHTML = '<style>p{color:red}</style><p>shadow <b>text</b></p><slot></slot>'
      host.append(h('span', {}, 'light'))
      app().append(host)
    },
    steps: [
      () => {
        const sr = $('#host').shadowRoot!
        sr.querySelector('b')!.textContent = 'changed'
        sr.append(h('i', {}, 'added'))
      },
      () => {
        const host2 = h('x-late', { id: 'late' })
        app().append(host2)
        host2.attachShadow({ mode: 'open' }).append(h('u', {}, 'late shadow'))
      },
      () => $('#host').remove(),
    ],
  },
  c_shadow_masked_host: {
    kind: 'correct',
    note: 'obscured / hidden host: shadow content must inherit the level',
    setup: () => {
      const a = h('x-a', { 'data-openreplay-obscured': '' })
      a.attachShadow({ mode: 'open' }).innerHTML = '<p>card number 4111</p>'
      const b = h('x-b', { 'data-openreplay-hidden': '' })
      b.attachShadow({ mode: 'open' }).innerHTML = '<p>ssn 123-45-6789</p>'
      app().append(a, b)
    },
    steps: [],
  },
  c_iframe: {
    kind: 'correct',
    verifyEach: true,
    settle: 400,
    setup: async () => {
      const f = h('iframe', { id: 'f', srcdoc: '<p id="in">inside <b>frame</b></p>' }) as HTMLIFrameElement
      app().append(f)
      await waitLoad(f)
    },
    steps: [
      () => {
        const d = ($('#f') as HTMLIFrameElement).contentDocument!
        d.body.append(h('i', {}, 'added in frame'))
        d.querySelector('b')!.textContent = 'FRAME'
      },
      async () => {
        const f = $('#f') as HTMLIFrameElement
        const l = waitLoad(f)
        f.setAttribute('srcdoc', '<h2>second document</h2>')
        await l
      },
      () => {
        const d = ($('#f') as HTMLIFrameElement).contentDocument!
        d.body.append(h('i', {}, 'in second doc'))
      },
      async () => {
        const inner = h('iframe', { id: 'g', srcdoc: '<p>nested</p>' }) as HTMLIFrameElement
        const d = ($('#f') as HTMLIFrameElement).contentDocument!
        const l = new Promise<void>((r) => inner.addEventListener('load', () => r(), { once: true }))
        d.body.append(inner)
        await l
      },
      () => $('#f').remove(),
    ],
  },
  c_iframe_in_hidden: {
    kind: 'correct',
    settle: 400,
    note: 'iframe inside a hidden container must not be recorded',
    setup: async () => {
      const f = h('iframe', { srcdoc: '<p>private frame text</p>' }) as HTMLIFrameElement
      app().append(h('div', { 'data-openreplay-hidden': '' }, f))
      await waitLoad(f)
    },
    steps: [],
  },
  c_root_swap: {
    kind: 'correct',
    verifyEach: true,
    setup: () => app().append(h('p', {}, 'before swap')),
    steps: [
      () => {
        const html = document.createElement('html')
        html.innerHTML = '<head></head><body><div id="app"><p>after swap</p></div></body>'
        document.replaceChild(html, document.documentElement)
      },
      () => app().append(h('b', {}, 'post-swap mutation')),
    ],
  },
  c_same_batch: {
    kind: 'correct',
    verifyEach: true,
    setup: () => app().append(h('div', { id: 'p' }, h('i', { id: 'k' }, 'keep'))),
    steps: [
      () => {
        const t = h('b', {}, 'temp')
        app().append(t)
        t.remove()
        const k = $('#k')
        k.remove()
        $('#p').append(k)
      },
      () => {
        const k = $('#k')
        k.remove()
        const w = h('div', {})
        w.append(k)
        app().append(w)
        w.remove()
      },
    ],
  },
  c_deep: {
    kind: 'correct',
    note: '1000-deep nesting (display:none, deep layout is pathological in Chrome)',
    setup: () => {
      let cur = h('div', { style: 'display:none' })
      app().append(cur)
      for (let i = 0; i < 1000; i++) {
        const d = h('div', {})
        cur.append(d)
        cur = d
      }
      cur.id = 'bottom'
    },
    steps: [() => $('#bottom').append(h('b', {}, 'leaf'))],
  },
  c_wide: {
    kind: 'correct',
    note: '30000 siblings, then append one in a later batch',
    setup: () => {
      const l = h('div', { id: 'l' })
      for (let i = 0; i < 30000; i++) l.append(h('i', {}))
      app().append(l)
    },
    steps: [() => $('#l').append(h('b', {}, 'last'))],
  },
  fuzz_1: fuzz(1, 300),
  fuzz_2: fuzz(2, 300),
  fuzz_3: fuzz(3, 300),
  fuzz_4: fuzz(4, 300),
  fuzz_5: fuzz(5, 300),
  fuzz_6: fuzz(6, 400),
  fuzz_7: fuzz(7, 400),
  fuzz_8: fuzz(8, 400),
  fuzz_9: fuzz(9, 400),
  fuzz_10: fuzz(10, 400),

  // ---- perf ------------------------------------------------------------------------
  p_snapshot_50k: {
    kind: 'perf',
    setup: () => app().append(rows(4200)),
    steps: [],
  },
  p_append_10k: {
    kind: 'perf',
    note: '300 batches, each appends one row to a 10k-row list',
    setup: () => app().append(h('div', { id: 'l' }, rows(10000))),
    steps: repeat(300, (i) => $('#l').append(row(20000 + i))),
  },
  p_append_2k: {
    kind: 'perf',
    note: '300 batches, each appends one row to a 2k-row list (below the current core overflow)',
    setup: () => app().append(h('div', { id: 'l' }, rows(2000))),
    steps: repeat(300, (i) => $('#l').append(row(20000 + i))),
  },
  p_remove_only: {
    kind: 'perf',
    note: '10 batches, each removes one pre-built ~8.5k-node subtree',
    setup: () => {
      for (let k = 0; k < 10; k++) app().append(h('div', { class: 'big' }, rows(850)))
    },
    steps: repeat(10, () => app().querySelector('.big')!.remove()),
  },
  p_virtual_list: {
    kind: 'perf',
    note: '200 batches, each replaces all 100 visible rows',
    setup: () => app().append(h('div', { id: 'l' }, rows(100))),
    steps: repeat(200, (i) => {
      const l = $('#l')
      l.replaceChildren(rows(100, i * 100))
    }),
  },
  p_react_reorder: {
    kind: 'perf',
    note: '100 batches, each moves 5 random rows of a 1000-row keyed list',
    setup: () => app().append(h('div', { id: 'l' }, rows(1000))),
    steps: (() => {
      const rnd = mulberry32(7)
      return repeat(100, () => {
        const l = $('#l')
        for (let k = 0; k < 5; k++) {
          const a = l.children[Math.floor(rnd() * 1000)]
          const b = l.children[Math.floor(rnd() * 1000)]
          l.insertBefore(a, b)
        }
      })
    })(),
  },
  p_big_remove: {
    kind: 'perf',
    note: '5x: add a 20k-node subtree, then remove it',
    steps: repeat(10, (i) => {
      if (i % 2 === 0) void app().append(h("div", { id: "big" }, rows(1700)))
      else $('#big').remove()
    }),
  },
  p_attr_storm: {
    kind: 'perf',
    setup: () => app().append(rows(2000)),
    steps: repeat(50, (i) => {
      const els = app().children
      for (let k = 0; k < els.length; k++) els[k].setAttribute('class', `row s${(i + k) % 5}`)
    }),
  },
  p_text_storm: {
    kind: 'perf',
    setup: () => app().append(rows(2000)),
    steps: repeat(50, (i) => {
      const els = app().querySelectorAll('.value')
      for (let k = 0; k < els.length; k++) (els[k].firstChild as Text).data = String(i * k)
    }),
  },
  p_shadow_many: {
    kind: 'perf',
    note: '15 batches x 200 web components with shadow roots',
    steps: repeat(15, (i) => {
      const f = document.createDocumentFragment()
      for (let k = 0; k < 200; k++) {
        const e = h('x-cmp', {})
        e.attachShadow({ mode: 'open' }).append(h('span', {}, `c${i}-${k}`))
        f.append(e)
      }
      app().append(f)
    }),
  },

  // ---- memory ----------------------------------------------------------------------
  m_iframe_churn: {
    kind: 'memory',
    settle: 350,
    note: '20x: add a same-origin iframe with ~2k nodes, then remove it',
    steps: repeat(40, async (i) => {
      if (i % 2 === 0) {
        const body = Array.from({ length: 150 }, (_, k) => `<div class="r"><span>${k}</span><a href="#">x</a><b>y</b></div>`).join('')
        const f = h('iframe', { id: 'mf', srcdoc: body }) as HTMLIFrameElement
        const l = waitLoad(f)
        app().append(f)
        await l
      } else $('#mf').remove()
    }),
  },
  m_subtree_churn: {
    kind: 'memory',
    note: '10x: add a 10k-node subtree, then remove it',
    steps: repeat(20, (i) => {
      if (i % 2 === 0) app().append(h('div', { id: 'big' }, rows(850)))
      else $('#big').remove()
    }),
  },
  m_shadow_churn: {
    kind: 'memory',
    note: '10x: add 300 shadow-root components, then remove them',
    steps: repeat(20, (i) => {
      if (i % 2 === 0) {
        const w = h('div', { id: 'w' })
        for (let k = 0; k < 300; k++) {
          const e = h('x-cmp', {})
          e.attachShadow({ mode: 'open' }).append(h('span', {}, `c${k}`), h('b', {}, 'x'))
          w.append(e)
        }
        app().append(w)
      } else $('#w').remove()
    }),
  },
}
