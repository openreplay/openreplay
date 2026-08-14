import { Tooltip } from 'antd';
import {
  Check,
  ChevronRight,
  CornerDownLeft,
  GripVertical,
  Minus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useTranslation } from 'react-i18next';

import { StepDecision, StepItem, isStruck } from '../shared/revisions';
import { TINT_SOFT } from '../shared/utils';
import { Section } from './EntityDrawer';

const STEP_DND = 'KAI_STEP';
// shared by the insert line and the drag drop line so "add here" and "move here" read
// identically
const LINE = 'var(--color-main)';

interface Props {
  steps: string[];
  /** commit an edit (add / delete / rename / reorder) */
  onStepsChange: (steps: string[]) => void;
  /** cap the list height and scroll inside — for drawers where steps share the space
   *  with other sections. Drafts scroll the page instead. */
  bounded?: boolean;
  /** rendered on the right of the section header (version switcher / summary) */
  headerAction?: React.ReactNode;
  /** section title override (version review: "Steps · v1 → v2") */
  title?: React.ReactNode;
  /** review mode: rows carry add/remove/group markers but the list stays fully
   *  editable — mutations flow through onItemsChange instead of onStepsChange */
  reviewItems?: StepItem[];
  onItemsChange?: (items: StepItem[]) => void;
  /** the per-line ✓/✕ pair (parent toggles: same side clicked again un-decides) */
  onDecide?: (idx: number, decision: StepDecision) => void;
}

/** Suggestions arrive UNDECIDED (both ghost), so the first click is a real action: the
 *  chosen side gains a bordered chip. Clicking it again un-decides. */
function DecisionButtons({
  decision,
  onDecide,
}: {
  decision?: StepDecision;
  onDecide: (decision: StepDecision) => void;
}) {
  const { t } = useTranslation();
  const base =
    'shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors';
  const selected = 'bg-white text-gray-darkest border shadow-sm';
  const idle =
    'text-gray-medium hover:text-gray-darkest hover:bg-gray-lightest';
  return (
    <>
      <Tooltip
        title={
          decision === 'accepted'
            ? t('Accepted — undo')
            : t('Accept suggestion')
        }
      >
        <button
          type="button"
          aria-label={t('Accept suggestion')}
          aria-pressed={decision === 'accepted'}
          onClick={() => onDecide('accepted')}
          className={`${base} ${decision === 'accepted' ? selected : idle}`}
          style={
            decision === 'accepted'
              ? { borderColor: 'var(--color-gray-light)' }
              : undefined
          }
        >
          <Check size={14} />
        </button>
      </Tooltip>
      <Tooltip
        title={
          decision === 'rejected'
            ? t('Rejected — undo')
            : t('Reject suggestion')
        }
      >
        <button
          type="button"
          aria-label={t('Reject suggestion')}
          aria-pressed={decision === 'rejected'}
          onClick={() => onDecide('rejected')}
          className={`${base} ${decision === 'rejected' ? selected : idle}`}
          style={
            decision === 'rejected'
              ? { borderColor: 'var(--color-gray-light)' }
              : undefined
          }
        >
          <X size={14} />
        </button>
      </Tooltip>
    </>
  );
}

/** A ghosted trailing row: reads as a hint until clicked, then becomes a new step. */
function AddStepRow({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2.5 rounded px-1 -mx-1 py-1.5 text-left hover:bg-gray-lightest"
    >
      <span className="w-5 h-6 flex items-center justify-center shrink-0 text-disabled-text">
        <Plus size={14} />
      </span>
      <span className="flex-1 text-[15px] leading-6 text-disabled-text">
        {t('Add step...')}
      </span>
    </button>
  );
}

/** The gap between two steps — same height whether inserting or dragging, so starting a
 *  drag never reflows the list. */
function Gap({
  onInsert,
  dragging,
  isDropTarget,
  always,
  label,
}: {
  onInsert: () => void;
  dragging?: boolean;
  isDropTarget?: boolean;
  always?: boolean;
  label?: string;
}) {
  const { t } = useTranslation();

  if (dragging) {
    return (
      <div className="h-5 flex items-center" aria-hidden>
        <div
          className="w-full h-0.5 rounded-full"
          style={{ background: isDropTarget ? LINE : 'transparent' }}
        />
      </div>
    );
  }

  const reveal = always
    ? 'opacity-100'
    : 'opacity-0 group-hover/ins:opacity-100';
  return (
    <div
      role="button"
      aria-label={label ?? t('Insert step')}
      onClick={onInsert}
      className={`group/ins relative flex items-center justify-center cursor-pointer ${
        always ? 'h-7' : 'h-5'
      }`}
    >
      <div
        className={`absolute inset-x-0 h-0.5 rounded-full ${reveal}`}
        style={{ background: LINE }}
      />
      <div
        className={`relative z-10 flex items-center gap-1 rounded-full bg-main text-[#fff] shadow-sm ${reveal} ${
          label ? 'pl-1 pr-2 py-0.5' : 'p-0.5'
        }`}
      >
        <Plus size={12} />
        {label && <span className="text-xs font-medium">{label}</span>}
      </div>
    </div>
  );
}

interface StepRowProps {
  idx: number;
  item: StepItem;
  /** live position in the resulting list — null for struck rows and group labels */
  number: number | null;
  editing: boolean;
  draft: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  setDraft: (v: string) => void;
  onStartEdit: (idx: number) => void;
  onRemove: (idx: number) => void;
  onEnter: () => void;
  onBlur: () => void;
  onEscape: () => void;
  onDragStart: (idx: number) => void;
  onDragEnd: () => void;
  onDecide?: (idx: number, decision: StepDecision) => void;
  /** merge review: "· N steps" suffix and collapse state of a group label row */
  groupMeta?: string;
  groupCollapsed?: boolean;
  onToggleGroup?: () => void;
}

/** One step. Drag the grip (it replaces the number on hover) to reorder; click the text
 *  to edit inline. In review, proposed rows add their diff dress and a ✓/✕ toggle. */
function StepRow({
  idx,
  item,
  number,
  editing,
  draft,
  inputRef,
  setDraft,
  onStartEdit,
  onRemove,
  onEnter,
  onBlur,
  onEscape,
  onDragStart,
  onDragEnd,
  onDecide,
  groupMeta,
  groupCollapsed,
  onToggleGroup,
}: StepRowProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);

  const step = item.text;
  const struck = isStruck(item);
  // a group label is unnumbered and non-editable; its grip drags the whole block beneath
  const isGroup = item.kind === 'group';
  // a standing addition is green, a standing removal red; a rejected suggestion loses
  // its tint — the step list stays as-is
  const addedOn = item.kind === 'added' && item.decision !== 'rejected';
  const removedOn = item.kind === 'removed' && item.decision !== 'rejected';

  const [{ isDragging }, drag, preview] = useDrag({
    type: STEP_DND,
    item: () => {
      onDragStart(idx);
      return { idx };
    },
    // a struck row is leaving the test — nothing to reorder
    canDrag: !editing && !struck,
    end: () => onDragEnd(),
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  preview(ref);
  drag(handleRef);

  return (
    <div
      ref={ref}
      data-step-row
      onClick={isGroup ? onToggleGroup : undefined}
      style={{
        opacity: isDragging ? 0.4 : 1,
        ...(!editing && addedOn ? { background: TINT_SOFT.green } : {}),
        ...(!editing && removedOn ? { background: TINT_SOFT.red } : {}),
      }}
      className={`group flex items-start gap-2.5 rounded px-1 -mx-1 py-1.5 ${
        editing ? 'bg-active-blue' : struck ? '' : 'hover:bg-gray-lightest'
      }${isGroup ? ' cursor-pointer select-none' : ''}`}
    >
      {struck ? (
        // a row leaving the test: red − where the number would be, no drag handle
        <span className="w-5 h-6 flex items-center justify-center shrink-0 leading-6">
          <Minus size={14} className="text-red" />
        </span>
      ) : (
        // step number at rest; on row hover it becomes the drag handle in the same slot
        // (inside the row, so moving onto it never loses the hover state)
        <span className="relative w-5 h-6 flex items-center justify-center shrink-0 leading-6">
          <span
            className={`text-sm ${editing ? '' : 'group-hover:opacity-0'} ${
              addedOn ? '' : 'text-disabled-text'
            }`}
            style={addedOn ? { color: 'var(--color-green-dark)' } : undefined}
          >
            {isGroup ? (
              <ChevronRight
                size={15}
                className="transition-transform text-gray-medium"
                style={
                  groupCollapsed ? undefined : { transform: 'rotate(90deg)' }
                }
              />
            ) : (
              number
            )}
          </span>
          {!editing && (
            <Tooltip title={t('Drag to reorder')}>
              <span
                ref={handleRef}
                aria-label={t('Drag to reorder')}
                // opacity, not display:none — a handle that leaves the layout mid-drag
                // makes Chromium cancel the native drag
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 flex opacity-0 group-hover:opacity-100 items-center justify-center cursor-grab text-gray-medium hover:text-gray-darkest"
              >
                <GripVertical size={15} />
              </span>
            </Tooltip>
          )}
        </span>
      )}

      {editing ? (
        // native input (not antd) so its box exactly matches the static text line —
        // antd's <Input> carries its own line-height and reflows the row
        <input
          ref={inputRef}
          value={draft}
          placeholder={t('Describe the step')}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEnter();
            else if (e.key === 'Escape') onEscape();
          }}
          className="flex-1 text-[15px] leading-6 bg-transparent outline-none border-0 p-0 m-0 text-black placeholder:text-disabled-text"
        />
      ) : isGroup ? (
        <span className="flex-1 text-left text-[15px] leading-6 break-words font-medium">
          {step}
          {groupMeta && (
            <span className="font-normal text-disabled-text">
              {' '}
              · {groupMeta}
            </span>
          )}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => !struck && onStartEdit(idx)}
          className={`flex-1 text-left text-[15px] leading-6 break-words ${
            struck ? 'line-through text-disabled-text cursor-default' : ''
          }`}
        >
          {step || (
            <span className="text-disabled-text italic">
              {t('Empty — click to edit')}
            </span>
          )}
        </button>
      )}

      {/* one right-aligned controls column, same edge on every row, so nothing jumps
          between suggestion rows and plain rows */}
      <div className="flex items-center justify-end gap-0.5 shrink-0 self-start min-w-[60px]">
        {editing ? (
          // mousedown-preventDefault keeps the input focused so its onBlur doesn't fire
          // first and commit/close before the click handler runs
          <>
            <Tooltip title={t('Confirm — Enter')}>
              <button
                type="button"
                aria-label={t('Confirm step')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onEnter}
                className="w-6 h-6 rounded flex items-center justify-center text-blue hover:bg-white"
              >
                <CornerDownLeft size={14} />
              </button>
            </Tooltip>
            <Tooltip title={t('Delete step')}>
              <button
                type="button"
                aria-label={t('Delete step')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onRemove(idx)}
                className="w-6 h-6 rounded flex items-center justify-center text-gray-medium hover:text-red hover:bg-red-lightest"
              >
                <Trash2 size={14} />
              </button>
            </Tooltip>
          </>
        ) : item.kind && item.kind !== 'group' && onDecide ? (
          <DecisionButtons
            decision={item.decision}
            onDecide={(d) => onDecide(idx, d)}
          />
        ) : (
          <Tooltip
            title={
              isGroup
                ? t('Remove label — its steps join the group above')
                : t('Delete step')
            }
          >
            <button
              type="button"
              aria-label={isGroup ? t('Remove group label') : t('Delete step')}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(idx);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 w-6 h-6 rounded flex items-center justify-center text-gray-medium hover:text-red hover:bg-red-lightest"
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/** Stable collapse key for a group row: `id` when the caller supplied one, so two
 *  sources sharing a title don't collapse as one. */
const groupKey = (it: StepItem): string => it.id ?? it.text;

/** The steps list, shared by Draft, Test and version review so they look identical.
 *  Click a step to edit it inline; insert via the line between steps; drag the grip to
 *  reorder; delete on hover. An empty step is dropped on blur/Escape. */
function EditableSteps({
  steps,
  onStepsChange,
  bounded,
  headerAction,
  title,
  reviewItems,
  onItemsChange,
  onDecide,
}: Props) {
  const { t } = useTranslation();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // swallow the trailing onBlur that fires when an edit commits via Enter/Esc
  const skipBlur = useRef(false);
  // Enter only chains a next blank step while ADDING; a rename just commits
  const editingIsNew = useRef(false);

  // one shape for all modes: review passes rich rows, everything else wraps the plain
  // strings. Mutations emit through the mode's channel (onItemsChange keeps the markers).
  const review = reviewItems != null;
  const items: StepItem[] = reviewItems ?? steps.map((text) => ({ text }));
  const emit = (next: StepItem[]) =>
    review ? onItemsChange?.(next) : onStepsChange(next.map((i) => i.text));

  // merge-review groups start COLLAPSED (tidy overview). Collapsed rows stay mounted at
  // 0 height so indices / numbering / drop math never notice.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () =>
      new Set(
        (reviewItems ?? []).filter((it) => it.kind === 'group').map(groupKey),
      ),
  );
  const toggleGroup = (key: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // drag-reorder state. Refs mirror state so the (single) drop handler reads fresh values.
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  const dropRef = useRef<number | null>(null);

  // Focus the active input after it (re)renders — autoFocus is unreliable across
  // inserts. Also drop any leftover skipBlur: when Enter chains a new step the old input
  // unmounts without firing its blur, and a stale flag would swallow the NEXT real one.
  useEffect(() => {
    if (editingIdx != null) {
      skipBlur.current = false;
      inputRef.current?.focus();
    }
  }, [editingIdx]);

  const startEdit = (idx: number) => {
    if (items[idx]?.kind === 'group') return;
    editingIsNew.current = false;
    setDraft(items[idx]?.text ?? '');
    setEditingIdx(idx);
  };

  // write the draft into `idx`; an emptied step is dropped — that's also how an
  // accidental new step is cancelled (clear it, click outside)
  const commitInto = (idx: number): StepItem[] => {
    const trimmed = draft.trim();
    const next = [...items];
    if (trimmed === '') next.splice(idx, 1);
    else next[idx] = { ...next[idx], text: trimmed };
    return next;
  };

  const onEnter = () => {
    if (editingIdx == null) return;
    skipBlur.current = true;
    const next = commitInto(editingIdx);
    // renaming (or an emptied step): Enter just confirms — no new row below
    if (draft.trim() === '' || !editingIsNew.current) {
      emit(next);
      setEditingIdx(null);
      return;
    }
    const at = editingIdx + 1;
    next.splice(at, 0, { text: '' });
    emit(next);
    setDraft('');
    setEditingIdx(at);
  };

  const onBlur = () => {
    if (skipBlur.current) {
      skipBlur.current = false;
      return;
    }
    if (editingIdx == null) return;
    emit(commitInto(editingIdx));
    setEditingIdx(null);
  };

  const onEscape = () => {
    if (editingIdx == null) return;
    skipBlur.current = true;
    if ((items[editingIdx]?.text ?? '') === '') {
      const next = [...items];
      next.splice(editingIdx, 1);
      emit(next);
    }
    setEditingIdx(null);
  };

  const insertAt = (idx: number) => {
    editingIsNew.current = true;
    const next = [...items];
    next.splice(idx, 0, { text: '' });
    emit(next);
    setDraft('');
    setEditingIdx(idx);
  };

  const removeStep = (idx: number) => {
    emit(items.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  // ---- drag reorder ----
  const onDragStart = (idx: number) => {
    dragRef.current = idx;
    dropRef.current = null;
    // defer the re-render out of the dragstart tick — a DOM mutation while Chrome is
    // capturing the drag image aborts the native drag
    window.setTimeout(() => {
      setDraggingIdx(idx);
      setDropAt(null);
    }, 0);
  };
  const onDragEnd = () => {
    dragRef.current = null;
    dropRef.current = null;
    setDraggingIdx(null);
    setDropAt(null);
  };
  // a group label owns every step until the next label; a plain row is a block of one
  const blockOf = (from: number): [number, number] => {
    if (items[from]?.kind !== 'group') return [from, from + 1];
    let end = from + 1;
    while (end < items.length && items[end].kind !== 'group') end += 1;
    return [from, end];
  };
  const commitDrop = () => {
    const from = dragRef.current;
    const gap = dropRef.current;
    if (from == null || gap == null) return;
    const [s, e] = blockOf(from);
    if (gap >= s && gap <= e) return; // dropped within the block itself
    const next = [...items];
    const block = next.splice(s, e - s);
    const at = gap > e ? gap - (e - s) : gap;
    next.splice(at, 0, ...block);
    emit(next);
  };

  // ONE drop target spanning the whole list: works wherever you release, and computes
  // the target gap from the pointer against each row's midpoint.
  const listRef = useRef<HTMLDivElement>(null);
  const [, drop] = useDrop({
    accept: STEP_DND,
    hover: (_item, monitor) => {
      const c = listRef.current;
      const y = monitor.getClientOffset()?.y;
      if (!c || y == null) return;
      const rows = Array.from(
        c.querySelectorAll<HTMLElement>('[data-step-row]'),
      );
      let gap = rows.length;
      for (let i = 0; i < rows.length; i += 1) {
        // collapsed rows are mounted but clipped — their rects still report full height,
        // so the wrapper marker is the reliable "invisible to the pointer" flag
        if (rows[i].closest('[data-collapsed-row="true"]')) continue;
        const r = rows[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) {
          gap = i;
          break;
        }
      }
      // a GROUP can't split another group — snap the target to the nearest boundary
      const from = dragRef.current;
      if (from != null && items[from]?.kind === 'group') {
        const bounds = items
          .map((it, i) => (it.kind === 'group' ? i : -1))
          .filter((i) => i >= 0)
          .concat(items.length);
        gap = bounds.reduce(
          (best, b) => (Math.abs(b - gap) < Math.abs(best - gap) ? b : best),
          bounds[0],
        );
      }
      if (dropRef.current !== gap) {
        dropRef.current = gap;
        setDropAt(gap);
      }
    },
    drop: commitDrop,
  });
  drop(listRef);

  const dragging = draggingIdx != null;
  // dragging a group label collapses every group for the duration — an override, not a
  // mutation of collapsedGroups, so the user's expansion returns on drop
  const groupDragging =
    draggingIdx != null && items[draggingIdx]?.kind === 'group';
  const sectionTitle =
    title ??
    (items.length > 0 ? `${t('Steps')} · ${items.length}` : t('Steps'));

  // live numbering over the steps the list would actually keep — struck rows and group
  // labels don't count
  let liveNo = 0;

  // which group owns each row (drives collapse hiding) + how many steps each holds
  const groupOf: (string | null)[] = [];
  const groupCounts = new Map<number, number>();
  {
    let current: string | null = null;
    let currentIdx = -1;
    items.forEach((it, i) => {
      if (it.kind === 'group') {
        current = groupKey(it);
        currentIdx = i;
        groupCounts.set(i, 0);
        groupOf[i] = null;
      } else {
        groupOf[i] = current;
        if (currentIdx >= 0)
          groupCounts.set(currentIdx, (groupCounts.get(currentIdx) ?? 0) + 1);
      }
    });
  }

  return (
    <Section title={sectionTitle} action={headerAction}>
      {items.length === 0 ? (
        <Gap onInsert={() => insertAt(0)} always label={t('Add step')} />
      ) : (
        <div
          className={`flex flex-col ${
            bounded
              ? 'max-h-[50vh] overflow-y-auto overscroll-contain pr-1'
              : ''
          }`}
          ref={listRef}
        >
          {items.map((item, idx) => {
            const isGroupRow = item.kind === 'group';
            const number = isGroupRow || isStruck(item) ? null : (liveNo += 1);
            const count = isGroupRow ? (groupCounts.get(idx) ?? 0) : 0;
            const hidden =
              !isGroupRow &&
              groupOf[idx] != null &&
              (collapsedGroups.has(groupOf[idx]!) || groupDragging);
            return (
              <div
                key={idx}
                aria-hidden={hidden || undefined}
                data-collapsed-row={hidden ? 'true' : undefined}
                style={{
                  display: 'grid',
                  gridTemplateRows: hidden ? '0fr' : '1fr',
                  transition: 'grid-template-rows 0.18s ease',
                }}
              >
                <div style={{ overflow: 'hidden', minHeight: 0 }}>
                  <Gap
                    onInsert={() => insertAt(idx)}
                    dragging={dragging}
                    isDropTarget={dropAt === idx}
                  />
                  <StepRow
                    idx={idx}
                    item={item}
                    number={number}
                    groupCollapsed={
                      isGroupRow
                        ? collapsedGroups.has(groupKey(item)) || groupDragging
                        : undefined
                    }
                    groupMeta={
                      isGroupRow
                        ? `${count} ${count === 1 ? t('step') : t('steps')}`
                        : undefined
                    }
                    onToggleGroup={
                      isGroupRow ? () => toggleGroup(groupKey(item)) : undefined
                    }
                    editing={editingIdx === idx}
                    draft={draft}
                    inputRef={inputRef}
                    setDraft={setDraft}
                    onStartEdit={startEdit}
                    onRemove={removeStep}
                    onEnter={onEnter}
                    onBlur={onBlur}
                    onEscape={onEscape}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onDecide={onDecide}
                  />
                </div>
              </div>
            );
          })}
          {/* trailing gap keeps the rhythm + hosts the end drop line */}
          <Gap
            onInsert={() => insertAt(items.length)}
            dragging={dragging}
            isDropTarget={dropAt === items.length}
          />
          {!dragging && <AddStepRow onClick={() => insertAt(items.length)} />}
        </div>
      )}
    </Section>
  );
}

export default EditableSteps;
