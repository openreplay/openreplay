import type App from '../app/index.js'
import { TabChange } from '../app/messages.gen.js'

export default function (app: App): void {
  function changeTab() {
    if (!document.hidden) {
      app.debug.log('Openreplay: tab change to' + app.session.getTabId())
      app.send(TabChange(app.session.getTabId()))
    }
  }

  app.attachStartCallback(() => {
    // just for the good measure in case of restarts caused by assist plugin,
    // to keep latest active tab in state for live player
    changeTab()
  })
  app.attachEventListener(window, 'focus', changeTab as EventListener, false, false)
}
