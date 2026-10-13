import { types } from './issue';

/** The issue strip's kinds in sentence case, in strip order. */
export const ISSUE_KINDS: ReadonlyArray<{ type: string; label: string }> = [
  { type: types.JS_EXCEPTION, label: 'Errors' },
  { type: types.BAD_REQUEST, label: 'Bad requests' },
  { type: types.CLICK_RAGE, label: 'Click rage' },
  { type: types.TAP_RAGE, label: 'Tap rage' },
  { type: types.CRASH, label: 'Crashes' },
  { type: types.INCIDENT, label: 'Incidents' },
];
