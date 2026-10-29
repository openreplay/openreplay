import Sanitizer from '@tracker/main/app/sanitizer.js'
import AttributeSender from '@tracker/main/modules/attributeSender.js'

export interface Impl {
  start(): void
  stop(): void
  getID(n: Node): number | undefined
  /** nodes the tracker still holds on to, for memory scenarios */
  trackedNodes(): number | null
}

export type ImplFactory = (send: (m: any) => void) => Impl

export const OBSERVER_OPTIONS = {
  disableThrottling: true,
  captureIFrames: true,
  inlineCss: 0,
  disableSprites: true,
}

/** The part of App the DOM core touches, wired like App does it (dictionary on). */
export function fakeApp(send: (m: any) => void) {
  const app: any = {
    options: { forceNgOff: true },
    safe: (f: any) => f,
    send,
    getBaseHref: () => document.baseURI,
    callResanitizeCallbacks: () => {},
    debug: { log() {}, warn() {}, info() {}, error() {} },
  }
  app.sanitizer = new Sanitizer({ app, options: { obscureTextEmails: true } })
  app.attributeSender = new AttributeSender({ app, isDictDisabled: false })
  return app
}
