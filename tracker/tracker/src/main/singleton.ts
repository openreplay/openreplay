import Tracker, { App, Options } from './index.js'
import { IN_BROWSER } from './utils.js'
import type { StartOptions, StartPromiseReturn } from './app/index.js'

class TrackerSingleton {
  private instance: Tracker | null = null
  private isConfigured = false

  /**
   * Call this method once to create tracker configuration
   * @param options {Object} Check available options:
   * https://docs.openreplay.com/en/sdk/constructor/#initialization-options
   */
  configure(options: Partial<Options>): void {
    if (!IN_BROWSER) {
      return
    }
    if (this.isConfigured) {
      console.warn(
        'OpenReplay: Tracker is already configured. You should only call configure once.',
      )
      return
    }

    if (!options.projectKey) {
      console.error('OpenReplay: Missing required projectKey option')
      return
    }

    this.instance = new Tracker(options)
    this.isConfigured = true
  }

  get options(): Partial<Options> | null {
    return this.instance?.options || null
  }

  start(startOpts?: Partial<StartOptions>): Promise<StartPromiseReturn> {
    if (!IN_BROWSER) {
      return Promise.resolve({ success: false, reason: 'Not in browser environment' })
    }

    if (!this.ensureConfigured() || !this.instance) {
      return Promise.resolve({ success: false, reason: 'Tracker not configured' })
    }

    // Tracker.start() rejects (instead of resolving {success:false}) when the
    // underlying app failed to initialise (non-https, missing api, doNotTrack,
    // already initialised...). Normalize so callers always get {success, reason}.
    return this.instance.start(startOpts).catch((reason) => ({
      success: false,
      reason: typeof reason === 'string' ? reason : String(reason),
    }))
  }

  /**
   * Stop the session and return sessionHash
   * (which can be used to stitch sessions together)
   * */
  stop(): string | undefined {
    return this.t?.stop()
  }

  setUserID = (id: string): void => {
    this.t?.setUserID(id)
  }

  get analytics() {
    return this.instance?.analytics ?? null
  }

  identify = this.setUserID
  track = (
    eventName: string,
    properties?: Record<string, any>,
    options?: { send_immediately: boolean },
  ): void => {
    this.t?.analytics?.track(eventName, properties, options)
  }

  /**
   * Set metadata for the current session
   *
   * Make sure that its configured in project settings first
   *
   * Read more: https://docs.openreplay.com/en/installation/metadata/
   */
  setMetadata(key: string, value: string): void {
    this.t?.setMetadata(key, value)
  }

  /**
   * Returns full URL for the current session
   */
  getSessionURL(options?: { withCurrentTime?: boolean }): string | undefined {
    return this.t?.getSessionURL(options)
  }

  getSessionID(): string | null | undefined {
    const t = this.t
    return t ? t.getSessionID() : null
  }

  getSessionToken(): string | null | undefined {
    const t = this.t
    return t ? t.getSessionToken() : null
  }

  event(key: string, payload: any = null, issue = false): void {
    this.t?.event(key, payload, issue)
  }

  issue(key: string, payload: any = null): void {
    this.t?.issue(key, payload)
  }

  handleError(
    e: Error | ErrorEvent | PromiseRejectionEvent,
    metadata: Record<string, any> = {},
  ): void {
    this.t?.handleError(e, metadata)
  }

  restartCanvasTracking(): void {
    this.t?.restartCanvasTracking()
  }

  /**
   * Set the anonymous user ID
   */
  setUserAnonymousID(id: string): void {
    this.t?.setUserAnonymousID(id)
  }

  /**
   * Check if the tracker is active
   */
  isActive(): boolean {
    const t = this.t
    return t ? t.isActive() : false
  }

  /**
   * Get the underlying Tracker instance
   *
   * Use when you need access to methods not exposed by the singleton
   */
  getInstance(): Tracker | null {
    if (!this.ensureConfigured() || !IN_BROWSER) {
      return null
    }

    return this.instance
  }

  /**
   * start buffering messages without starting the actual session, which gives user 30 seconds to "activate" and record
   * session by calling start() on conditional trigger and we will then send buffered batch, so it won't get lost
   * */
  coldStart(startOpts?: Partial<StartOptions>, conditional?: boolean) {
    return this.t?.coldStart(startOpts, conditional)
  }

  /**
   * Creates a named hook that expects event name, data string and msg direction (up/down),
   * it will skip any message bigger than 5 mb or event name bigger than 255 symbols
   * msg direction is "down" (incoming) by default
   *
   * @returns {(msgType: string, data: string, dir: 'up' | 'down') => void}
   * */
  trackWs(
    channelName: string,
  ): ((msgType: string, data: string, dir: 'up' | 'down') => void) | undefined {
    const t = this.t
    return t ? t.trackWs(channelName) : () => {} // Return no-op function
  }

  /** the instance, or null (with a warning if not configured yet) */
  private get t(): Tracker | null {
    return IN_BROWSER && this.ensureConfigured() ? this.instance : null
  }

  private ensureConfigured() {
    if (!this.isConfigured && IN_BROWSER) {
      console.warn(
        'OpenReplay: Tracker must be configured before use. Call tracker.configure({projectKey: "your-project-key"}) first.',
      )
      return false
    }
    return true
  }

  use<T>(fn: (app: App | null, options?: Partial<Options>) => T): T {
    const t = this.t
    return t ? t.use(fn) : fn(null)
  }

  /**
   * Starts offline session recording. Keep in mind that only user device time will be used for timestamps.
   * (no backend delay sync)
   *
   * @param {Object} startOpts - options for session start, same as .start()
   * @param {Function} onSessionSent - callback that will be called once session is fully sent
   * @returns methods to manipulate buffer:
   *
   * saveBuffer - to save it in localStorage
   *
   * getBuffer - returns current buffer
   *
   * setBuffer - replaces current buffer with given
   * */
  startOfflineRecording(...args: Parameters<Tracker['startOfflineRecording']>) {
    return this.t?.startOfflineRecording(...args)
  }

  /**
   * Uploads the stored session buffer to backend
   * @returns promise that resolves once messages are loaded, it has to be awaited
   * so the session can be uploaded properly
   * @resolve - if messages were loaded into service worker successfully
   * @reject {string} - error message
   * */
  uploadOfflineRecording() {
    return this.t?.uploadOfflineRecording()
  }

  forceFlushBatch() {
    return this.t?.forceFlushBatch()
  }

  getSessionInfo() {
    const t = this.t
    return t ? t.getSessionInfo() : null
  }

  getTabId() {
    const t = this.t
    return t ? t.getTabId() : null
  }

  /**
   * Re-evaluates sanitization against the current DOM and re-emits whatever
   * changed, updating already-recorded nodes mid-session. Call after toggling
   * `data-openreplay-*` attributes or after changing whatever your `domSanitizer`
   * keys on (class/id/etc).
   *
   * @param el - the highest node you changed; omit to re-scan the whole document.
   * */
  resanitize(el?: Element) {
    return this.t?.resanitize(el)
  }

  /**
   * Returns the sanitization level the tracker currently has for a node
   * (0 = Plain, 1 = Obscured, 2 = Hidden), or undefined if it isn't tracked.
   * */
  checkSanitization(el: Node) {
    return this.t?.checkSanitization(el)
  }

  incident(options: { label?: string; startTime: number; endTime?: number }): void {
    this.t?.incident(options)
  }

  /**
   * Use custom token for analytics events without session recording
   * */
  setAnalyticsToken(token: string): void {
    this.t?.setAnalyticsToken(token)
  }

  getAnalyticsToken(): string | undefined {
    return this.t?.getAnalyticsToken()
  }
}

const tracker = new TrackerSingleton()

export default tracker
