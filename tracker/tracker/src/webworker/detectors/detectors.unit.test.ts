import { describe, expect, test } from '@jest/globals'
import type Message from '../../common/messages.gen.js'
import { Type } from '../../common/messages.gen.js'
import type { IssueEvent } from '../../common/messages.gen.js'
import type { IssueReport } from './types.js'
import Detectors from './index.js'
import DeadClickDetector from './deadClick.js'
import ClickRageDetector from './clickRage.js'
import CpuIssueDetector from './cpuIssue.js'
import MemoryIssueDetector from './memoryIssue.js'

/** Collects what a detector reports, so assertions read as a list of issues. */
function collector() {
  const issues: IssueReport[] = []
  return { issues, report: (issue: IssueReport) => issues.push(issue) }
}

const click = (id: number, label: string, selector = `#${label}`): Message =>
  [Type.MouseClick, id, 0, label, selector, 0, 0] as Message
const inputTarget = (id: number): Message => [Type.SetInputTarget, id, 'lbl'] as Message
/** What the observer really emits when it registers a text field or select. */
const inputValue = (id: number, value = ''): Message =>
  [Type.SetInputValue, id, value, 0] as Message
const inputChecked = (id: number): Message => [Type.SetInputChecked, id, true] as Message
const inputChange = (id: number): Message =>
  [Type.InputChange, id, 'typed', false, 'lbl', 0, 0] as Message
const nodeFocus = (id: number): Message => [Type.SetNodeFocus, id] as Message
const textMutation = (): Message => [Type.SetNodeData, 1, 'text'] as Message
const attrMutation = (): Message =>
  [Type.SetNodeAttributeURLBased, 1, 'class', 'open', 'https://a.b'] as Message
const createDocument = (): Message => [Type.CreateDocument] as Message
const pageLocation = (url: string): Message =>
  [Type.SetPageLocation, url, '', 0, 'title'] as Message
/** frames/ticks are what cpuIssue reads; usedJSHeapSize is what memoryIssue reads. */
const perf = (ticks: number, usedJSHeapSize = 0): Message =>
  [Type.PerformanceTrack, 10, ticks, 0, usedJSHeapSize] as Message

describe('DeadClickDetector', () => {
  test('reports a click the page never reacted to', () => {
    const { issues, report } = collector()
    const d = new DeadClickDetector(report)

    d.handle(click(1, 'buy'), 7, 1000)
    d.handle(textMutation(), 8, 1000 + 1235)

    expect(issues).toEqual([
      { type: 'dead_click', contextString: 'buy', context: '#buy', timestamp: 1000, messageId: 7 },
    ])
  })

  test('stays quiet when the reaction is inside the relation window', () => {
    const { issues, report } = collector()
    const d = new DeadClickDetector(report)

    d.handle(click(1, 'buy'), 7, 1000)
    d.handle(textMutation(), 8, 1000 + 1233)

    expect(issues).toEqual([])
  })

  test('ignores clicks on known input targets', () => {
    const { issues, report } = collector()
    const d = new DeadClickDetector(report)

    d.handle(inputTarget(1), 6, 1000)
    d.handle(click(1, 'email'), 7, 1000)
    d.handle(click(2, 'buy'), 8, 9000)

    expect(issues).toEqual([])
  })

  test('input targets survive a DOM mutation', () => {
    const { issues, report } = collector()
    const d = new DeadClickDetector(report)

    d.handle(inputTarget(1), 6, 1000)
    d.handle(textMutation(), 7, 1100)
    d.handle(click(1, 'email'), 8, 2000)
    d.handle(click(2, 'buy'), 9, 9000)

    expect(issues).toEqual([])
  })

  // The tracker has no SetInputTarget call site, so these are the only signals
  // that identify an input. Without them a click into a text field that then
  // sits idle reports as dead.
  test.each([
    ['SetInputValue', inputValue],
    ['SetInputChecked', inputChecked],
    ['InputChange', inputChange],
  ])('%s registers the node as an input', (_name, signal) => {
    const { issues, report } = collector()
    const d = new DeadClickDetector(report)

    d.handle(signal(1), 5, 1000) // observer registers the node
    // focusin precedes click, so the focus lands before the click is pending
    d.handle(nodeFocus(1), 6, 2000)
    d.handle(click(1, 'email'), 7, 2000)
    d.handle(click(2, 'buy'), 8, 9000) // long idle gap, then an unrelated click

    expect(issues).toEqual([])
  })

  test('a value change is still a reaction, not just a registration', () => {
    const { issues, report } = collector()
    const d = new DeadClickDetector(report)

    d.handle(click(1, 'buy'), 7, 1000)
    d.handle(inputValue(9, 'filled'), 8, 1100) // page filled a field in response
    d.handle(click(2, 'other'), 9, 9000)

    expect(issues).toEqual([])
  })

  test('a new document forgets input targets', () => {
    const { issues, report } = collector()
    const d = new DeadClickDetector(report)

    d.handle(inputTarget(1), 6, 1000)
    d.handle(createDocument(), 7, 1100)
    d.handle(click(1, 'email'), 8, 2000)
    d.handle(textMutation(), 9, 2000 + 1235)

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('dead_click')
  })

  test('flush reports a click still pending at session end', () => {
    const { issues, report } = collector()
    const d = new DeadClickDetector(report)

    d.handle(click(1, 'buy'), 7, 1000)
    d.handle(textMutation(), 8, 1000 + 1235)
    issues.length = 0

    d.handle(click(2, 'pay'), 9, 5000)
    d.handle(attrMutation(), 10, 5000 + 1235)
    expect(issues).toHaveLength(1)
    expect(issues[0].messageId).toBe(9)
  })
})

describe('ClickRageDetector', () => {
  test('reports three clicks in a row on the same label', () => {
    const { issues, report } = collector()
    const d = new ClickRageDetector(report)

    d.handle(click(1, 'buy'), 5, 1000)
    d.handle(click(1, 'buy'), 6, 1100)
    d.handle(click(1, 'buy'), 7, 1200)
    d.handle(click(2, 'other'), 8, 5000)

    expect(issues).toEqual([
      {
        type: 'click_rage',
        contextString: 'buy',
        context: '#buy',
        payload: JSON.stringify({ Count: 3 }),
        timestamp: 1000,
        messageId: 5,
      },
    ])
  })

  test('two clicks are not a rage', () => {
    const { issues, report } = collector()
    const d = new ClickRageDetector(report)

    d.handle(click(1, 'buy'), 5, 1000)
    d.handle(click(1, 'buy'), 6, 1100)
    d.handle(click(2, 'other'), 7, 5000)

    expect(issues).toEqual([])
  })

  test('a gap over MAX_TIME_DIFF breaks the row', () => {
    const { issues, report } = collector()
    const d = new ClickRageDetector(report)

    d.handle(click(1, 'buy'), 5, 1000)
    d.handle(click(1, 'buy'), 6, 1100)
    d.handle(click(1, 'buy'), 7, 1500)
    d.handle(click(1, 'buy'), 8, 1600)

    expect(issues).toEqual([])
  })

  test('a backwards timestamp does not weld clicks into a row', () => {
    const { issues, report } = collector()
    const d = new ClickRageDetector(report)

    d.handle(click(1, 'buy'), 5, 5000)
    // clock jumps back: dt is negative, which must not read as "within 300ms"
    d.handle(click(1, 'buy'), 6, 1000)
    d.handle(click(1, 'buy'), 7, 1100)
    d.handle(click(2, 'other'), 8, 9000)

    expect(issues).toEqual([])
  })

  test('a navigation breaks the row', () => {
    const { issues, report } = collector()
    const d = new ClickRageDetector(report)

    d.handle(click(1, 'buy'), 5, 1000)
    d.handle(click(1, 'buy'), 6, 1100)
    d.handle(pageLocation('https://app/next'), 7, 1150)
    // same label, still inside MAX_TIME_DIFF, but on the new page
    d.handle(click(1, 'buy'), 8, 1200)
    d.handle(click(2, 'other'), 9, 9000)

    expect(issues).toEqual([])
  })

  test('a navigation emits a row that was already complete', () => {
    const { issues, report } = collector()
    const d = new ClickRageDetector(report)

    d.handle(click(1, 'buy'), 5, 1000)
    d.handle(click(1, 'buy'), 6, 1100)
    d.handle(click(1, 'buy'), 7, 1200)
    d.handle(pageLocation('https://app/next'), 8, 1250)

    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ type: 'click_rage', timestamp: 1000, messageId: 5 })
  })

  test('flush reports a rage that ends the session', () => {
    const { issues, report } = collector()
    const d = new ClickRageDetector(report)

    d.handle(click(1, 'buy'), 5, 1000)
    d.handle(click(1, 'buy'), 6, 1100)
    d.handle(click(1, 'buy'), 7, 1200)
    expect(issues).toEqual([])

    d.flush()
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ type: 'click_rage', timestamp: 1000, messageId: 5 })
  })
})

describe('CpuIssueDetector', () => {
  // ticks=5 over a 1000ms interval -> tickRate 0.15 -> 85% load, over the 70% bar.
  const busy = () => perf(5)
  // ticks=200 over the same interval clamps tickRate to 1 -> 0% load.
  const idle = () => perf(200)

  test('reports a stretch above the threshold longer than the trigger', () => {
    const { issues, report } = collector()
    const d = new CpuIssueDetector(report, () => 'https://app/page')

    let ts = 1000
    d.handle(busy(), 1, ts) // first sample: no interval yet
    for (let i = 0; i < 8; i++) {
      ts += 1000
      d.handle(busy(), 2 + i, ts)
    }
    ts += 1000
    d.handle(idle(), 20, ts)

    expect(issues).toEqual([
      {
        type: 'cpu',
        contextString: 'https://app/page',
        payload: JSON.stringify({ Duration: 8000, Rate: 85 }),
        timestamp: 2000,
        messageId: 2,
      },
    ])
  })

  test('a stretch shorter than the trigger is dropped', () => {
    const { issues, report } = collector()
    const d = new CpuIssueDetector(report, () => 'https://app/page')

    d.handle(busy(), 1, 1000)
    d.handle(busy(), 2, 2000)
    d.handle(busy(), 3, 3000)
    d.handle(idle(), 4, 4000)

    expect(issues).toEqual([])
  })

  test('flush reports a stretch still open at session end', () => {
    const { issues, report } = collector()
    const d = new CpuIssueDetector(report, () => 'https://app/page')

    let ts = 1000
    d.handle(busy(), 1, ts)
    for (let i = 0; i < 8; i++) {
      ts += 1000
      d.handle(busy(), 2 + i, ts)
    }
    expect(issues).toEqual([])

    d.flush()
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ type: 'cpu', timestamp: 2000, messageId: 2 })
  })

  test('a -1 sample (hidden tab) closes the stretch', () => {
    const { issues, report } = collector()
    const d = new CpuIssueDetector(report, () => 'https://app/page')

    let ts = 1000
    d.handle(busy(), 1, ts)
    for (let i = 0; i < 8; i++) {
      ts += 1000
      d.handle(busy(), 2 + i, ts)
    }
    d.handle([Type.PerformanceTrack, -1, -1, 0, 0] as Message, 20, ts + 1000)

    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ type: 'cpu', timestamp: 2000 })
  })
})

describe('MemoryIssueDetector', () => {
  test('reports usage climbing past the threshold once the average settles', () => {
    const { issues, report } = collector()
    const d = new MemoryIssueDetector(report, () => 'https://app/page')

    // MIN_COUNT warmup samples only feed the running average
    d.handle(perf(10, 100), 1, 1000)
    d.handle(perf(10, 100), 2, 2000)
    d.handle(perf(10, 100), 3, 3000)
    expect(issues).toEqual([])

    d.handle(perf(10, 400), 4, 4000) // 400% of the average -> opens the issue
    expect(issues).toEqual([])

    d.handle(perf(10, 100), 5, 5000) // back under the threshold -> emits
    expect(issues).toEqual([
      {
        type: 'memory',
        contextString: 'https://app/page',
        payload: JSON.stringify({ Rate: 300 }),
        timestamp: 4000,
        messageId: 4,
      },
    ])
  })

  test('flush reports a spike still open at session end', () => {
    const { issues, report } = collector()
    const d = new MemoryIssueDetector(report, () => 'https://app/page')

    d.handle(perf(10, 100), 1, 1000)
    d.handle(perf(10, 100), 2, 2000)
    d.handle(perf(10, 100), 3, 3000)
    d.handle(perf(10, 400), 4, 4000)
    expect(issues).toEqual([])

    d.flush()
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ type: 'memory', timestamp: 4000, messageId: 4 })
  })
})

describe('Detectors', () => {
  function harness() {
    const emitted: IssueEvent[] = []
    const detectors = new Detectors((msg) => emitted.push(msg))
    return { emitted, detectors }
  }

  test('stamps the latest page URL on the emitted IssueEvent', () => {
    const { emitted, detectors } = harness()

    detectors.handle(pageLocation('https://app/checkout'), 1, 1000)
    detectors.handle(click(1, 'buy'), 2, 1000)
    detectors.handle(click(1, 'buy'), 3, 1100)
    detectors.handle(click(1, 'buy'), 4, 1200)
    detectors.flush()

    expect(emitted).toEqual([
      [
        Type.IssueEvent,
        2, // messageId of the first click in the row
        1000,
        'click_rage',
        'buy',
        '#buy',
        JSON.stringify({ Count: 3 }),
        'https://app/checkout',
      ],
    ])
  })

  // Goes through the layer, not the detector: whether a mutation reaches
  // deadClick at all is decided by its `types` list, which only dispatch reads.
  // The observer's normal attribute path is SetNodeAttributeURLBased and its
  // text path is SetNodeData; the Go handler listed neither, so an ordinary
  // class toggle or text swap left the click looking dead.
  test.each([
    ['SetNodeAttributeURLBased', attrMutation],
    ['SetNodeData', textMutation],
    ['SetNodeAttribute', (): Message => [Type.SetNodeAttribute, 1, 'class', 'open'] as Message],
    ['SetCSSDataURLBased', (): Message => [Type.SetCSSDataURLBased, 1, 'css', 'https://a.b'] as Message],
  ])('%s counts as a reaction to a click', (_name, mutation) => {
    const { emitted, detectors } = harness()

    detectors.handle(click(1, 'buy'), 2, 1000)
    detectors.handle(mutation(), 3, 1100)
    // long past the relation window: only a click still pending here fires
    detectors.handle(click(2, 'other'), 4, 9000)
    detectors.flush()

    expect(emitted).toEqual([])
  })

  test('a rage cut by a navigation keeps the URL it happened on', () => {
    const { emitted, detectors } = harness()

    detectors.handle(pageLocation('https://app/checkout'), 1, 1000)
    detectors.handle(click(1, 'buy'), 2, 1000)
    detectors.handle(click(1, 'buy'), 3, 1100)
    detectors.handle(click(1, 'buy'), 4, 1200)
    detectors.handle(pageLocation('https://app/thanks'), 5, 1250)

    expect(emitted).toHaveLength(1)
    expect(emitted[0][7]).toBe('https://app/checkout')
  })

  test('a message no detector asked for is not dispatched', () => {
    const { emitted, detectors } = harness()

    // MouseMove is in no detector's `types`; it must not disturb a pending click
    detectors.handle(click(1, 'buy'), 2, 1000)
    detectors.handle([Type.MouseMove, 5, 5] as Message, 3, 1500)
    detectors.handle(textMutation(), 4, 1000 + 1235)

    expect(emitted).toHaveLength(1)
    expect(emitted[0][3]).toBe('dead_click')
  })

  test('flush drains every detector', () => {
    const { emitted, detectors } = harness()

    detectors.handle(click(1, 'buy'), 2, 1000)
    detectors.handle(click(1, 'buy'), 3, 1100)
    detectors.handle(click(1, 'buy'), 4, 1200)
    detectors.handle(perf(10, 100), 5, 2000)
    detectors.handle(perf(10, 100), 6, 3000)
    detectors.handle(perf(10, 100), 7, 4000)
    detectors.handle(perf(10, 400), 8, 5000)

    detectors.flush()

    expect(emitted.map((m) => m[3]).sort()).toEqual(['click_rage', 'memory'])
  })
})
