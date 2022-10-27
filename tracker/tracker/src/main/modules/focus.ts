import type App from '../app/index.js'
import { isNode } from '../app/guards.js'
import { SetNodeFocus } from "../app/messages.gen";

export default function (app: App): void {
    app.attachEventListener(document, 'focus', (e: Event): void => {
        if (!isNode(e.target)) {
            return
        }
        const id = app.nodes.getID(e.target)
        if (id !== undefined) {
            app.send(SetNodeFocus(id))
        }
    })

    app.attachEventListener(document, 'blur', (): void => {
        // get current focus element, send SetFocus(-1) if blur == null
    })

    app.attachStartCallback(() => {
        // get current focus, send SetNodeFocus if blur != null
    })
}
