import Message, {
  Type,
  MouseClick,
  SetInputTarget,
} from '../../common/messages.gen.js'
import type { Detector, ReportIssue } from './types.js'

/**
 * Port of backend/pkg/handlers/web/deadClick.go.
 *
 * A click is "dead" if the page produced no DOM reaction within
 * CLICK_RELATION_TIME ms of it. Clicks on inputs are ignored (they're expected
 * to just focus). The check is flushed on the next DOM mutation or the next
 * click.
 */

const CLICK_RELATION_TIME = 1234

/**
 * DOM-mutation message types. Any of these arriving means the page reacted to
 * the click. Mirrors the mutation set in the Go Handle() switch
 * (MsgSetCSSData -> SetCSSDataURLBased on the tracker).
 */
const DOM_MUTATION_TYPES: ReadonlySet<number> = new Set<number>([
  Type.SetNodeAttribute,
  Type.RemoveNodeAttribute,
  Type.CreateElementNode,
  Type.CreateTextNode,
  Type.SetNodeFocus,
  Type.MoveNode,
  Type.RemoveNode,
  Type.SetCSSDataURLBased,
  Type.SetInputValue,
  Type.SetInputChecked,
])

export default class DeadClickDetector implements Detector {
  private lastMouseClick: MouseClick | null = null
  private lastTimestamp = 0
  private lastClickTimestamp = 0
  private readonly inputIDSet = new Set<number>()

  constructor(private readonly report: ReportIssue) {}

  private reset(): void {
    this.lastMouseClick = null
    this.lastClickTimestamp = 0
    this.inputIDSet.clear()
  }

  private build(): void {
    const click = this.lastMouseClick
    const clickTs = this.lastClickTimestamp
    const lastTs = this.lastTimestamp
    // matches Go `defer d.reset()`
    this.reset()
    if (click === null || clickTs + CLICK_RELATION_TIME > lastTs) {
      // reaction was instant (or nothing pending) -> not a dead click
      return
    }
    this.report({
      type: 'dead_click',
      contextString: click[3], // label
      context: click[4], // selector (used by the tags filter)
      timestamp: clickTs,
    })
  }

  handle(message: Message, timestamp: number): void {
    const type = message[0]
    const isMutation = DOM_MUTATION_TYPES.has(type)
    if (
      type !== Type.MouseClick &&
      type !== Type.SetInputTarget &&
      type !== Type.CreateDocument &&
      !isMutation
    ) {
      return
    }
    // Go updates lastTimestamp at the top of Handle for every relevant message.
    this.lastTimestamp = timestamp

    switch (type) {
      case Type.MouseClick: {
        const msg = message as MouseClick
        const label = msg[3]
        if (label === '') {
          return
        }
        const isInputEvent = this.inputIDSet.has(msg[1])
        this.build()
        if (isInputEvent) {
          return
        }
        this.lastMouseClick = msg
        this.lastClickTimestamp = timestamp
        return
      }
      case Type.SetInputTarget: {
        const msg = message as SetInputTarget
        this.inputIDSet.add(msg[1])
        return
      }
      case Type.CreateDocument:
        this.inputIDSet.clear()
        return
      default:
        // any DOM mutation flushes the pending click check
        this.build()
    }
  }
}
