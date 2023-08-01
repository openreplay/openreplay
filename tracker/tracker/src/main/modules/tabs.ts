import type App from '../app/index.js'
import { TabChange } from '../app/messages.gen.js'

export default function (app: App): void {
  function changeTab() {
    if (!document.hidden) {
      app.debug.log('Openreplay: tab change to' + app.session.getTabId())
      app.send(TabChange(app.session.getTabId()))
    }
  }

  function sendBeacon() {
    const data = {
      tabId: app.session.getTabId(),
      token: app.session.getSessionToken(),
    }
    const headers = {
      'Content-Type': 'application/json',
    }
    // @ts-ignore
    const blob = new Blob([JSON.stringify(data)], headers)

    navigator.sendBeacon(app.options.ingestPoint + '/v1/web/beacon', blob)
  }
  app.attachEventListener(window, 'beforeunload', sendBeacon as EventListener, false, false)

  app.attachEventListener(window, 'focus', changeTab as EventListener, false, false)
}
