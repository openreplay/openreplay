import { useState } from 'react';

import type AnalyticsStore from 'App/mstore/AnalyticsStore';
import type SearchStore from 'App/mstore/searchStore';
import type SearchStoreLive from 'App/mstore/searchStoreLive';
import type FilterModel from 'App/mstore/types/filter';
import type { Filter } from 'App/mstore/types/filterConstants';

import type { EventsOrder, FilterTarget } from './types';

/** The sessions search; refetching follows from PrivateRoutes' filters effect. */
export const searchTarget = (store: SearchStore): FilterTarget => ({
  get filters() {
    return store.instance.filters;
  },
  eventsOrder: (store.instance.eventsOrder as EventsOrder) ?? 'then',
  add: (f) => store.addFilter(f),
  update: (i, f) => store.updateFilter(i, f),
  remove: (i) => store.removeFilter(i),
  move: (from, to) => store.moveFilter(from, to),
  setEventsOrder: (eventsOrder) => store.edit({ eventsOrder }),
  clear: () => store.clearSearch(),
});

export const liveSearchTarget = (store: SearchStoreLive): FilterTarget => ({
  get filters() {
    return store.instance.filters;
  },
  eventsOrder: 'and',
  add: (f) => store.addFilter(f),
  update: (i, f) => store.updateFilter(i, f),
  remove: (i) => store.removeFilter(i),
  move: () => {},
  setEventsOrder: () => {},
  clear: () => store.clearSearch(),
});

/** Data management lists. A log row is one event, so event rules can only OR. */
export const activityTarget = (store: AnalyticsStore): FilterTarget => ({
  get filters() {
    return store.payloadFilters.filters;
  },
  eventsOrder: 'or',
  add: (f) => void store.addFilter(f),
  update: (i, f) =>
    void store
      .updateFilter(i, f)
      .then(() =>
        store.editPayload({ filters: [...store.payloadFilters.filters] }),
      ),
  remove: (i) => store.removeFilter(i),
  move: (from, to) => {
    const next = [...store.payloadFilters.filters];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    store.editPayload({ filters: next });
  },
  setEventsOrder: () => {},
  clear: () => store.editPayload({ filters: [] }),
});

export const peopleTarget = (store: AnalyticsStore): FilterTarget => ({
  get filters() {
    return store.usersPayloadFilters.filters;
  },
  eventsOrder: 'and',
  add: (f) => void store.addUserFilter(f),
  update: (i, f) => {
    store.updateUserFilter(i, f);
    store.editUsersPayload({ filters: [...store.usersPayloadFilters.filters] });
  },
  remove: (i) => store.removeUserFilter(i),
  move: () => {},
  setEventsOrder: () => {},
  clear: () => store.editUsersPayload({ filters: [] }),
});

/** A card series' filter; `onChange` marks the card dirty. */
export const seriesTarget = (
  filter: FilterModel,
  onChange: () => void,
): FilterTarget => {
  const done =
    <A extends unknown[]>(fn: (...a: A) => void) =>
    (...a: A) => {
      fn(...a);
      onChange();
    };
  return {
    get filters() {
      return filter.filters as unknown as readonly Filter[];
    },
    eventsOrder: (filter.eventsOrder as EventsOrder) ?? 'then',
    add: done((f: Filter) => filter.addFilter(f)),
    update: done((i: number, f: Filter) => filter.updateFilter(i, f as any)),
    remove: done((i: number) => filter.removeFilter(i)),
    move: done((from: number, to: number) => filter.moveFilter(from, to)),
    setEventsOrder: done((o: EventsOrder) =>
      filter.updateKey('eventsOrder', o),
    ),
    clear: done(() => filter.updateKey('filters', [])),
  };
};

/** A draft list in component state: segment editors, card series drafts. */
export function useLocalTarget(
  initial: readonly Filter[] = [],
  initialOrder: EventsOrder = 'then',
): FilterTarget & { reset: (f: readonly Filter[], o?: EventsOrder) => void } {
  const [filters, setFilters] = useState<readonly Filter[]>(initial);
  const [eventsOrder, setEventsOrder] = useState<EventsOrder>(initialOrder);
  return {
    filters,
    eventsOrder,
    add: (f) =>
      setFilters((list) =>
        !f.isEvent && list.some((x) => !x.isEvent && x.name === f.name)
          ? list
          : [...list, f],
      ),
    update: (i, f) =>
      setFilters((list) => list.map((x, j) => (j === i ? f : x))),
    remove: (i) => setFilters((list) => list.filter((_, j) => j !== i)),
    move: (from, to) =>
      setFilters((list) => {
        const next = [...list];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      }),
    setEventsOrder,
    clear: () => setFilters([]),
    reset: (f, o = 'then') => {
      setFilters(f);
      setEventsOrder(o);
    },
  };
}
