import SharedProperties from './sharedProperties.js'

export default class Events {
  constructor(private readonly sharedProperties: SharedProperties, private readonly token: string) {}

  sendEvent(eventName: string) {}
}