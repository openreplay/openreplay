import type App from '../app/index.js'
import { LongTask } from '../app/messages.gen.js'

// https://w3c.github.io/performance-timeline/#the-performanceentry-interface
interface TaskAttributionTiming extends PerformanceEntry {
  readonly containerType: string
  readonly containerSrc: string
  readonly containerId: string
  readonly containerName: string
}

// https://www.w3.org/TR/longtasks/#performancelongtasktiming
interface PerformanceLongTaskTiming extends PerformanceEntry {
  readonly attribution: ReadonlyArray<TaskAttributionTiming>
}

export default function (app: App): void {
  if (!('PerformanceObserver' in window) || !('PerformanceLongTaskTiming' in window)) {
    return
  }

  const contexts: string[] = [
    'unknown',
    'self',
    'same-origin-ancestor',
    'same-origin-descendant',
    'same-origin',
    'cross-origin-ancestor',
    'cross-origin-descendant',
    'cross-origin-unreachable',
    'multiple-contexts',
  ]
  const containerTypes: string[] = ['window', 'iframe', 'embed', 'object']
  function longTask(entry: PerformanceLongTaskTiming): void {
    let type = '',
      src = '',
      id = '',
      name = ''
    const container = entry.attribution[0]
    if (container != null) {
      type = container.containerType
      name = container.containerName
      id = container.containerId
      src = container.containerSrc
    }

    app.send(
      LongTask(
        entry.startTime + performance.timing.navigationStart,
        entry.duration,
        Math.max(contexts.indexOf(entry.name), 0),
        Math.max(containerTypes.indexOf(type), 0),
        name,
        id,
        src,
      ),
    )
  }

  const observer: PerformanceObserver = new PerformanceObserver((list) =>
    list.getEntries().forEach(longTask),
  )
  observer.observe({ entryTypes: ['longtask'] })
}
