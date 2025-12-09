import ConstantProperties from './constantProperties.js'
import type { StorageLike } from './constantProperties.js'
import Events from './events.js'
import People from './people.js'
import Batcher from './batcher.js'

const STORAGEKEY = '__or_sdk_analytics_token'

interface Options {
  ingestPoint: string
  projectKey: string
  /** Storage class for persistent data */
  localStorage?: StorageLike
  /** Storage class for data on a per-session basis */
  sessionStorage?: StorageLike
  /** Used to request a custom session token when in not-standalone mode */
  getToken?: () => string
  /** Used to get current timestamp when not in standalone mode */
  getTimestamp?: () => number
  /** Callback for people.identify */
  setUserId?: (user_id: string) => void
  /** automatically set when used inside openreplay tracker */
  notStandalone?: boolean
}

export default class Analytics {
  public readonly events: Events
  public readonly constantProperties: ConstantProperties
  public readonly people: People

  private token: string | null = null
  private readonly batcher: Batcher
  private readonly backendUrl: string
  private readonly projectKey: string
  private readonly localStorage: StorageLike
  private readonly sessionStorage: StorageLike
  private readonly getToken: () => string
  private readonly getTimestamp: () => number
  private readonly setUserId: (user_id: string) => void
  private readonly standalone: boolean = false
  /**
   * @param localStorage Class or Object that implements Storage-like interface that stores
   * values persistently like window.localStorage or any other file-based storage
   *
   * @param sessionStorage Class or Object that implements Storage-like interface that stores values
   * on per-session basis like window.sessionStorage or any other in-memory storage
   *
   * @param getToken Function that returns token to bind events to a session
   *
   * @param getTimestamp returns current timestamp
   *
   * @param setUserId callback for people.identify
   *
   * @param standalone if true, analytics will manage its own token (instead of using with openreplay tracker session)
   * */
  constructor(options: Options) {
    this.sessionStorage = options.sessionStorage || sessionStorage
    this.localStorage = options.localStorage || localStorage
    this.backendUrl = options.ingestPoint
    this.projectKey = options.projectKey
    this.getToken = options.getToken || (() => '')
    this.getTimestamp = options.getTimestamp || (() => Date.now())
    this.setUserId = options.setUserId || (() => {})
    this.standalone = !options.notStandalone

    this.token = this.sessionStorage.getItem(STORAGEKEY)
    this.constantProperties = new ConstantProperties(this.localStorage, this.sessionStorage)
    this.batcher = new Batcher(
      this.backendUrl,
      this._getToken,
      this.init,
    )
    this.events = new Events(this.constantProperties, this._getTimestamp, this.batcher)
    this.people = new People(
      this.constantProperties,
      this._getTimestamp,
      this.setUserId,
      this.batcher,
    )

    if (options.notStandalone) {
      this.init()
    }
  }

  _getToken = () => {
    if (this.standalone) {
      return this.token
    }
    return this.getToken()
  }

  _getTimestamp = () => {
    if (this.standalone) {
      return Date.now()
    }
    return this.getTimestamp()
  }

  init = async () => {
    if (!this.standalone) {
      this.batcher.startAutosend()
      return
    } else {
      const defaultFields = this.constantProperties.all
      const apiEdp = '/v1/sdk/start'
      const data = {
        projectKey: this.projectKey,
        defaultFields,
      }
      const resp = await fetch(apiEdp, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`)
      }
      const result = await resp.json()
      if (result.token) {
        this.token = result.token
        this.sessionStorage.setItem(STORAGEKEY, result.token)
      } else {
        throw new Error('No token received from server')
      }
    }
  }

  reset = () => {
    this.people.reset(true)
    this.events.reset()
    this.batcher.stop()
    if (this.standalone) {
      this.token = null
      this.sessionStorage.setItem(STORAGEKEY, '')
    }
  }
}
