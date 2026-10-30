import { filterStore } from 'App/mstore';
import type { Filter } from 'App/mstore/types/filterConstants';

import { applyPatch, storeFilterFor, viewOf } from './catalogue';
import type {
  CatalogueEntry,
  EventsOrder,
  FilterEditor,
  FilterTarget,
} from './types';

const indexOf = (key: string) => Number(key.split('.')[0]);
const propIndexOf = (key: string) => Number(key.split('.')[1]);

/** Default properties land with the event, not a request later. */
async function withDefaults(
  entry: CatalogueEntry,
  filter: Filter,
  projectId?: string,
): Promise<Filter> {
  if (!entry.hasProperties) return filter;
  try {
    const props = await filterStore.getEventFilters(entry.id, projectId);
    const defaults = (props ?? []).filter((p) => p.defaultProperty);
    return {
      ...filter,
      filters: defaults.map((p) => ({
        ...p,
        value: [],
        eventName: entry.name,
      })) as Filter[],
    };
  } catch {
    return filter;
  }
}

/* adds wait for their defaults, in pick order, per list */
const adds = new WeakMap<object, Promise<unknown>>();

/** `projectId`: the catalogue the list's events come from, when not the active one. */
export function buildFilterEditor(
  target: FilterTarget,
  projectId?: string,
): FilterEditor {
  const owner = target.owner ?? {};
  const all = target.filters.map((f, i) => viewOf(f, String(i)));
  const events = all.filter((f) => f.isEvent);
  const properties = all.filter((f) => !f.isEvent);
  const eventIndices = target.filters
    .map((f, i) => (f.isEvent ? i : -1))
    .filter((i) => i >= 0);

  const current = (key: string) => target.filters[indexOf(key)];
  const updateProps = (
    eventKey: string,
    next: (props: Filter[]) => Filter[],
  ) => {
    const f = current(eventKey);
    if (!f) return;
    target.update(indexOf(eventKey), { ...f, filters: next(f.filters ?? []) });
  };

  return {
    events,
    properties,
    eventsOrder: target.eventsOrder,
    onAdd: (entry) => {
      // defaults are fetched per event: queue the adds so a quick second pick
      // never lands before the first
      const ready = withDefaults(entry, storeFilterFor(entry), projectId);
      const next = (adds.get(owner) ?? Promise.resolve())
        .then(() => ready)
        .then(target.add)
        // one failed add must not stop the ones after it
        .catch((e) => console.error('Could not add the filter', e));
      adds.set(owner, next);
    },
    onReplace: (key, entry) => {
      const before = current(key);
      void withDefaults(entry, storeFilterFor(entry), projectId).then((f) => {
        // the defaults fetch is async: the row may have moved or gone meanwhile
        const i = target.filters.indexOf(before);
        if (i >= 0) target.update(i, f);
      });
    },
    onUpdate: (key, patch) => {
      const f = current(key);
      if (f) target.update(indexOf(key), applyPatch(f, patch));
    },
    onRemove: (key) => target.remove(indexOf(key)),
    onMoveEvent: (from, to) => {
      const a = eventIndices[from];
      const b = eventIndices[to];
      if (a != null && b != null && a !== b) target.move(a, b);
    },
    onAddProperty: (eventKey, entry) =>
      updateProps(eventKey, (props) => [
        ...props,
        storeFilterFor(entry, current(eventKey)?.name),
      ]),
    onUpdateProperty: (eventKey, propKey, patch) =>
      updateProps(eventKey, (props) =>
        props.map((p, j) =>
          j === propIndexOf(propKey) ? applyPatch(p, patch) : p,
        ),
      ),
    onRemoveProperty: (eventKey, propKey) =>
      updateProps(eventKey, (props) =>
        props.filter((_, j) => j !== propIndexOf(propKey)),
      ),
    onTogglePropertyOrder: (eventKey) => {
      const f = current(eventKey);
      if (!f) return;
      target.update(indexOf(eventKey), {
        ...f,
        propertyOrder: f.propertyOrder === 'or' ? 'and' : 'or',
      });
    },
    onEventsOrder: (order: EventsOrder) => target.setEventsOrder(order),
    onClear: () => target.clear(),
  };
}
