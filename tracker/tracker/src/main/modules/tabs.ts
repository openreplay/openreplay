import type App from '../app/index.js'
import { TabChange } from '../app/messages.gen.js'

export default function (app: App): void {
  function changeTab() {
    if (!document.hidden) {
      app.debug.log('Openreplay: tab change to' + app.session.getTabId())
      app.send(TabChange(app.session.getTabId()))
    }
  }

  if (document.hidden !== undefined) {
    app.attachEventListener(document, 'visibilitychange', changeTab as EventListener, false, false)
  }
}
