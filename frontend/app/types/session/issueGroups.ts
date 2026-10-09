import { types } from './issue';

/* The issue strip says who the trouble happened to first: the person was
   frustrated, the app was broken, someone reported it. The kinds live one
   level down. A group is a tag that means any of its kinds. */
export type IssueGroupKey = 'frustrated' | 'broken' | 'reported';

export const ISSUE_GROUPS: ReadonlyArray<{
  key: IssueGroupKey;
  label: string;
  types: readonly string[];
}> = [
  {
    key: 'frustrated',
    label: 'Frustrated',
    types: [types.CLICK_RAGE, types.TAP_RAGE],
  },
  {
    key: 'broken',
    label: 'Broken',
    types: [types.JS_EXCEPTION, types.BAD_REQUEST, types.CRASH],
  },
  { key: 'reported', label: 'Reported', types: [types.INCIDENT] },
];

/** The kinds in sentence case, in strip order. */
export const ISSUE_KINDS: ReadonlyArray<{ type: string; label: string }> = [
  { type: types.JS_EXCEPTION, label: 'Errors' },
  { type: types.BAD_REQUEST, label: 'Bad requests' },
  { type: types.CLICK_RAGE, label: 'Click rage' },
  { type: types.TAP_RAGE, label: 'Tap rage' },
  { type: types.CRASH, label: 'Crashes' },
  { type: types.INCIDENT, label: 'Incidents' },
];

const groupBy = (key?: string) => ISSUE_GROUPS.find((g) => g.key === key);

/** The group a tag belongs to; a group is its own; `all` has none. */
export const groupOfTag = (tag?: string): IssueGroupKey | null =>
  !tag || tag === types.ALL
    ? null
    : (groupBy(tag)?.key ??
      ISSUE_GROUPS.find((g) => g.types.includes(tag))?.key ??
      null);

/** The kinds a tag stands for: a group's, a kind's own, none for `all`. */
export const typesOfTag = (tag?: string): readonly string[] | null =>
  !tag || tag === types.ALL ? null : (groupBy(tag)?.types ?? [tag]);
