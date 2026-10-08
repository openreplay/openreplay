import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { Truncated } from '@/ui/data/truncated';
import { NumberInput } from '@/ui/inputs/number-input';
import {
  InlineSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/ui/inputs/select';
import { PopoverPanel } from '@/ui/overlays/popover';
import { Tooltip } from '@/ui/overlays/tooltip';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  CircleMinus,
  Combine,
  Filter,
  FunnelPlus,
  Layers2,
  ListOrdered,
  Plus,
  Shuffle,
  X,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { FilterPanel } from './FilterPanel';
import { FilterPicker, PickerBody, entryIcon } from './FilterPicker';
import ValuePicker from './ValuePicker';
import {
  categoryLabel,
  describeRules,
  isNullary,
  operatorsFor,
  summariseRules,
} from './catalogue';
import { useEventProperties } from './data';
import './filter-chips.css';
import type {
  CatalogueEntry,
  EventsOrder,
  FilterEditor,
  SearchFilter,
} from './types';
import { useFilterCollapse } from './useFilterCollapse';

const HOTKEY =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform ?? '')
    ? '⌘K'
    : 'Ctrl K';

const ORDER_ICON: Record<EventsOrder, ReactNode> = {
  then: <ListOrdered size={13} aria-hidden="true" />,
  and: <Combine size={13} aria-hidden="true" />,
  or: <Shuffle size={13} aria-hidden="true" />,
};

export interface FilterBarProps {
  editor: FilterEditor;
  /** The catalogue the doors offer. */
  entries: readonly CatalogueEntry[];
  lead?: string;
  saveAction?: ReactNode;
  variant?: 'page' | 'panel';
  orderLocked?: boolean;
  /** Assist live search: only `is`/`contains`. */
  live?: boolean;
}

function FilterBar({
  editor,
  entries,
  saveAction,
  variant = 'page',
  lead: leadProp,
  orderLocked = false,
  live = false,
}: FilterBarProps) {
  const { t } = useTranslation();
  const { events, properties, eventsOrder } = editor;
  const [open, setOpen] = useState<'all' | 'event' | 'group' | null>(null);
  const [seed, setSeed] = useState('');
  const addWrap = useRef<HTMLSpanElement>(null);
  const addEvents = useRef<HTMLSpanElement>(null);
  const addGroup = useRef<HTMLSpanElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const eventEntries = entries.filter((e) => e.isEvent);
  const groupEntries = entries.filter((e) => !e.isEvent);
  const [drag, setDrag] = useState<{
    from: number;
    over: number | null;
    at: 'before' | 'after' | null;
  }>({ from: -1, over: null, at: null });

  const any = events.length > 0 || properties.length > 0;
  const inPanel = variant === 'panel';
  const lead =
    leadProp ??
    (inPanel
      ? t('Say which recordings this segment holds')
      : t('Filter the recordings'));
  const taken = properties.map((f) => f.entry.id);

  const collapse = useFilterCollapse(
    inPanel ? 0 : events.length + properties.length,
  );
  const collapsed = !inPanel && any && collapse.collapsed;

  const openPanel = (
    kind: 'all' | 'event' | 'group' = any ? 'event' : 'all',
    typed = '',
  ) => {
    anchorRef.current =
      (kind === 'event'
        ? addEvents.current
        : kind === 'group'
          ? addGroup.current
          : addWrap.current) ?? addWrap.current;
    setSeed(typed);
    setOpen(kind);
  };
  const closePanel = () => {
    setOpen(null);
    setSeed('');
  };

  useEffect(() => {
    if (inPanel) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return;
      const el = document.activeElement;
      if (
        el instanceof HTMLElement &&
        (el.isContentEditable || /^(INPUT|TEXTAREA)$/.test(el.tagName))
      )
        return;
      e.preventDefault();
      openPanel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const endDrag = () => setDrag({ from: -1, over: null, at: null });
  const commitDrop = () => {
    const { from, over, at } = drag;
    if (from < 0 || over == null) return endDrag();
    let to = at === 'after' ? over + 1 : over;
    if (from < to) to -= 1;
    if (to !== from) editor.onMoveEvent(from, to);
    endDrag();
  };

  const trailing = (
    <span className="m-fchips__trailing">
      <Button variant="subtle" onClick={editor.onClear}>
        {t('Clear')}
      </Button>
      {saveAction}
      {!inPanel && (
        <IconButton
          icon={
            collapsed ? (
              <ChevronsUpDown size={14} />
            ) : (
              <ChevronsDownUp size={14} />
            )
          }
          label={collapsed ? t('Expand the filter') : t('Collapse the filter')}
          variant="ghost"
          onClick={collapse.toggle}
        />
      )}
    </span>
  );

  return (
    <section
      className={`m-fchips${inPanel ? ' m-fchips--panel' : ''}${collapsed ? ' is-collapsed' : ''}`}
      data-slot="filter-bar"
      aria-label={t('Session filter')}
      ref={collapse.anchor as RefObject<HTMLElement>}
    >
      <div className={`m-fchips__stack${any ? '' : ' is-empty'}`}>
        {any && collapsed && (
          <div className="m-fchips__head m-fchips__head--collapsed">
            <Tooltip
              title={describeRules(t, events, properties, eventsOrder)}
              side="bottom"
              delay={400}
            >
              <span className="m-fchips__summary">
                {summariseRules(t, events, properties)}
              </span>
            </Tooltip>
            {trailing}
          </div>
        )}

        {any && !collapsed && (
          <>
            <div className="m-fchips__head">
              <span className="m-fchips__head-name">{t('Events')}</span>
              {events.length > 0 && (
                <OrderWord
                  value={eventsOrder}
                  locked={orderLocked || live}
                  onChange={editor.onEventsOrder}
                />
              )}
              {trailing}
            </div>
            {events.map((f, i) => (
              <EventChip
                key={f.key}
                filter={f}
                index={i + 1}
                editor={editor}
                entries={eventEntries}
                live={live}
                draggable={events.length > 1}
                dragging={drag.from === i}
                dropAt={drag.over === i && drag.from !== i ? drag.at : null}
                onDragStart={() => setDrag({ from: i, over: null, at: null })}
                onDragOver={(at) =>
                  setDrag((d) => (d.from < 0 ? d : { ...d, over: i, at }))
                }
                onDrop={commitDrop}
                onDragEnd={endDrag}
              />
            ))}
            {eventEntries.length > 0 && (
              <span className="m-fchips__doors">
                <span
                  className="m-fchips__addwrap m-fchips__addwrap--event"
                  ref={addEvents}
                >
                  <AddControl
                    label={t('Add event')}
                    plus
                    onOpen={(typed) => openPanel('event', typed)}
                    expanded={open === 'event'}
                  />
                </span>
              </span>
            )}

            <div className="m-fchips__head">
              <span className="m-fchips__head-name">{t('Group filters')}</span>
              {events.length > 0 && (
                <Tooltip title={t('Applied to every event above')}>
                  <span
                    className="m-fchips__orderpick is-fixed"
                    aria-label={t('Applied to every event above')}
                  >
                    <Layers2 size={13} aria-hidden="true" />
                    <span className="m-fchips__ordertag">{t('all')}</span>
                  </span>
                </Tooltip>
              )}
            </div>
            {properties.map((f) => (
              <GroupChip
                key={f.key}
                filter={f}
                editor={editor}
                entries={groupEntries}
                taken={taken}
                live={live}
              />
            ))}
            {groupEntries.length > 0 && (
              <span
                className="m-fchips__addwrap m-fchips__addwrap--group"
                ref={addGroup}
              >
                <AddControl
                  label={t('Add group filter')}
                  plus
                  onOpen={(typed) => openPanel('group', typed)}
                  expanded={open === 'group'}
                />
              </span>
            )}
          </>
        )}

        {!any && (
          <span className="m-fchips__foot">
            <span className="m-fchips__addwrap" ref={addWrap}>
              <AddControl
                label={lead}
                word={inPanel ? lead : t('Filter')}
                onOpen={(typed) => openPanel('all', typed)}
                expanded={open === 'all'}
                badge={!inPanel}
              />
            </span>
          </span>
        )}
        <FilterPanel
          open={open !== null}
          seed={seed}
          onClose={closePanel}
          onPick={(e) => {
            editor.onAdd(e);
            closePanel();
          }}
          taken={taken}
          entries={
            open === 'event'
              ? eventEntries
              : open === 'group'
                ? groupEntries
                : entries
          }
          kind={open ?? 'all'}
          anchorRef={anchorRef}
          placeholder={
            open === 'event'
              ? t('Search events')
              : open === 'group'
                ? t('Search group filters')
                : undefined
          }
        />
      </div>

      <p className="m-sr-only" aria-live="polite">
        {describeRules(t, events, properties, eventsOrder)}
      </p>
    </section>
  );
}

export default observer(FilterBar);

function OrderWord({
  value,
  locked,
  onChange,
}: {
  value: EventsOrder;
  locked: boolean;
  onChange: (o: EventsOrder) => void;
}) {
  const { t } = useTranslation();
  const options: { value: EventsOrder; label: string; hint: string }[] = [
    { value: 'then', label: t('In order'), hint: t('One after another') },
    { value: 'and', label: t('All'), hint: t('In any order') },
    { value: 'or', label: t('Any'), hint: t('One is enough') },
  ];
  const cur = options.find((o) => o.value === value) ?? options[0];
  const face = (
    <>
      {ORDER_ICON[cur.value]}
      <span className="m-fchips__ordertag">{cur.value}</span>
    </>
  );
  if (locked) {
    return (
      <Tooltip title={`${cur.label}: ${cur.hint}`}>
        <span className="m-fchips__orderpick is-fixed" aria-label={cur.label}>
          {face}
        </span>
      </Tooltip>
    );
  }
  return (
    <Select value={value} onValueChange={(v) => onChange(v as EventsOrder)}>
      <Tooltip title={`${cur.label}: ${cur.hint}`}>
        <SelectTrigger
          variant="subtle"
          className="m-fchips__orderpick"
          aria-label={t('How the events relate: {{label}}', {
            label: cur.label,
          })}
        >
          {face}
        </SelectTrigger>
      </Tooltip>
      <SelectContent className="min-w-0">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="m-fchips__orderitem">
              {ORDER_ICON[o.value]}
              {`${o.label} (${o.value})`}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NameSegment({
  entry,
  entries,
  taken,
  onReplace,
}: {
  entry: CatalogueEntry;
  entries: readonly CatalogueEntry[];
  taken: readonly string[];
  onReplace: (e: CatalogueEntry) => void;
}) {
  const { t } = useTranslation();
  return (
    <FilterPicker
      entries={entries}
      taken={taken}
      initialCategory={entry.category}
      onPick={onReplace}
      placeholder={t('Search for a replacement')}
    >
      <button
        type="button"
        className="m-fchip__seg m-fchip__name"
        aria-label={t('Replace {{name}}', { name: entry.displayName })}
      >
        <Tooltip title={t(categoryLabel(entry.category))} delay={300}>
          <span className="m-fchip__glyph" aria-hidden="true">
            {entryIcon(entry, 12)}
          </span>
        </Tooltip>
        <Truncated className="m-fchip__label" text={entry.displayName} />
      </button>
    </FilterPicker>
  );
}

function Predicate({
  filter,
  live,
  onUpdate,
}: {
  filter: SearchFilter;
  live: boolean;
  onUpdate: (p: Partial<SearchFilter>) => void;
}) {
  const { t } = useTranslation();
  const { entry } = filter;
  const operators = operatorsFor(entry.dataType, live);
  return (
    <>
      {operators.length > 1 && (
        <InlineSelect
          className="m-fchip__seg m-fchip__op"
          value={filter.operator}
          onChange={(v) => onUpdate({ operator: v, value: [] })}
          options={operators.map((o) => ({
            value: o.value,
            label: t(o.label),
          }))}
          ariaLabel={t('Operator for {{name}}', { name: entry.displayName })}
        />
      )}
      <ValueSegment filter={filter} live={live} onUpdate={onUpdate} />
    </>
  );
}

const dateInput = (ms: string | undefined) =>
  ms && Number(ms) ? new Date(Number(ms)).toISOString().slice(0, 10) : '';

function ValueSegment({
  filter,
  live,
  onUpdate,
}: {
  filter: SearchFilter;
  live: boolean;
  onUpdate: (p: Partial<SearchFilter>) => void;
}) {
  const { t } = useTranslation();
  const { entry } = filter;
  if (isNullary(filter.operator) || entry.dataType === 'boolean') return null;

  if (entry.dataType === 'duration') {
    return (
      <span className="m-fchip__seg m-fchip__pair">
        <NumberInput
          min={0}
          max={7200}
          value={filter.min ?? undefined}
          onChange={(v) => onUpdate({ min: v ?? 0 })}
          placeholder={t('min')}
          aria-label={t('Minimum duration in seconds')}
        />
        <span className="m-fchip__said">{t('to')}</span>
        <NumberInput
          min={0}
          max={7200}
          value={filter.max ?? undefined}
          onChange={(v) => onUpdate({ max: v ?? 0 })}
          placeholder={t('max')}
          aria-label={t('Maximum duration in seconds')}
        />
        <span className="m-fchip__said">{t('seconds')}</span>
      </span>
    );
  }

  if (entry.dataType === 'number' && !entry.options) {
    return (
      <span className="m-fchip__seg m-fchip__pair">
        <NumberInput
          value={filter.value[0] != null ? Number(filter.value[0]) : undefined}
          onChange={(v) => onUpdate({ value: v == null ? [] : [String(v)] })}
          placeholder={t('value')}
          aria-label={t('Value for {{name}}', { name: entry.displayName })}
        />
      </span>
    );
  }

  if (entry.dataType === 'date') {
    const [from, to] = filter.value;
    const set = (i: 0 | 1, day: string) => {
      const next = [from ?? '', to ?? ''];
      next[i] = day ? String(new Date(day).getTime()) : '';
      onUpdate({ value: next });
    };
    return (
      <span className="m-fchip__seg m-fchip__pair">
        <input
          type="date"
          className="m-fchip__date"
          value={dateInput(from)}
          onChange={(e) => set(0, e.target.value)}
          aria-label={t('From')}
        />
        <span className="m-fchip__said">{t('to')}</span>
        <input
          type="date"
          className="m-fchip__date"
          value={dateInput(to)}
          onChange={(e) => set(1, e.target.value)}
          aria-label={t('To')}
        />
      </span>
    );
  }

  return (
    <span className="m-fchip__seg m-fchip__value">
      <ValuePicker
        filter={filter}
        value={filter.value}
        onChange={(v) => onUpdate({ value: v })}
        live={live}
      />
    </span>
  );
}

/** One rule on its own, outside a bar: a card's journey start point, an exclusion. */
export function SingleRule({
  filter,
  editor,
  entries,
  removable = false,
}: {
  filter: SearchFilter;
  editor: FilterEditor;
  entries: readonly CatalogueEntry[];
  removable?: boolean;
}) {
  const { t } = useTranslation();
  const { entry } = filter;
  return (
    <span className="m-fchip m-fchip--group" data-slot="filter-chip">
      <span className="m-fchip__main">
        <NameSegment
          entry={entry}
          entries={entries}
          taken={[]}
          onReplace={(e) => editor.onReplace(filter.key, e)}
        />
        <Predicate
          filter={filter}
          live={false}
          onUpdate={(p) => editor.onUpdate(filter.key, p)}
        />
      </span>
      {removable && (
        <Actions>
          <ActionButton
            name={t('Remove {{name}}', { name: entry.displayName })}
            onClick={() => editor.onRemove(filter.key)}
          >
            <CircleMinus size={13} aria-hidden="true" />
          </ActionButton>
        </Actions>
      )}
    </span>
  );
}

function AddControl({
  label,
  word,
  plus,
  badge,
  expanded,
  onOpen,
}: {
  label: string;
  word?: string;
  plus?: boolean;
  badge?: boolean;
  expanded: boolean;
  onOpen: (typed: string) => void;
}) {
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    onOpen(e.key);
  };
  if (plus) {
    return (
      <Button
        variant="subtle"
        className="m-fchips__door"
        onClick={() => onOpen('')}
        onKeyDown={onKeyDown}
        aria-expanded={expanded}
        aria-haspopup="dialog"
      >
        <Plus size={13} />
        {label}
      </Button>
    );
  }
  return (
    <button
      type="button"
      className="m-fchips__add"
      onClick={() => onOpen('')}
      onKeyDown={onKeyDown}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      aria-label={label}
    >
      <Filter size={13} className="m-fchips__add-glyph" aria-hidden="true" />
      <span className="m-fchips__add-word" aria-hidden="true">
        {word}
      </span>
      {badge && (
        <kbd className="m-fchips__key" aria-hidden="true">
          {HOTKEY}
        </kbd>
      )}
    </button>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return (
    <span className="m-fchip__actions">
      <span className="m-fchip__bubble">{children}</span>
    </span>
  );
}

function ActionButton({
  name,
  onClick,
  children,
}: {
  name: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="m-fchip__act m-fchip__x"
      onClick={onClick}
      aria-label={name}
    >
      {children}
    </button>
  );
}

function PropertyPicker({
  event,
  onPick,
  children,
}: {
  event: CatalogueEntry;
  onPick: (e: CatalogueEntry) => void;
  children: React.ReactElement;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { entries, loading } = useEventProperties(event, open);
  return (
    <PopoverPanel
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      sideOffset={5}
      className="m-pick-host"
      content={
        <PickerBody
          entries={entries}
          loading={loading}
          onPick={onPick}
          onDone={() => setOpen(false)}
          placeholder={t('Search event properties')}
        />
      }
    >
      {children}
    </PopoverPanel>
  );
}

function GroupChip({
  filter,
  editor,
  entries,
  taken,
  live,
}: {
  filter: SearchFilter;
  editor: FilterEditor;
  entries: readonly CatalogueEntry[];
  taken: readonly string[];
  live: boolean;
}) {
  const { t } = useTranslation();
  const { entry } = filter;
  const isSegment = entry.category === 'segments';
  const isFeature = entry.category === 'features';
  return (
    <span className="m-fchip m-fchip--group" data-slot="filter-chip">
      <span className="m-fchip__main">
        <NameSegment
          entry={entry}
          entries={entries}
          taken={taken}
          onReplace={(e) => editor.onReplace(filter.key, e)}
        />
        {isSegment && (
          <span className="m-fchip__seg m-fchip__said">{t('is matched')}</span>
        )}
        {isFeature && (
          <span className="m-fchip__seg m-fchip__said">{t('is on')}</span>
        )}
        {!isSegment && !isFeature && (
          <Predicate
            filter={filter}
            live={live}
            onUpdate={(p) => editor.onUpdate(filter.key, p)}
          />
        )}
      </span>
      <Actions>
        <ActionButton
          name={t('Remove {{name}}', { name: entry.displayName })}
          onClick={() => editor.onRemove(filter.key)}
        >
          <CircleMinus size={13} aria-hidden="true" />
        </ActionButton>
      </Actions>
    </span>
  );
}

function EventChip({
  filter,
  index,
  editor,
  entries,
  live,
  draggable,
  dragging,
  dropAt,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  filter: SearchFilter;
  index: number;
  editor: FilterEditor;
  entries: readonly CatalogueEntry[];
  live: boolean;
  draggable: boolean;
  dragging: boolean;
  dropAt: 'before' | 'after' | null;
  onDragStart: () => void;
  onDragOver: (at: 'before' | 'after') => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const { t } = useTranslation();
  const { entry } = filter;
  const isSegment = entry.category === 'segments';
  const isFeature = entry.category === 'features';
  const props = filter.properties ?? [];

  return (
    <span
      className={`m-fchip m-fchip--event${draggable ? ' is-draggable' : ''}${dragging ? ' is-dragging' : ''}${dropAt ? ` is-drop-${dropAt}` : ''}`}
      data-slot="filter-chip"
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        const box = e.currentTarget.getBoundingClientRect();
        onDragOver(e.clientY < box.top + box.height / 2 ? 'before' : 'after');
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
    >
      <span className="m-fchip__main">
        <span
          className="m-fchip__seg m-fchip__num"
          title={draggable ? t('Drag to reorder') : undefined}
        >
          {index}
        </span>
        <NameSegment
          entry={entry}
          entries={entries}
          taken={[]}
          onReplace={(e) => editor.onReplace(filter.key, e)}
        />
        {isSegment && (
          <span className="m-fchip__seg m-fchip__said">{t('is matched')}</span>
        )}
        {isFeature && (
          <span className="m-fchip__seg m-fchip__said">{t('is on')}</span>
        )}
      </span>

      {props.length > 0 && (
        <span className="m-fchip__props">
          {props.map((p, i) => (
            <span key={p.key} className="m-fchip__prop">
              {i === 0 ? (
                <span className="m-fchip__seg m-fchip__said">{t('where')}</span>
              ) : i === 1 ? (
                <button
                  type="button"
                  className="m-fchip__seg m-fchip__joint"
                  onClick={() => editor.onTogglePropertyOrder(filter.key)}
                  aria-label={t('Switch to {{order}}', {
                    order: filter.propertyOrder === 'or' ? 'and' : 'or',
                  })}
                >
                  {filter.propertyOrder ?? 'and'}
                </button>
              ) : (
                <span className="m-fchip__seg m-fchip__said is-echo">
                  {filter.propertyOrder ?? 'and'}
                </span>
              )}
              <span className="m-fchip__seg m-fchip__propname">
                <span className="m-fchip__glyph" aria-hidden="true">
                  {entryIcon(p.entry, 12)}
                </span>
                <Truncated
                  className="m-fchip__label"
                  text={p.entry.displayName}
                />
              </span>
              <Predicate
                filter={p}
                live={live}
                onUpdate={(patch) =>
                  editor.onUpdateProperty(filter.key, p.key, patch)
                }
              />
              <button
                type="button"
                className="m-fchip__seg m-fchip__x"
                onClick={() => editor.onRemoveProperty(filter.key, p.key)}
                aria-label={t('Remove {{name}}', {
                  name: p.entry.displayName,
                })}
              >
                <X size={11} aria-hidden="true" />
              </button>
            </span>
          ))}
        </span>
      )}

      <Actions>
        {entry.hasProperties && (
          <PropertyPicker
            event={entry}
            onPick={(e) => editor.onAddProperty(filter.key, e)}
          >
            <button
              type="button"
              className="m-fchip__act m-fchip__plus"
              aria-label={t('Narrow {{name}}', { name: entry.displayName })}
              title={t('Applied to this event only')}
            >
              <FunnelPlus size={12} aria-hidden="true" />
            </button>
          </PropertyPicker>
        )}
        <ActionButton
          name={t('Remove {{name}}', { name: entry.displayName })}
          onClick={() => editor.onRemove(filter.key)}
        >
          <CircleMinus size={13} aria-hidden="true" />
        </ActionButton>
      </Actions>
    </span>
  );
}
