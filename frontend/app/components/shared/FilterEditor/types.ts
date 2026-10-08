import type { Filter } from 'App/mstore/types/filterConstants';

export type DataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'duration'
  | 'array'
  | 'date';

export type EventsOrder = 'then' | 'and' | 'or';
export type PropertyOrder = 'and' | 'or';

/** One pickable item of the project's filter catalogue. */
export interface CatalogueEntry {
  id: string;
  name: string;
  displayName: string;
  category: string;
  isEvent: boolean;
  dataType: DataType;
  hasProperties: boolean;
  autoCaptured: boolean;
  /** Closed value set (`possibleValues` of predefined filters). */
  options?: readonly { value: string; label: string }[];
  source: Filter;
}

/** A rule as the editor draws it; `key` addresses it in the backing list. */
export interface SearchFilter {
  key: string;
  entry: CatalogueEntry;
  isEvent: boolean;
  operator: string;
  value: string[];
  /** Duration only, in seconds. */
  min?: number;
  max?: number;
  properties?: SearchFilter[];
  propertyOrder?: PropertyOrder;
  /** Set on an event's own properties. */
  eventName?: string;
}

export interface FilterRules {
  events: readonly SearchFilter[];
  properties: readonly SearchFilter[];
  eventsOrder: EventsOrder;
}

export interface FilterActions {
  onAdd: (entry: CatalogueEntry) => void;
  onReplace: (key: string, entry: CatalogueEntry) => void;
  onUpdate: (key: string, patch: Partial<SearchFilter>) => void;
  onRemove: (key: string) => void;
  onMoveEvent: (from: number, to: number) => void;
  onAddProperty: (eventKey: string, entry: CatalogueEntry) => void;
  onUpdateProperty: (
    eventKey: string,
    propKey: string,
    patch: Partial<SearchFilter>,
  ) => void;
  onRemoveProperty: (eventKey: string, propKey: string) => void;
  onTogglePropertyOrder: (eventKey: string) => void;
  onEventsOrder: (order: EventsOrder) => void;
  onClear: () => void;
}

export type FilterEditor = FilterRules & FilterActions;

/** The list a FilterEditor edits: searchStore, a card series, a segment draft… */
export interface FilterTarget {
  filters: readonly Filter[];
  eventsOrder: EventsOrder;
  add: (filter: Filter) => void;
  update: (index: number, filter: Filter) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
  setEventsOrder: (order: EventsOrder) => void;
  clear: () => void;
}
