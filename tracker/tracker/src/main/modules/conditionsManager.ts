import Message, {
  CustomEvent,
  JSException,
  MouseClick,
  NetworkRequest,
  SetPageLocation,
  Type,
} from '../../common/messages.gen.js'
import App, { StartOptions } from '../app/index.js'

export default class ConditionsManager {
  conditions: Condition[] = []
  hasStarted = false

  constructor(
    private readonly app: App,
    private readonly startParams: StartOptions,
  ) {}

  setConditions(conditions: Condition[]) {
    this.conditions = conditions
  }

  trigger() {
    try {
      void this.app.start(this.startParams)
      this.hasStarted = true
    } catch (e) {
      this.app.debug.error(e)
    }
  }

  processMessage(message: Message) {
    if (this.hasStarted) return

    switch (message[0]) {
      case Type.JSException:
        this.jsExceptionEvent(message)
        break
      case Type.CustomEvent:
        this.customEvent(message)
        break
      case Type.MouseClick:
        this.clickEvent(message)
        break
      case Type.SetPageLocation:
        this.pageLocationEvent(message)
        break
      case Type.NetworkRequest:
        this.networkRequest(message)
        break
      default:
        break
    }
  }

  processFlag(flag: string) {
    if (this.conditions.some((c) => c.type === 'feature_flag' && c.value.includes(flag))) {
      this.trigger()
    }
  }

  durationInt: ReturnType<typeof setInterval> | null = null

  processDuration(durationSeconds: number) {
    this.durationInt = setInterval(() => {
      const sessionLength = performance.now()
      if (sessionLength > durationSeconds * 1000) {
        this.trigger()
      }
    }, 1000)
  }

  networkRequest(message: NetworkRequest) {
    // url - 3, status - 6, duration - 8
    const urlCond = this.conditions.find((c) => c.type === 'request_url') as
      | CommonCondition
      | undefined
    if (urlCond) {
      const operator = operators[urlCond.operator]
      if (operator && operator(message[3], urlCond.value)) {
        this.trigger()
      }
    }
  }

  customEvent(message: CustomEvent) {
    // name - 1
    const evCond = this.conditions.find((c) => c.type === 'custom_event') as
      | CommonCondition
      | undefined
    if (evCond) {
      const operator = operators[evCond.operator]
      if (operator && operator(message[1], evCond.value)) {
        this.trigger()
      }
    }
  }

  clickEvent(message: MouseClick) {
    // label - 3, selector - 4
    const selectorCond = this.conditions.find((c) => c.type === 'click_selector') as
      | CommonCondition
      | undefined
    if (selectorCond) {
      const operator = operators[selectorCond.operator]
      if (operator && operator(message[4], selectorCond.value)) {
        this.trigger()
      }
    }
    const labelCond = this.conditions.find((c) => c.type === 'click_label') as
      | CommonCondition
      | undefined
    if (labelCond) {
      const operator = operators[labelCond.operator]
      if (operator && operator(message[3], labelCond.value)) {
        this.trigger()
      }
    }
  }

  pageLocationEvent(message: SetPageLocation) {
    // url - 1
    const urlCond = this.conditions.find((c) => c.type === 'request_url') as
      | CommonCondition
      | undefined
    if (urlCond) {
      const operator = operators[urlCond.operator]
      if (operator && operator(message[1], urlCond.value)) {
        this.trigger()
      }
    }
  }

  jsExceptionEvent(message: JSException) {
    // name - 1, message - 2, payload - 3
    const testedValues = [message[1], message[2], message[3]]
    const exceptionCond = this.conditions.find((c) => c.type === 'exception') as
      | ExceptionCondition
      | undefined
    if (exceptionCond) {
      const operator = operators[exceptionCond.operator]
      if (operator && testedValues.some((val) => operator(val, exceptionCond.value))) {
        this.trigger()
      }
    }
  }
}
// duration,
type CommonCondition = {
  type: 'visited_url' | 'request_url' | 'click_label' | 'click_selector' | 'custom_event'
  operator: keyof typeof operators
  value: string[]
}
type ExceptionCondition = {
  type: 'exception'
  operator: 'contains' | 'startsWith' | 'endsWith'
  value: string[]
}
type FeatureFlagCondition = {
  type: 'feature_flag'
  operator: 'is'
  value: string[]
}
type SessionDurationCondition = {
  type: 'session_duration'
  value: number[]
}
type Condition =
  | CommonCondition
  | ExceptionCondition
  | FeatureFlagCondition
  | SessionDurationCondition

const operators = {
  is: (val: string, target: string[]) => target.includes(val),
  isNot: (val: string, target: string[]) => !target.includes(val),
  contains: (val: string, target: string[]) => target.some((t) => val.includes(t)),
  notContains: (val: string, target: string[]) => !target.some((t) => val.includes(t)),
  startsWith: (val: string, target: string[]) => target.some((t) => val.startsWith(t)),
  endsWith: (val: string, target: string[]) => target.some((t) => val.endsWith(t)),
}

// in case of single target value
// const operators = {
//   is: (val: string, target: string) => val === target,
//   isNot: (val: string, target: string) => val !== target,
//   contains: (val: string, target: string) => val.includes(target),
//   notContains: (val: string, target: string) => !val.includes(target),
//   startsWith: (val: string, target: string) => val.startsWith(target),
//   endsWith: (val: string, target: string) => val.endsWith(target),
// }
