import { sanitizeCapture } from '../app/captureSanitizer.js'
import type App from '../app/index.js'
import { isDocument } from '../app/guards.js'
import { LoadFontFace } from '../app/messages.gen.js'

type FFData = [string, string, string]

export default function (app: App) {
  if (!window.FontFace) {
    return
  }

  const sanitise = (data: FFData): FFData | null => {
    const fields = ['family', 'source', 'descriptors'] as const
    const values = data.map((value, index) =>
      sanitizeCapture(app.captureSanitizer, {
        kind: 'font',
        field: fields[index],
        value,
        node: null,
      }),
    )
    return values.some((value) => value === null) ? null : (values as FFData)
  }
  const docFonts: Map<Document, FFData[]> = new Map()
  app.attachStopCallback(() => { if (app.isDisposed()) docFonts.clear() })

  const patchWindow = (wnd: typeof globalThis) => {
    // @ts-ignore
    class FontFaceInterceptor extends wnd.FontFace {
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

            const ffData = sanitise([args[0], args[1] as string, desc])
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
        const approved = sanitise(ffData)
        // Revalidate revocation without transforming an already approved tuple a second time.
        if (approved !== null && approved.every((value, i) => value === ffData[i]))
          app.send(LoadFontFace(parentID, ...ffData))
      })
    }),
  )
}
