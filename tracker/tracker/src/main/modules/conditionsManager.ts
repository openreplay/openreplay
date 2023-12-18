import Message, {
  CustomEvent,
  JSException,
  MouseClick,
  NetworkRequest,
  SetPageLocation,
  Type,
} from '../../common/messages.gen.js'
import App, { StartOptions } from '../app/index.js'
import { IFeatureFlag } from './featureFlags.js'

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

  async fetchConditions(token: string) {
    try {
      const r = await fetch(`${this.app.options.ingestPoint}/v1/web/conditions`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const { conditions } = await r.json()
      this.conditions = conditions as Condition[]
    } catch (e) {
      this.app.debug.error('Critical: cannot fetch start conditions')
    }
  }

  trigger() {
    if (this.hasStarted) return
    try {
      this.hasStarted = true
      void this.app.start(this.startParams)
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

  processFlags(flag: IFeatureFlag[]) {
    const flagConds = this.conditions.filter(
      (c) => c.type === 'feature_flag',
    ) as FeatureFlagCondition[]
    if (flagConds.length) {
      flagConds.forEach((flagCond) => {
        const operator = operators[flagCond.operator]
        if (operator && flag.some((f) => operator(f.key, flagCond.value))) {
          this.trigger()
        }
      })
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
    // method - 2, url - 3, status - 6, duration - 8
    const reqConds = this.conditions.filter(
      (c) => c.type === 'network_request',
    ) as NetworkRequestCondition[]
    if (reqConds.length) {
      reqConds.forEach((reqCond) => {
        let value
        switch (reqCond.key) {
          case 'url':
            value = message[3]
            break
          case 'status':
            value = message[6]
            break
          case 'method':
            value = message[2]
            break
          case 'duration':
            value = message[8]
            break
          default:
            break
        }
        const operator = operators[reqCond.operator] as (a: string, b: string[]) => boolean
        // @ts-ignore
        if (operator && operator(value, reqCond.value)) {
          this.trigger()
        }
      })
    }
  }

  customEvent(message: CustomEvent) {
    // name - 1
    const evConds = this.conditions.filter((c) => c.type === 'custom_event') as CommonCondition[]
    if (evConds.length) {
      evConds.forEach((evCond) => {
        const operator = operators[evCond.operator] as (a: string, b: string[]) => boolean
        if (operator && operator(message[1], evCond.value)) {
          this.trigger()
        }
      })
    }
  }

  clickEvent(message: MouseClick) {
    // label - 3, selector - 4
    const selectorConds = this.conditions.filter(
      (c) => c.type === 'click_selector',
    ) as CommonCondition[]
    if (selectorConds) {
      selectorConds.forEach((selectorCond) => {
        const operator = operators[selectorCond.operator] as (a: string, b: string[]) => boolean
        if (operator && operator(message[4], selectorCond.value)) {
          this.trigger()
        }
      })
    }
    const labelConds = this.conditions.filter((c) => c.type === 'click_label') as CommonCondition[]
    if (labelConds) {
      labelConds.forEach((labelCond) => {
        const operator = operators[labelCond.operator] as (a: string, b: string[]) => boolean
        if (operator && operator(message[3], labelCond.value)) {
          this.trigger()
        }
      })
    }
  }

  pageLocationEvent(message: SetPageLocation) {
    // url - 1
    const urlConds = this.conditions.filter((c) => c.type === 'visited_url') as CommonCondition[]
    if (urlConds) {
      urlConds.forEach((urlCond) => {
        const operator = operators[urlCond.operator] as (a: string, b: string[]) => boolean
        if (operator && operator(message[1], urlCond.value)) {
          this.trigger()
        }
      })
    }
  }

  jsExceptionEvent(message: JSException) {
    // name - 1, message - 2, payload - 3
    const testedValues = [message[1], message[2], message[3]]
    const exceptionConds = this.conditions.filter(
      (c) => c.type === 'exception',
    ) as ExceptionCondition[]
    if (exceptionConds) {
      exceptionConds.forEach((exceptionCond) => {
        const operator = operators[exceptionCond.operator]
        if (operator && testedValues.some((val) => operator(val, exceptionCond.value))) {
          this.trigger()
        }
      })
    }
  }
}
// duration,
type CommonCondition = {
  type: 'visited_url' | 'click_label' | 'click_selector' | 'custom_event'
  operator: keyof typeof operators
  value: string[]
}
type NetworkRequestCondition = {
  type: 'network_request'
  key: 'url' | 'status' | 'method' | 'duration'
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
  | NetworkRequestCondition

const operators = {
  is: (val: string, target: string[]) => target.includes(val),
  isNot: (val: string, target: string[]) => !target.includes(val),
  contains: (val: string, target: string[]) => target.some((t) => val.includes(t)),
  notContains: (val: string, target: string[]) => !target.some((t) => val.includes(t)),
  startsWith: (val: string, target: string[]) => target.some((t) => val.startsWith(t)),
  endsWith: (val: string, target: string[]) => target.some((t) => val.endsWith(t)),
  greaterThan: (val: number, target: number) => val > target,
  lessThan: (val: number, target: number) => val < target,
}
