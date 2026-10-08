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
): Promise<Filter> {
  if (!entry.hasProperties) return filter;
  try {
    const props = await filterStore.getEventFilters(entry.id);
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

export function buildFilterEditor(target: FilterTarget): FilterEditor {
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
      void withDefaults(entry, storeFilterFor(entry)).then(target.add);
    },
    onReplace: (key, entry) => {
      const before = current(key);
      void withDefaults(entry, storeFilterFor(entry)).then((f) => {
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
