import TopObserver from '../../../../tracker/src/main/app/observer/top_observer.js'
import Nodes from '../../../../tracker/src/main/app/nodes/index.js'
import Sanitizer from '../../../../tracker/src/main/app/sanitizer.js'
import AttributeSender from '../../../../tracker/src/main/modules/attributeSender.js'
import NextObserver from '../next/NextObserver.js'
import TrackerNextObserver from '../../../../tracker/src/main/app/observer/next_observer.js'
import NextNodes from '../../../../tracker/src/main/app/nodes/next_nodes.js'
import { GenDictionary } from '../next/GenDictionary.js'

export interface Impl {
  start(): void
  stop(): void
  getID(n: Node): number | undefined
}

const baseHref = () => location.origin + '/'

/** The current core exactly as App wires it (maintainer on, dict on, throttling off). */
export function makeCurrent(send: (m: any) => void, genDict = false): Impl & { nodes: Nodes } {
  const app: any = {
    options: { forceNgOff: true },
    safe: (f: any) => f,
    send,
    getBaseHref: baseHref,
    callResanitizeCallbacks: () => {},
    debug: { log() {}, warn() {}, info() {}, error() {} },
  }
  app.nodes = new Nodes({ node_id: '__openreplay_id', forceNgOff: true })
  app.sanitizer = new Sanitizer({ app, options: { obscureTextEmails: true } })
  app.attributeSender = new AttributeSender({ app, isDictDisabled: false })
  if (genDict) (app.attributeSender as any).dict = new GenDictionary()
  const obs = new TopObserver({
    app,
    options: { disableThrottling: true, captureIFrames: true, inlineCss: 0, disableSprites: true },
  })
  return {
    nodes: app.nodes,
    start: () => obs.observe(),
    stop: () => {
      obs.disconnect()
      app.nodes.clear()
    },
    getID: (n) => app.nodes.getID(n),
  }
}

export function makeNext(send: (m: any) => void, store: 'weakmap' | 'symbol', genDict = false): Impl & { obs: NextObserver } {
  const app: any = { send }
  const attributeSender = new AttributeSender({ app, isDictDisabled: false })
  if (genDict) (attributeSender as any).dict = new GenDictionary()
  const obs = new NextObserver(
    { send, sendSetAttribute: attributeSender.sendSetAttribute, getBaseHref: baseHref },
    { store, captureIFrames: true, obscureTextEmails: true },
  )
  return {
    obs,
    start: () => obs.observe(),
    stop: () => obs.disconnect(),
    getID: (n) => obs.getID(n),
  }
}

/** The integrated next core (tracker/src/main/app/observer/next_observer.ts), wired like App does. */
export function makeTrackerNext(send: (m: any) => void, genDict = false): Impl & { nodes: NextNodes } {
  const app: any = {
    options: { forceNgOff: true },
    safe: (f: any) => f,
    send,
    getBaseHref: baseHref,
    callResanitizeCallbacks: () => {},
    debug: { log() {}, warn() {}, info() {}, error() {} },
  }
  app.sanitizer = new Sanitizer({ app, options: { obscureTextEmails: true } })
  app.nodes = new NextNodes({
    forceNgOff: true,
    onUnregister: (id: number) => app.sanitizer.setLevel(id, 0),
  })
  app.attributeSender = new AttributeSender({ app, isDictDisabled: false })
  if (genDict) (app.attributeSender as any).dict = new GenDictionary()
  const obs = new TrackerNextObserver({
    app,
    options: { disableThrottling: true, captureIFrames: true, inlineCss: 0, disableSprites: true },
  })
  return {
    nodes: app.nodes,
    start: () => obs.observe(),
    stop: () => {
      obs.disconnect()
      app.nodes.clear()
    },
    getID: (n) => app.nodes.getID(n),
  }
}
