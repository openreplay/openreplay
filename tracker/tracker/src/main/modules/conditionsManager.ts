import Message from '../../common/messages.gen.js'
import App, { StartOptions } from '../app/index.js'

export default class ConditionsManager {
  hasStarted = false

  constructor(
    private readonly app: App,
    private readonly startParams: StartOptions,
  ) {}

  trigger() {
    try {
      void this.app.start(this.startParams)
    } catch (e) {
      this.app.debug.error(e)
    }
  }

  processEvent(message: Message) {
    if (!this.hasStarted) {
      this.hasStarted = true
      this.trigger()
    }
  }
}
