import SharedProperties from './sharedProperties.js'
import type { StorageLike } from './sharedProperties.js'
import Events from './events.js'
import People from './people.js'
import Batcher from './batcher.js'

const STORAGEKEY = '__or_sdk_analytics_token'

export default class Analytics {
  public readonly events: Events
  public readonly sharedProperties: SharedProperties
  public readonly people: People
  private readonly batcher: Batcher
  private token: string | null = null
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
  constructor(
    private readonly projectKey: string,
    private readonly backendUrl: string,
    private readonly localStorage: StorageLike,
    private readonly sessionStorage: StorageLike,
    private readonly getToken: () => string,
    private readonly getTimestamp: () => number,
    private readonly setUserId: (user_id: string) => void,
    private readonly standalone = false,
  ) {
    this.token = this.sessionStorage.getItem(STORAGEKEY)
    this.sharedProperties = new SharedProperties(this.localStorage, this.sessionStorage)
    this.batcher = new Batcher(this.backendUrl, this._getToken, this.init)
    this.events = new Events(this.sharedProperties, this._getTimestamp, this.batcher)
    this.people = new People(
      this.sharedProperties,
      this._getTimestamp,
      this.setUserId,
      this.batcher,
    )
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
      return
    }

    const defaultFields = this.sharedProperties.all
    const apiEdp = '/api/analytics/start'
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
