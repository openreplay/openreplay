import { Step } from './types'

const TYPES = { CLICKRAGE: 'CLICKRAGE', CLICK: 'CLICK', LOCATION: 'LOCATION' }
export const RADIUS = 3

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

export function getClosestEventStep(time: number, arr: Step[]) {
  let mid;
  let low = 0;
  let high = arr.length - 1;
  while (high - low > 1) {
      mid = Math.floor ((low + high) / 2);
      if (arr[mid].time < time) {
          low = mid;
      } else {
        high = mid;
      }
  }
  if (time - arr[low].time <= arr[high].time - time) {
      return  { targetStep: arr[low], index: low } ;
  }
  return { targetStep: arr[high], index: high } ;
}

export const selectEventSteps = (steps: Step[], targetTime: number, radius: number) => {
  const { targetStep, index } = getClosestEventStep(targetTime, steps)

  const stepsBeforeEvent = steps.slice(Math.max(index - radius, 0), index)
  const stepsAfterEvent = steps.slice(index + 1, index + 1 + radius)

  return [...stepsBeforeEvent, targetStep, ...stepsAfterEvent]
}
