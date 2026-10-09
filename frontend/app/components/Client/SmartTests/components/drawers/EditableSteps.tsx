import { Tooltip } from '@/ui/overlays/tooltip';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  CornerDownLeft,
  GripVertical,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useTranslation } from 'react-i18next';

import { StepDecision, StepItem, isStruck } from '../shared/revisions';
import { Section } from './EntityDrawer';
import './step-list.css';

const STEP_DND = 'KAI_STEP';

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
  /** an older version: no gaps, grips or actions */
  readOnly?: boolean;
  /** a line under the section title */
  hint?: React.ReactNode;
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
  return (
    <>
      <Tooltip
        title={
          decision === 'accepted'
            ? t('Accepted. Click to undo')
            : t('Accept suggestion')
        }
      >
        <button
          type="button"
          aria-label={t('Accept suggestion')}
          aria-pressed={decision === 'accepted'}
          onClick={() => onDecide('accepted')}
          className={`m-step__act is-yes${decision === 'accepted' ? ' is-on' : ''}`}
        >
          <Check size={13} />
        </button>
      </Tooltip>
      <Tooltip
        title={
          decision === 'rejected'
            ? t('Rejected. Click to undo')
            : t('Reject suggestion')
        }
      >
        <button
          type="button"
          aria-label={t('Reject suggestion')}
          aria-pressed={decision === 'rejected'}
          onClick={() => onDecide('rejected')}
          className={`m-step__act is-no${decision === 'rejected' ? ' is-on' : ''}`}
        >
          <X size={13} />
        </button>
      </Tooltip>
    </>
  );
}

/** A ghosted trailing row: reads as a hint until clicked, then becomes a new step. */
function AddStepRow({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onClick} className="m-step is-add">
      <span className="m-step__lead">
        <Plus size={13} aria-hidden="true" />
      </span>
      <span className="m-step__text">{t('Add step…')}</span>
    </button>
  );
}

/** The gap between two steps — same height whether inserting or dragging, so starting a
 *  drag never reflows the list. "Add here" and "move here" are one line. */
function Gap({
  onInsert,
  dragging,
  isDropTarget,
}: {
  onInsert: () => void;
  dragging?: boolean;
  isDropTarget?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`m-steps__gap${isDropTarget ? ' is-target' : ''}${dragging ? ' is-dragging' : ''}`}
    >
      <button
        type="button"
        className="m-steps__insert"
        aria-label={t('Insert a step here')}
        tabIndex={dragging ? -1 : undefined}
        onClick={onInsert}
      >
        <span className="m-steps__line" aria-hidden="true" />
        <Plus size={12} aria-hidden="true" />
      </button>
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
  /** touch stand-in for drag: shift the row being edited up / down one slot */
  onMove: (dir: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDecide?: (idx: number, decision: StepDecision) => void;
  /** merge review: "· N steps" suffix and collapse state of a group label row */
  groupMeta?: string;
  groupCollapsed?: boolean;
  onToggleGroup?: () => void;
  readOnly?: boolean;
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
  onMove,
  canMoveUp,
  canMoveDown,
  onDecide,
  groupMeta,
  groupCollapsed,
  onToggleGroup,
  readOnly,
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
    canDrag: !editing && !struck && !readOnly,
    end: () => onDragEnd(),
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  preview(ref);
  drag(handleRef);

  const cls = [
    'm-step',
    isGroup ? 'is-group' : '',
    addedOn ? 'is-added' : '',
    removedOn ? 'is-removed' : '',
    struck ? 'is-struck' : '',
    isDragging ? 'is-dragging' : '',
    editing ? 'is-editing' : '',
    readOnly ? 'is-readonly' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      data-step-row
      onClick={isGroup ? onToggleGroup : undefined}
      className={cls}
    >
      {/* the number at rest; on hover the grip takes its slot, so the row never widens */}
      <span className="m-step__lead">
        {isGroup ? (
          <ChevronRight
            size={14}
            className="m-step__chev"
            style={groupCollapsed ? undefined : { transform: 'rotate(90deg)' }}
          />
        ) : (
          <span className="m-step__num">{number ?? ''}</span>
        )}
        {!editing && !struck && !readOnly && (
          <Tooltip title={t('Drag to reorder')}>
            <span
              ref={handleRef}
              aria-label={t('Drag to reorder')}
              // opacity, not display:none — a handle that leaves the layout mid-drag
              // makes Chromium cancel the native drag
              onClick={(e) => e.stopPropagation()}
              className="m-step__grip"
            >
              <GripVertical size={13} />
            </span>
          </Tooltip>
        )}
      </span>

      {(addedOn || removedOn) && (
        <span className="m-step__mark" aria-hidden="true">
          {addedOn ? '+' : '−'}
        </span>
      )}

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          aria-label={t('Step')}
          placeholder={t('What does this step do?')}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEnter();
            else if (e.key === 'Escape') {
              // abandons the line, never the drawer
              e.stopPropagation();
              onEscape();
            }
          }}
          className="m-step__input"
        />
      ) : isGroup ? (
        <span className="m-step__text">
          {step}
          {groupMeta && <span className="m-step__meta"> · {groupMeta}</span>}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => onStartEdit(idx)}
          disabled={struck || readOnly}
          className="m-step__text"
        >
          {step || (
            <span className="m-step__empty">{t('Empty. Click to edit')}</span>
          )}
        </button>
      )}

      {!readOnly && (
        <span className="m-step__actions">
          {editing ? (
            // mousedown-preventDefault keeps the input focused so its onBlur doesn't fire
            // first and commit/close before the click handler runs
            <>
              <button
                type="button"
                aria-label={t('Move step up')}
                disabled={!canMoveUp}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onMove(-1)}
                className="m-step__act is-touch"
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                aria-label={t('Move step down')}
                disabled={!canMoveDown}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onMove(1)}
                className="m-step__act is-touch"
              >
                <ArrowDown size={13} />
              </button>
              <Tooltip title={t('Confirm (Enter)')}>
                <button
                  type="button"
                  aria-label={t('Confirm step')}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onEnter}
                  className="m-step__act is-yes"
                >
                  <CornerDownLeft size={13} />
                </button>
              </Tooltip>
              <Tooltip title={t('Delete step')}>
                <button
                  type="button"
                  aria-label={t('Delete step')}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onRemove(idx)}
                  className="m-step__act"
                >
                  <Trash2 size={13} />
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
                  ? t('Remove label. Its steps join the group above')
                  : t('Delete step')
              }
            >
              <button
                type="button"
                aria-label={
                  isGroup ? t('Remove group label') : t('Delete step')
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(idx);
                }}
                className="m-step__act is-quiet"
              >
                <Trash2 size={13} />
              </button>
            </Tooltip>
          )}
        </span>
      )}
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
  readOnly,
  hint,
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

  // keeps the row in edit mode at its new slot so repeated taps keep moving it
  const moveStep = (dir: -1 | 1) => {
    if (editingIdx == null) return;
    const to = editingIdx + dir;
    if (to < 0 || to >= items.length) return;
    const next = commitInto(editingIdx);
    if (draft.trim() === '') {
      emit(next);
      setEditingIdx(null);
      return;
    }
    const [row] = next.splice(editingIdx, 1);
    next.splice(to, 0, row);
    emit(next);
    setEditingIdx(to);
    // landing inside a collapsed merge group would hide the row being edited
    for (let i = to - 1; i >= 0; i -= 1) {
      if (next[i].kind !== 'group') continue;
      const key = groupKey(next[i]);
      setCollapsedGroups((prev) => {
        if (!prev.has(key)) return prev;
        const open = new Set(prev);
        open.delete(key);
        return open;
      });
      break;
    }
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
  const sectionTitle = title ?? (
    <>
      {t('Steps')}
      {items.length > 0 && (
        <span className="m-dsec__count">{items.length}</span>
      )}
    </>
  );

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
    <Section title={sectionTitle} action={headerAction} hint={hint}>
      {items.length === 0 ? (
        readOnly ? null : (
          <button
            type="button"
            className="m-steps__first"
            onClick={() => insertAt(0)}
          >
            <Plus size={14} aria-hidden="true" />
            {t('Write the first step')}
          </button>
        )
      ) : (
        <div
          className="m-steps"
          style={bounded ? { maxHeight: '46vh', overflowY: 'auto' } : undefined}
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
                className="m-steps__slot"
                style={{ gridTemplateRows: hidden ? '0fr' : '1fr' }}
              >
                <div className="m-steps__clip">
                  {!readOnly && (
                    <Gap
                      onInsert={() => insertAt(idx)}
                      dragging={dragging}
                      isDropTarget={dropAt === idx}
                    />
                  )}
                  <StepRow
                    idx={idx}
                    item={item}
                    number={number}
                    readOnly={readOnly}
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
                    onMove={moveStep}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < items.length - 1}
                    onDecide={onDecide}
                  />
                </div>
              </div>
            );
          })}
          {!readOnly && (
            <>
              {/* trailing gap keeps the rhythm + hosts the end drop line */}
              <Gap
                onInsert={() => insertAt(items.length)}
                dragging={dragging}
                isDropTarget={dropAt === items.length}
              />
              {!dragging && (
                <AddStepRow onClick={() => insertAt(items.length)} />
              )}
            </>
          )}
        </div>
      )}
    </Section>
  );
}

export default EditableSteps;
