import Batcher from './batcher.js'
import SharedProperties from './sharedProperties.js'
import { isObject } from './utils.js'

export default class People {
  ownProperties: Record<string, any> = {}

  constructor(
    private readonly sharedProperties: SharedProperties,
    private readonly getTimestamp: () => number,
    private readonly onId: (user_id: string) => void,
    private readonly batcher: Batcher,
  ) {}

  identify = (user_id: string, options?: { fromTracker: boolean }) => {
    this.sharedProperties.setUserId(user_id)
    if (!options?.fromTracker) {
      this.onId(user_id)
    }
    // TODO: fetch endpoint when it will be here
  }

  // add "hard" flag to force generate device id as well ?
  reset = () => {
    this.sharedProperties.resetUserId()
    this.ownProperties = {}
  }

  get user_id() {
    return this.sharedProperties.user_id
  }

  // TODO: what exactly we're removing here besides properties and id?
  deleteUser = () => {
    this.sharedProperties.setUserId(null)
    this.ownProperties = {}

    // TODO: fetch endpoint when it will be here
  }

  /**
   * set ownProperties, overwriting entire object
   *
   * TODO: exported as people.set
   * */
  setProperties = (properties: Record<string, any>) => {
    if (!isObject(properties)) {
      throw new Error('Properties must be an object')
    }
    Object.entries(properties).forEach(([key, value]) => {
      if (!this.sharedProperties.defaultPropertyKeys.includes(key)) {
        this.ownProperties[key] = value
      }
    })
  }

  /**
   * Set property if it doesn't exist yet
   *
   * TODO: exported as people.set_once
   * */
  setPropertiesOnce = (properties: Record<string, any>) => {
    if (!isObject(properties)) {
      throw new Error('Properties must be an object')
    }
    Object.entries(properties).forEach(([key, value]) => {
      if (!this.sharedProperties.defaultPropertyKeys.includes(key) && !this.ownProperties[key]) {
        this.ownProperties[key] = value
      }
    })
  }

  /**
   * Add value to property (will turn string prop into array)
   *
   * TODO: exported as people.append
   * */
  appendValues = (key: string, value: string | number) => {
    if (!this.sharedProperties.defaultPropertyKeys.includes(key) && this.ownProperties[key]) {
      if (Array.isArray(this.ownProperties[key])) {
        this.ownProperties[key].push(value)
      } else {
        this.ownProperties[key] = [this.ownProperties[key], value]
      }
    }
  }

  /**
   * Add unique values to property (will turn string prop into array)
   *
   * TODO: exported as people.union
   * */
  appendUniqueValues = (key: string, value: string | number) => {
    if (!this.ownProperties[key]) return
    if (Array.isArray(this.ownProperties[key])) {
      if (!this.ownProperties[key].includes(value)) {
        this.appendValues(key, value)
      }
    } else if (this.ownProperties[key] !== value) {
      this.appendValues(key, value)
    }
  }

  /**
   * Adds value (incl. negative) to existing numerical property
   *
   * TODO: exported as people.increment
   * */
  increment = (key: string, value: number) => {
    if (!this.sharedProperties.defaultPropertyKeys.includes(key) && typeof this.ownProperties[key] === 'number') {
      this.ownProperties[key] += value
    }
  }
}
