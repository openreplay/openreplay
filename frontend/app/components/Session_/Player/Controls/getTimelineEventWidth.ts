import { getTimelinePosition } from '@/utils';

export function getTimelineEventWidth(
  sessionDuration: number,
  eventStart: number,
  eventEnd: number,
): number | string {
    if (eventStart < 0) {
        eventStart = 0;
    }
    if (eventEnd > sessionDuration) {
        eventEnd = sessionDuration;
    }
    if (eventStart === eventEnd) {
        return '2px';
    }

  const width = ((eventEnd - eventStart) / sessionDuration) * 100;

  return width < 1 ? '4px' : width;
}
