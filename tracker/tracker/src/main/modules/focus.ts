import type App from '../app/index.js'
import { isNode } from '../app/guards.js'
import { SetNodeFocus } from "../app/messages.gen";

export default function (app: App): void {
    function findFocusedElement(): Element | null {
        let focused_element = null
        if (
            document.hasFocus() &&
            document.activeElement !== document.body &&
            document.activeElement !== document.documentElement
        ) {
            focused_element = document.activeElement
        }
        return focused_element
    }

    function sendSetNodeFocus(n: Node) {
        const id = app.nodes.getID(n)
        if (id !== undefined) {
            app.send(SetNodeFocus(id))
        }
    }

    app.attachEventListener(document, 'focus', (e: Event): void => {
        if (isNode(e.target)) {
            sendSetNodeFocus(e.target)
        }
    })

    app.attachEventListener(document, 'blur', (): void => {
        if (findFocusedElement() === null) {
            app.send(SetNodeFocus(-1))
        }
    })

    app.attachStartCallback(() => {
        let elem = findFocusedElement()
        if (elem !== null) {
            sendSetNodeFocus(elem)
        }
    })
}
