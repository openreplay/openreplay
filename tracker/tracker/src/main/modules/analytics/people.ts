import Batcher from './batcher.js'
import ConstantProperties from './constantProperties.js'
import { isObject } from './utils.js'
import { mutationTypes, categories, createEvent } from './types.js'

type Value = string | number

export default class People {
  ownProperties: Record<string, Value | Value[]> = {}

  constructor(
    private readonly constantProperties: ConstantProperties,
    private readonly getTimestamp: () => number,
    private readonly onId: (user_id: string) => void,
    private readonly batcher: Batcher,
  ) {}

  identify = (user_id: string, options?: { fromTracker: boolean }) => {
    if (!user_id) {
      throw new Error('OR SDK: user_id is required for identify')
    }
    // if user exists already, reset properties
    if (this.constantProperties.user_id && this.constantProperties.user_id !== user_id) {
      this.reset();
    }
    this.constantProperties.setUserId(user_id)
    if (!options?.fromTracker) {
      this.onId(user_id)
    }

    const identityEvent = createEvent(categories.people, mutationTypes.identity, this.getTimestamp(), { user_id })
    this.batcher.addEvent(identityEvent)
  }

  reset = (hard?: boolean) => {
    this.constantProperties.resetUserId(hard)
    this.ownProperties = {}
  }

  get user_id() {
    return this.constantProperties.user_id
  }

  // TODO: what exactly we're removing here besides properties and id?
  deleteUser = () => {
    const removedUser = this.constantProperties.user_id
    if (!removedUser) return
    this.constantProperties.setUserId(null)
    this.ownProperties = {}

    const deleteEvent = createEvent(categories.people, mutationTypes.deleteUser, undefined, { user_id: removedUser })
    this.batcher.addEvent(deleteEvent)
  }

  /**
   * set ownProperties, overwriting entire object
   *
   * TODO: exported as people.set
   * */
  setProperties = (properties: Record<string, string | number>) => {
    if (!isObject(properties)) {
      throw new Error('Properties must be an object')
    }
    Object.entries(properties).forEach(([key, value]) => {
      if (!this.constantProperties.defaultPropertyKeys.includes(key)) {
        this.ownProperties[key] = value
      }
    })
    const setEvent = createEvent(categories.people, mutationTypes.setProperty, undefined, { user_id: this.user_id, properties })
    this.batcher.addEvent(setEvent)
  }

  /**
   * Set property if it doesn't exist yet
   *
   * TODO: exported as people.set_once
   * */
  setPropertiesOnce = (properties: Record<string, string | number>) => {
    if (!isObject(properties)) {
      throw new Error('Properties must be an object')
    }
    Object.entries(properties).forEach(([key, value]) => {
      if (!this.constantProperties.defaultPropertyKeys.includes(key) && !this.ownProperties[key]) {
        this.ownProperties[key] = value
      }
    })

    const setEvent = createEvent(categories.people, mutationTypes.setPropertyOnce, undefined, { user_id: this.user_id, properties })
    this.batcher.addEvent(setEvent)
  }

  /**
   * Add value to property (will turn string prop into array)
   *
   * TODO: exported as people.append
   * */
  appendValues = (key: string, value: string | number) => {
    if (!this.constantProperties.defaultPropertyKeys.includes(key) && this.ownProperties[key]) {
      if (Array.isArray(this.ownProperties[key])) {
        this.ownProperties[key].push(value)
      } else {
        this.ownProperties[key] = [this.ownProperties[key], value]
      }
    }

    const appendEvent = createEvent(categories.people, mutationTypes.appendProperty, undefined, {
      properties: { [key]: value },
      user_id: this.user_id,
    })
    this.batcher.addEvent(appendEvent)
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

    const unionEvent = createEvent(categories.people, mutationTypes.appendUniqueProperty, undefined, {
      properties: { [key]: value },
      user_id: this.user_id,
    })
    this.batcher.addEvent(unionEvent)
  }

  /**
   * Adds value (incl. negative) to existing numerical property
   *
   * TODO: exported as people.increment
   * */
  increment = (key: string, value: number) => {
    if (!this.ownProperties[key]) {
      this.ownProperties[key] = 0
    }
    if (this.ownProperties[key] && typeof this.ownProperties[key] !== 'number') {
      throw new Error('OR SDK: Property must be a number to increment')
    }
    // @ts-ignore
    this.ownProperties[key] += value

    const incrementEvent = createEvent(categories.people, mutationTypes.incrementProperty, undefined, {
      user_id: this.user_id,
      properties: { [key]: value },
    })
    this.batcher.addEvent(incrementEvent)
  }

  /** mixpanel compatibility */
  union = this.appendUniqueValues
  set = this.setProperties
  set_once = this.setPropertiesOnce
  append = this.appendValues
  incrementBy = this.increment
}
