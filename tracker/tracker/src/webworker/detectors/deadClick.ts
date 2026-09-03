import Message, {
  Type,
  MouseClick,
  SetInputTarget,
  SetInputValue,
  InputChange,
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
 * the click.
 *
 * Wider than the Go handler's set on purpose. Go read the raw ingest topic,
 * before assetscache rewrites the URL-based messages, so it only ever saw the
 * plain SetNodeAttribute the tracker emits for a handful of internal
 * attributes (sprite, dialog, orloaded, color scheme) — every ordinary
 * attribute change (SetNodeAttributeURLBased) and every text change
 * (SetNodeData) went unnoticed and the click read as dead. Here we know what
 * the observer actually sends, so the whole mutation surface is listed.
 */
const DOM_MUTATION_TYPES: ReadonlySet<number> = new Set<number>([
  Type.CreateElementNode,
  Type.CreateTextNode,
  Type.MoveNode,
  Type.RemoveNode,
  Type.UnbindNodes,
  Type.SetNodeAttribute,
  Type.SetNodeAttributeURLBased,
  Type.SetNodeAttributeDict,
  Type.SetNodeAttributeDictGlobal,
  Type.RemoveNodeAttribute,
  Type.SetNodeData,
  Type.SetCSSDataURLBased,
  Type.SetNodeFocus,
  Type.SetNodeSlot,
  Type.SetInputValue,
  Type.SetInputChecked,
  Type.NodeAnimationResult,
  Type.CanvasNode,
  Type.AdoptedSSReplaceURLBased,
  Type.AdoptedSSInsertRuleURLBased,
  Type.AdoptedSSDeleteRule,
  Type.AdoptedSSAddOwner,
  Type.AdoptedSSRemoveOwner,
])

export default class DeadClickDetector implements Detector {
  readonly types: readonly number[] = [
    Type.MouseClick,
    Type.SetInputTarget,
    Type.InputChange,
    Type.CreateDocument,
    ...DOM_MUTATION_TYPES,
  ]

  private lastMouseClick: MouseClick | null = null
  private lastTimestamp = 0
  private lastClickTimestamp = 0
  private lastMessageId = 0
  private readonly inputIDSet = new Set<number>()

  constructor(private readonly report: ReportIssue) {}

  private reset(): void {
    this.lastMouseClick = null
    this.lastClickTimestamp = 0
    this.lastMessageId = 0
    // inputIDSet deliberately survives: Go cleared it here, so any DOM mutation
    // wiped the "these ids are inputs" memory and the next click on a known
    // input read as a dead-click candidate. Only a new document clears it.
  }

  private build(): void {
    const click = this.lastMouseClick
    const clickTs = this.lastClickTimestamp
    const messageId = this.lastMessageId
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
      messageId,
    })
  }

  flush(): void {
    this.build()
  }

  handle(message: Message, index: number, timestamp: number): void {
    const type = message[0]
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
        this.lastMessageId = index
        return
      }
      case Type.SetInputTarget: {
        // Kept for completeness — the web tracker has no call site for it.
        const msg = message as SetInputTarget
        this.inputIDSet.add(msg[1])
        return
      }
      // How we actually learn a node is an input. SetInputTarget has a
      // generated builder but nothing in src/main calls it, so Go's inputIDSet
      // was always empty and every click into a text field that sat idle for
      // CLICK_RELATION_TIME reported as dead. The observer instead emits
      // SetInputValue for every text field and select as it registers the node
      // (input.ts attachNodeCallback -> trackInputValue/trackSelectValue),
      // before any interaction, so ids are known ahead of the first click.
      case Type.SetInputValue:
      case Type.SetInputChecked:
        this.inputIDSet.add((message as SetInputValue)[1])
        // A genuine value change is also a reaction, so still flush.
        this.build()
        return
      case Type.InputChange:
        // Reports the user's own typing, not a page reaction — register only.
        this.inputIDSet.add((message as InputChange)[1])
        return
      case Type.CreateDocument:
        this.inputIDSet.clear()
        return
      default:
        // any DOM mutation flushes the pending click check
        this.build()
    }
  }
}
