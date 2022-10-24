import { Step } from './types'

const TYPES = { CLICKRAGE: 'CLICKRAGE', CLICK: 'CLICK', LOCATION: 'LOCATION' }

export function mapEvents(events: Record<string,any>[]): Step[] {
  const steps: Step[] = []
  events.forEach(event => {
    if (event.type === TYPES.LOCATION) {
      const step = {
        key: event.key,
        type: TYPES.LOCATION,
        icon: 'event/location',
        details: event.url,
        time: event.time,
      }
      steps.push(step)
    }
    if (event.type === TYPES.CLICK) {
      const step = {
        key: event.key,
        type: TYPES.CLICK,
        icon: 'puzzle-piece',
        details: event.label,
        time: event.time,
      }
      steps.push(step)
    }
    if (event.type === TYPES.CLICKRAGE) {
      const step = {
        key: event.key,
        type: TYPES.CLICKRAGE,
        icon: 'event/clickrage',
        details: event.label,
        time: event.time,
      }
      steps.push(step)
    }
  })

  return steps
}
