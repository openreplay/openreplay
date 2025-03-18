import SharedProperties from './sharedProperties.js'
import type { StorageLike } from './sharedProperties.js'
import Events from './events.js'
import People from './people.js'

export default class Analytics {
  public readonly events: Events
  public readonly sharedProperties: SharedProperties
  public readonly people: People

  /**
   * @param localStorage Class or Object that implements Storage-like interface that stores
   * values persistently like window.localStorage or any other file-based storage
   *
   * @param sessionStorage Class or Object that implements Storage-like interface that stores values
   * on per-session basis like window.sessionStorage or any other in-memory storage
   *
   * @param getToken Function that returns token to bind events to a se
   * */
  constructor(
    private readonly localStorage: StorageLike,
    private readonly sessionStorage: StorageLike,
    private readonly getToken: () => string,
  ) {
    this.sharedProperties = new SharedProperties(localStorage, sessionStorage)
    this.events = new Events(this.sharedProperties, getToken, Date.now)
    this.people = new People(this.sharedProperties, getToken, Date.now)
  }
}
