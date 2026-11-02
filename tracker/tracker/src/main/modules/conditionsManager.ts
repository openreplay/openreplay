import Message, { NetworkRequest, Type } from '../../common/messages.gen.js'
import App, { StartOptions } from '../app/index.js'

export interface IFeatureFlag {
  key: string
  is_persist: boolean
  value: string | boolean
  payload: string
}

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
              subConditions: filter.filters
                .map((f) => this.createConditionFromFilter(f as unknown as Filter))
                .filter(Boolean) as unknown as SubCondition[],
              name: c.name,
            }
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
    const resultCondition = mapCondition(filter)
    if (resultCondition.type) {
      return resultCondition
    }
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
        // name, message, payload
        return this.check('exception', [message[1], message[2], message[3]])
      case Type.CustomEvent:
        // name, payload
        return this.check('custom_event', [message[1], message[2]])
      case Type.MouseClick:
        // label, selector
        return this.check('click', [message[3], message[4]])
      case Type.SetPageLocation: {
        let pathname = message[1]
        try {
          pathname = new URL(message[1]).pathname
        } catch (e) {}
        return this.check('visited_url', [pathname])
      }
      case Type.NetworkRequest:
        return this.networkRequest(message)
    }
  }

  processFlags(flag: IFeatureFlag[]) {
    this.check(
      'feature_flag',
      flag.map((f) => f.key),
    )
  }

  /** triggers every condition of this type whose operator matches one of the values */
  private check(type: Condition['type'], values: unknown[]) {
    for (const cond of this.conditions) {
      if (cond.type !== type) continue
      const { operator: op, value } = cond as CommonCondition
      const operator = operators[op] as (a: unknown, b: unknown) => boolean
      if (operator && values.some((v) => operator(v, value))) {
        this.trigger(cond.name)
      }
    }
  }

  durationInts: Array<ReturnType<typeof setInterval>> = []

  private clearDurationInt(int: ReturnType<typeof setInterval>) {
    clearInterval(int)
    this.durationInts = this.durationInts.filter((i) => i !== int)
  }

  processDuration(durationMs: number, condName: string) {
    // Track each interval independently: with more than one duration condition a
    // single shared field would leak every interval but the last, and the timer
    // would keep firing after it triggered.
    const int = setInterval(() => {
      if (performance.now() > durationMs) {
        this.clearDurationInt(int)
        this.trigger(condName)
      }
    }, 1000)
    this.durationInts.push(int)
    this.app.attachStopCallback(() => this.clearDurationInt(int))
  }

  networkRequest(message: NetworkRequest) {
    const reqConds = this.conditions.filter(
      (c) => c.type === 'network_request',
    ) as NetworkRequestCondition[]
    if (!reqConds.length) return
    reqConds.forEach((reqCond) => {
      const validSubConditions = reqCond.subConditions.filter((c) => c.operator !== 'isAny')
      if (validSubConditions.length) {
        const allPass = validSubConditions.every((subCond) => {
          const value = message[REQUEST_FIELDS[subCond.key]]
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

const str = (v: unknown) => (v == null ? '' : String(v))
const list = (t: unknown): unknown[] => (Array.isArray(t) ? t : [t])
const num = (t: unknown) => Number(list(t)[0])
const eq = (val: unknown, t: unknown) => {
  if (typeof val === 'number' || typeof t === 'number') {
    const n = Number(t)
    if (str(t).trim() !== '' && !Number.isNaN(n)) return Number(val) === n
  }
  return str(val) === str(t)
}

const operators = {
  is: (val: unknown, target: unknown) => list(target).some((t) => eq(val, t)),
  isAny: () => true,
  isNot: (val: unknown, target: unknown) => !list(target).some((t) => eq(val, t)),
  contains: (val: unknown, target: unknown) => list(target).some((t) => str(val).includes(str(t))),
  notContains: (val: unknown, target: unknown) =>
    !list(target).some((t) => str(val).includes(str(t))),
  startsWith: (val: unknown, target: unknown) =>
    list(target).some((t) => str(val).startsWith(str(t))),
  endsWith: (val: unknown, target: unknown) => list(target).some((t) => str(val).endsWith(str(t))),
  greaterThan: (val: unknown, target: unknown) => Number(val) > num(target),
  greaterOrEqual: (val: unknown, target: unknown) => Number(val) >= num(target),
  lessOrEqual: (val: unknown, target: unknown) => Number(val) <= num(target),
  lessThan: (val: unknown, target: unknown) => Number(val) < num(target),
}

const REQUEST_FIELDS = { method: 2, url: 3, status: 6, duration: 8 } as const

const OP_MAP: Record<string, string> = {
  on: 'is',
  notOn: 'isNot',
  '\u003e': 'greaterThan',
  '\u003c': 'lessThan',
  '\u003d': 'is',
  '\u003c=': 'lessOrEqual',
  '\u003e=': 'greaterOrEqual',
}

// filter type -> [condition type, network request key, operator needs mapping]
const CONDITION_TYPES: Record<string, [string, string, boolean]> = {
  click: ['click', '', true],
  location: ['visited_url', '', false],
  custom: ['custom_event', '', false],
  error: ['exception', '', false],
  fetchUrl: ['network_request', 'url', false],
  fetchStatusCode: ['network_request', 'status', true],
  fetchMethod: ['network_request', 'method', true],
  fetchDuration: ['network_request', 'duration', true],
}

const own = <T>(map: Record<string, T>, key: string) =>
  Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined

const mapCondition = (condition: Filter): Condition => {
  const { type, operator, value } = condition
  let con: Record<string, unknown>
  if (type === 'duration') {
    con = { type: 'session_duration', value, key: '', operator: 'is' }
  } else if (type === 'metadata') {
    con = {
      type: condition.source === 'featureFlag' ? 'feature_flag' : type,
      operator,
      value,
      key: '',
    }
  } else {
    const t = own(CONDITION_TYPES, type)
    con = t
      ? { type: t[0], operator: t[2] ? own(OP_MAP, operator) : operator, value, key: t[1] }
      : { type: '', operator: '', value, key: '' }
  }
  return con as unknown as Condition
}
