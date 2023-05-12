import type App from '../app/index.js'
import { TabChange } from '../app/messages.gen.js'

export default function (app: App): void {
  function changeTab() {
    console.log(!document.hidden, app.session.getTabId())
    if (!document.hidden) app.safe(() => app.send(TabChange(app.session.getTabId())))
  }

  if (document.hidden !== undefined) {
    app.attachEventListener(document, 'visibilitychange', changeTab as EventListener, false, false)
  }
}
