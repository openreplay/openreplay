import Batcher from './batcher.js';
import ConstantProperties from './constantProperties.js'
import { isObject } from './utils.js'
import { createEvent, categories } from './types.js';

const maxProperties = 100;
const maxPropLength = 100;

const reservedProps = [
  'properties',
  'token',
  'timestamp',
];

export default class Events {
  ownProperties: Record<string, any> = {}

  constructor(
    private readonly constantProperties: ConstantProperties,
    private readonly getTimestamp: () => number,
    private readonly batcher: Batcher,
  ) {
    this.ownProperties = this.constantProperties.getSuperProperties();
  }

  /**
   * Add event to batch with option to send it immediately,
   * properties are optional and will not be saved as super prop
   * */
  sendEvent = (
    eventName: string,
    properties?: Record<string, any>,
    options?: { send_immediately: boolean },
  ) => {
    // add properties
    const eventProps = {}
    if (properties) {
      if (!isObject(properties)) {
        throw new Error('Properties must be an object')
      }
      Object.entries(properties).forEach(([key, value]) => {
        if (!this.constantProperties.defaultPropertyKeys.includes(key)) {
          eventProps[key] = value
        }
      })
    }
    const eventPayload = {
      name: eventName,
      properties: { ...this.ownProperties, ...eventProps },
    }
    const event = createEvent(
      categories.events,
      undefined,
      this.getTimestamp(),
      eventPayload,
    )
    if (options?.send_immediately) {
      void this.batcher.sendImmediately(event);
    } else {
      this.batcher.addEvent(event);
    }
  }

  /**
   * creates super property for all events
   * */
  setProperty = (nameOrProperties: Record<string, any> | string, value?: any) => {
    let changed = false;
    if (isObject(nameOrProperties)) {
      Object.entries(nameOrProperties).forEach(([key, val]) => {
        if (!this.constantProperties.defaultPropertyKeys.includes(key)) {
          this.ownProperties[key] = val
          changed = true;
        }
      })
    }
    if (typeof nameOrProperties === 'string' && value !== undefined) {
      if (!this.constantProperties.defaultPropertyKeys.includes(nameOrProperties)) {
        this.ownProperties[nameOrProperties] = value
        changed = true;
      }
    }

    if (changed) {
      this.constantProperties.saveSuperProperties(this.ownProperties);
    }
  }

  /**
   * set super property only if it doesn't exist yet
   * */
  setPropertiesOnce = (nameOrProperties: Record<string, any> | string, value?: any) => {
    let changed = false;
    if (isObject(nameOrProperties)) {
      Object.entries(nameOrProperties).forEach(([key, val]) => {
        if (!this.ownProperties[key] && !reservedProps.includes(key)) {
          this.ownProperties[key] = val
          changed = true;
        }
      })
    }
    if (typeof nameOrProperties === 'string' && value !== undefined) {
      if (!this.ownProperties[nameOrProperties] && !reservedProps.includes(nameOrProperties)) {
        this.ownProperties[nameOrProperties] = value
        changed = true;
      }
    }

    if (changed) {
      this.constantProperties.saveSuperProperties(this.ownProperties);
    }
  }

  /**
   * removes properties from list of super properties
   * */
  unsetProperties = (properties: string | string[]) => {
    let changed = false;
    if (Array.isArray(properties)) {
      properties.forEach((key) => {
        if (this.ownProperties[key] && !reservedProps.includes(key)) {
          delete this.ownProperties[key]
          changed = true;
        }
      })
    } else if (this.ownProperties[properties] && !reservedProps.includes(properties)) {
      delete this.ownProperties[properties]
      changed = true;
    }
    if (changed) {
      this.constantProperties.saveSuperProperties(this.ownProperties);
    }
  }

  /** clears all super properties */
  reset = () => {
    this.ownProperties = {}
    this.constantProperties.clearSuperProperties();
  }

  /** mixpanel compatibility */
  public register = this.setProperty
  public register_once = this.setPropertiesOnce
  public unregister = this.unsetProperties
  public track = this.sendEvent
}
