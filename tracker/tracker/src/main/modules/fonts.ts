import type App from '../app/index.js'
import { isDocument } from '../app/guards.js'
import { LoadFontFace } from '../app/messages.gen.js'

type FFData = [string, string, string]

// the player builds the FontFace in its own document, so relative sources must be resolved here
function absoluteSources(source: string, base: string): string {
  return source.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (match, _q, url: string) => {
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

  const docFonts: WeakMap<Document, FFData[]> = new WeakMap()

  const patchWindow = (wnd: typeof globalThis) => {
    // @ts-ignore
    class FontFaceInterceptor extends wnd.FontFace {
      constructor(...args: ConstructorParameters<typeof FontFace>) {
        //maybe do this on load(). In this case check if the document.fonts.load(...) function calls the font's load()
        if (typeof args[1] === 'string') {
          app.safe(() => {
            let desc = ''
            if (args[2]) {
              app.safe(() => {
                desc = JSON.stringify(args[2])
              })()
            }

            const ffData: FFData = [args[0], absoluteSources(args[1] as string, wnd.document.baseURI), desc]
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

      ffDataArr.forEach((ffData) => {
        app.send(LoadFontFace(parentID, ...ffData))
      })
    }),
  )
}
