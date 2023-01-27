import type App from '../app/index.js'
import { isDocument } from '../app/guards.js'
import { LoadFontFace } from '../app/messages.gen.js'

type FFData = [string, string, string]

export default function (app: App) {
  if (!window.FontFace) {
    return
  }

  const docFonts: Map<Document, FFData[]> = new Map()

  const patchWindow = (wnd: typeof globalThis) => {
    class FontFaceInterceptor extends wnd.FontFace {
      constructor(...args: ConstructorParameters<typeof FontFace>) {
        //maybe do this on load(). In this case check if the document.fonts.load(...) function calls the font's load()
        if (typeof args[1] === 'string') {
          let desc = ''
          if (args[2]) {
            app.safe(() => {
              desc = JSON.stringify(args[2])
            })
          }

          const ffData: FFData = [args[0], args[1], desc]
          const ffDataArr = docFonts.get(wnd.document) || []
          ffDataArr.push(ffData)
          docFonts.set(wnd.document, ffDataArr)

          const parentID = wnd === window ? 0 : app.nodes.getID(wnd.document)
          if (parentID === undefined) {
            return
          }

          if (app.active()) {
            app.send(LoadFontFace(parentID, ...ffData))
          }
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
