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

    if (!this.ensureConfigured()) {
      return Promise.resolve({ success: false, reason: 'Tracker not configured' })
    }

    return (
      this.instance?.start(startOpts) ||
      Promise.resolve({ success: false, reason: 'Tracker not initialized' })
    )
  }

  /**
   * Stop the session and return sessionHash
   * (which can be used to stitch sessions together)
   * */
  stop(): string | undefined {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    return this.instance.stop()
  }

  setUserID(id: string): void {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    this.instance.setUserID(id)
  }

  /**
   * Set metadata for the current session
   *
   * Make sure that its configured in project settings first
   *
   * Read more: https://docs.openreplay.com/en/installation/metadata/
   */
  setMetadata(key: string, value: string): void {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    this.instance.setMetadata(key, value)
  }

  /**
   * Returns full URL for the current session
   */
  getSessionURL(options?: { withCurrentTime?: boolean }): string | undefined {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    return this.instance.getSessionURL(options)
  }

  getSessionID(): string | null | undefined {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return null
    }

    return this.instance.getSessionID()
  }

  getSessionToken(): string | null | undefined {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return null
    }

    return this.instance.getSessionToken()
  }

  event(key: string, payload: any = null, issue = false): void {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    this.instance.event(key, payload, issue)
  }

  issue(key: string, payload: any = null): void {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    this.instance.issue(key, payload)
  }

  handleError(
    e: Error | ErrorEvent | PromiseRejectionEvent,
    metadata: Record<string, any> = {},
  ): void {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    this.instance.handleError(e, metadata)
  }

  isFlagEnabled(flagName: string): boolean {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return false
    }

    return this.instance.isFlagEnabled(flagName)
  }

  onFlagsLoad(...args: Parameters<Tracker['onFlagsLoad']>): void {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    this.instance.onFlagsLoad(...args)
  }

  clearPersistFlags(): void {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    this.instance.clearPersistFlags()
  }

  reloadFlags(): Promise<void> | undefined {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    return this.instance.reloadFlags()
  }

  getFeatureFlag(flagName: string) {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    return this.instance.getFeatureFlag(flagName)
  }

  getAllFeatureFlags() {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    return this.instance.getAllFeatureFlags()
  }

  restartCanvasTracking(): void {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    this.instance.restartCanvasTracking()
  }

  /**
   * Set the anonymous user ID
   */
  setUserAnonymousID(id: string): void {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    this.instance.setUserAnonymousID(id)
  }

  /**
   * Check if the tracker is active
   */
  isActive(): boolean {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return false
    }

    return this.instance.isActive()
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
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    return this.instance.coldStart(startOpts, conditional)
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
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return () => {} // Return no-op function
    }

    return this.instance.trackWs(channelName)
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
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return fn(null)
    }

    return this.instance.use(fn)
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
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    return this.instance.startOfflineRecording(...args)
  }

  /**
   * Uploads the stored session buffer to backend
   * @returns promise that resolves once messages are loaded, it has to be awaited
   * so the session can be uploaded properly
   * @resolve - if messages were loaded into service worker successfully
   * @reject {string} - error message
   * */
  uploadOfflineRecording() {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    return this.instance.uploadOfflineRecording()
  }

  forceFlushBatch() {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return
    }

    return this.instance.forceFlushBatch()
  }

  getSessionInfo() {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return null
    }

    return this.instance.getSessionInfo()
  }

  getTabId() {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return null
    }

    return this.instance.getTabId()
  }

  getUxId() {
    if (!IN_BROWSER || !this.ensureConfigured() || !this.instance) {
      return null
    }

    return this.instance.getUxId()
  }
}

const tracker = new TrackerSingleton()

export default tracker
