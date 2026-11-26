import ContextPatches from '../app/contextPatches.js'
import { sanitizeCapture } from '../app/captureSanitizer.js'
import type App from '../app/index.js'
import { isDocument } from '../app/guards.js'
import { LoadFontFace } from '../app/messages.gen.js'

type FFData = [string, string, string]

// the player builds the FontFace in its own document, so relative sources must be resolved here
function absoluteSources(source: string, base: string): string {
  // case-insensitive; a quoted url runs to its closing quote, so it may hold parens or the other quote
  return source.replace(/url\(\s*(['"]?)([\s\S]+?)\1\s*\)/gi, (match, _q, url: string) => {
    if (url.startsWith('data:')) return match
    try {
      return `url("${new URL(url, base).href}")`
    } catch (e) {
      return match
    }
  })
}

export default function (app: App) {
  if (!window.FontFace) {
    return
  }

  const sanitise = (data: FFData): FFData | null => {
    const fields = ['family', 'source', 'descriptors'] as const
    const values = data.map((value, index) =>
      index === 2 && value === '' ? value : sanitizeCapture(app.captureSanitizer, {
        kind: 'font',
        field: fields[index],
        value,
        node: null,
      }),
    )
    return values.some((value) => value === null) ? null : (values as FFData)
  }
  let docFonts = new WeakMap<Document, FFData[]>()
  const restoreFonts = new ContextPatches()
  app.attachStopCallback(() => {
    if (!app.isDisposed()) return
    docFonts = new WeakMap()
    restoreFonts.clear()
  })

  const patchWindow = (wnd: typeof globalThis) => {
    if (app.isDisposed() || restoreFonts.has(wnd) || !wnd.FontFace) return
    const FontFace = wnd.FontFace
    // @ts-ignore
    class FontFaceInterceptor extends FontFace {
      constructor(...args: ConstructorParameters<typeof FontFace>) {
        //maybe do this on load(). In this case check if the document.fonts.load(...) function calls the font's load()
        if (!app.isDisposed() && typeof args[1] === 'string') {
          app.safe(() => {
            let desc = ''
            if (args[2]) {
              app.safe(() => {
                desc = JSON.stringify(args[2])
              })()
            }

            const source = absoluteSources(args[1] as string, wnd.document.baseURI)
            const ffData = sanitise([args[0], source, desc])
            if (app.isDisposed() || ffData === null) return
            const ffDataArr = docFonts.get(wnd.document) || []
            ffDataArr.push(ffData)
            docFonts.set(wnd.document, ffDataArr)

            const parentID = wnd === window ? 0 : app.nodes.getID(wnd.document)
            if (parentID !== undefined && app.active()) {
              app.send(LoadFontFace(parentID, ...ffData))
            }
          })()
        }
        super(...args)
      }
    }
    wnd.FontFace = FontFaceInterceptor
    restoreFonts.set(wnd, () => {
      if (wnd.FontFace === FontFaceInterceptor) wnd.FontFace = FontFace
    })
  }
  app.observer.attachContextCallback(patchWindow)
  patchWindow(window)

  app.nodes.attachNodeCallback(
    app.safe((node) => {
      if (!isDocument(node)) {
        return
      }
      const ffDataArr = docFonts.get(node)
      if (!ffDataArr) {
        return
      }

      const parentID = node.defaultView === window ? 0 : app.nodes.getID(node)
      if (parentID === undefined) {
        return
      }

      ffDataArr.forEach((ffData) => app.send(LoadFontFace(parentID, ...ffData)))
    }),
  )
}
