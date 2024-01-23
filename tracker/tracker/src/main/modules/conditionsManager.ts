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

interface Filter {
  filters: {
    operator: string
    value: string[]
    type: string
    source?: string
  }[]
  operator: string
  value: string[]
  type: string
  source?: string
}

interface ApiResponse {
  capture_rate: number
  name: string
  filters: Filter[]
}

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

  async fetchConditions(projectId: string, token: string) {
    try {
      const r = await fetch(`${this.app.options.ingestPoint}/v1/web/conditions/${projectId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const { conditions } = (await r.json()) as { conditions: ApiResponse[] }
      const mappedConditions: Condition[] = []
      conditions.forEach((c) => {
        const filters = c.filters
        filters.forEach((filter) => {
          let cond: Condition | undefined
          if (filter.type === 'fetch') {
            cond = {
              type: 'network_request',
              subConditions: [],
              name: c.name,
            }
            filter.filters.forEach((f) => {
              const subCond = this.createConditionFromFilter(f as unknown as Filter)
              if (subCond) {
                ;(cond as unknown as NetworkRequestCondition).subConditions.push(
                  subCond as unknown as SubCondition,
                )
              }
            })
          } else {
            cond = this.createConditionFromFilter(filter)
          }
          if (cond) {
            if (cond.type === 'session_duration') {
              this.processDuration(cond.value[0], c.name)
            }
            mappedConditions.push({ ...cond, name: c.name })
          }
        })
      })
      this.conditions = mappedConditions
    } catch (e) {
      this.app.debug.error('Critical: cannot fetch start conditions')
    }
  }

  createConditionFromFilter = (filter: Filter) => {
    if (filter.value.length) {
      const resultCondition = mapCondition(filter)
      if (resultCondition.type) {
        return resultCondition
      }
    }
    return undefined
  }

  trigger(conditionName: string) {
    if (this.hasStarted) return
    try {
      this.hasStarted = true
      void this.app.start(this.startParams, undefined, conditionName)
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
        if (operator && flag.find((f) => operator(f.key, flagCond.value))) {
          this.trigger(flagCond.name)
        }
      })
    }
  }

  durationInt: ReturnType<typeof setInterval> | null = null

  processDuration(durationMs: number, condName: string) {
    this.durationInt = setInterval(() => {
      const sessionLength = performance.now()
      if (sessionLength > durationMs) {
        this.trigger(condName)
      }
    }, 1000)
    this.app.attachStopCallback(() => {
      if (this.durationInt) {
        clearInterval(this.durationInt)
      }
    })
  }

  networkRequest(message: NetworkRequest) {
    // method - 2, url - 3, status - 6, duration - 8
    const reqConds = this.conditions.filter(
      (c) => c.type === 'network_request',
    ) as NetworkRequestCondition[]
    if (!reqConds.length) return
    reqConds.forEach((reqCond) => {
      const validSubConditions = reqCond.subConditions.filter((c) => c.operator !== 'isAny')
      if (validSubConditions.length) {
        const allPass = validSubConditions.every((subCond) => {
          let value
          switch (subCond.key) {
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
          const operator = operators[subCond.operator] as (a: string, b: string[]) => boolean
          // @ts-ignore
          if (operator && operator(value, subCond.value)) {
            return true
          }
        })
        if (allPass) {
          this.trigger(reqCond.name)
        }
      } else if (validSubConditions.length === 0 && reqCond.subConditions.length) {
        this.trigger(reqCond.name)
      }
    })
  }

  customEvent(message: CustomEvent) {
    // name - 1, payload - 2
    const evConds = this.conditions.filter((c) => c.type === 'custom_event') as CommonCondition[]
    if (evConds.length) {
      evConds.forEach((evCond) => {
        const operator = operators[evCond.operator] as (a: string, b: string[]) => boolean
        if (
          operator &&
          (operator(message[1], evCond.value) || operator(message[2], evCond.value))
        ) {
          this.trigger(evCond.name)
        }
      })
    }
  }

  clickEvent(message: MouseClick) {
    // label - 3, selector - 4
    const clickCond = this.conditions.filter((c) => c.type === 'click') as CommonCondition[]
    if (clickCond.length) {
      clickCond.forEach((click) => {
        const operator = operators[click.operator] as (a: string, b: string[]) => boolean
        if (operator && (operator(message[3], click.value) || operator(message[4], click.value))) {
          this.trigger(click.name)
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
          this.trigger(urlCond.name)
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
          this.trigger(exceptionCond.name)
        }
      })
    }
  }
}
// duration,
type CommonCondition = {
  type: 'visited_url' | 'click' | 'custom_event'
  operator: keyof typeof operators
  value: string[]
  name: string
}

type ExceptionCondition = {
  type: 'exception'
  operator: 'contains' | 'startsWith' | 'endsWith'
  value: string[]
  name: string
}
type FeatureFlagCondition = {
  type: 'feature_flag'
  operator: 'is'
  value: string[]
  name: string
}
type SessionDurationCondition = {
  type: 'session_duration'
  value: number[]
  name: string
}
type SubCondition = {
  type: 'network_request'
  key: 'url' | 'status' | 'method' | 'duration'
  operator: keyof typeof operators
  value: string[]
}
type NetworkRequestCondition = {
  type: 'network_request'
  subConditions: SubCondition[]
  name: string
}
type Condition =
  | CommonCondition
  | ExceptionCondition
  | FeatureFlagCondition
  | SessionDurationCondition
  | NetworkRequestCondition

const operators = {
  is: (val: string, target: string[]) => target.some((t) => val.includes(t)),
  isAny: () => true,
  isNot: (val: string, target: string[]) => !target.some((t) => val.includes(t)),
  contains: (val: string, target: string[]) => target.some((t) => val.includes(t)),
  notContains: (val: string, target: string[]) => !target.some((t) => val.includes(t)),
  startsWith: (val: string, target: string[]) => target.some((t) => val.startsWith(t)),
  endsWith: (val: string, target: string[]) => target.some((t) => val.endsWith(t)),
  greaterThan: (val: number, target: number) => val > target,
  greaterOrEqual: (val: number, target: number) => val >= target,
  lessOrEqual: (val: number, target: number) => val <= target,
  lessThan: (val: number, target: number) => val < target,
}

const mapCondition = (condition: Filter): Condition => {
  const opMap = {
    on: 'is',
    notOn: 'isNot',
    '\u003e': 'greaterThan',
    '\u003c': 'lessThan',
    '\u003d': 'is',
    '\u003c=': 'lessOrEqual',
    '\u003e=': 'greaterOrEqual',
  }

  const mapOperator = (operator: string) => {
    const keys = Object.keys(opMap)
    // @ts-ignore
    if (keys.includes(operator)) return opMap[operator]
  }

  let con = {
    type: '',
    operator: '',
    value: condition.value,
    key: '',
  }
  switch (condition.type) {
    case 'click':
      con = {
        type: 'click',
        operator: mapOperator(condition.operator),
        value: condition.value,
        key: '',
      }
      break
    case 'location':
      con = {
        type: 'visited_url',
        // @ts-ignore
        operator: condition.operator,
        value: condition.value,
        key: '',
      }
      break
    case 'custom':
      con = {
        type: 'custom_event',
        // @ts-ignore
        operator: condition.operator,
        value: condition.value,
        key: '',
      }
      break
    case 'metadata':
      con = {
        // @ts-ignore
        type: condition.source === 'featureFlag' ? 'feature_flag' : condition.type,
        // @ts-ignore
        operator: condition.operator,
        value: condition.value,
        key: '',
      }
      break
    case 'error':
      con = {
        type: 'exception',
        // @ts-ignore
        operator: condition.operator,
        value: condition.value,
        key: '',
      }
      break
    case 'duration':
      con = {
        type: 'session_duration',
        // @ts-ignore
        value: condition.value[0],
        key: '',
      }
      break
    case 'fetchUrl':
      con = {
        type: 'network_request',
        key: 'url',
        operator: condition.operator,
        value: condition.value,
      }
      break
    case 'fetchStatusCode':
      con = {
        type: 'network_request',
        key: 'status',
        operator: mapOperator(condition.operator),
        value: condition.value,
      }
      break
    case 'fetchMethod':
      con = {
        type: 'network_request',
        key: 'method',
        operator: mapOperator(condition.operator),
        value: condition.value,
      }
      break
    case 'fetchDuration':
      con = {
        type: 'network_request',
        key: 'duration',
        operator: mapOperator(condition.operator),
        value: condition.value,
      }
      break
  }
  // @ts-ignore
  return con
}
