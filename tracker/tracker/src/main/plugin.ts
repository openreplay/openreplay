import type Message from './app/messages.gen.js'
import type App from './app/index.js'
//import { PluginPayload } from './app/messages.gen.js'

// TODO: sendState(name, action, state) for state plugins;

export interface PluginDescription {
  name: string
  version: string
  requiredTrackerVersion: string
  onStart: () => void
  onStop: () => void
  onNode: (node: Node, id: number) => void
  onContext: (context: typeof globalThis) => void
}

type PluginWrapper = (app: AppForPlugins) => Partial<PluginDescription>

interface AppForPlugins {
  sendMessage(m: Message): void
  send(name: string, payload: Object): void
  // ...
}

export function applyPlugin<T>(app: App, pluginWrapper: PluginWrapper) {
  function send(name: string, second?: Object) {
    const paload = app.safe(() => JSON.stringify(second))() || ''
    // app.send(PluginPayload(name, payload)) // send PluginPayload message
    return
  }
  function sendMessage(msg: Message) {
    app.send(msg)
  }
  const plugin = pluginWrapper({
    send,
    sendMessage,
    //...
  })

  if (plugin.onStart) {
    app.attachStartCallback(plugin.onStart)
  }
  if (plugin.onStop) {
    app.attachStopCallback(plugin.onStop)
  }
  if (plugin.onNode) {
    app.nodes.attachNodeCallback((node) => {
      const id = app.nodes.getID(node)
      if (id !== undefined) {
        plugin.onNode(node, id)
      }
    })
  }

  return plugin
}
