import { Popover, Tooltip } from 'antd';
import {
  Check,
  Circle,
  CornerDownLeft,
  GitBranch,
  GripVertical,
  History,
  Minus,
  Plus,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useTranslation } from 'react-i18next';

import { StepItem, isStruck } from '../shared/revisions';
import { TestAlternative } from '../shared/types';
import { Section } from './EntityDrawer';

const STEP_DND = 'KAI_STEP';
// muted, semi-transparent blue — shared by the insert line and the drag drop line so
// "add here" and "move here" read identically.
const LINE = 'rgba(54, 108, 217, 0.55)';
// git-diff row tints (Mehdi 07-06: "as close to a git diff as possible") — light
// green for additions, light red for deletions, on the brand green/red
const ADDED_BG = 'rgba(66, 174, 94, 0.1)';
const REMOVED_BG = 'rgba(204, 0, 0, 0.06)';

interface Props {
  steps: string[];
  alternatives?: TestAlternative[];
  /** draft mode: each step gets an include/ignore toggle */
  reviewable?: boolean;
  /** reports the currently-included steps (review mode) */
  onIncludedChange?: (included: string[]) => void;
  /** commit an edit (add / delete / rename steps) */
  onStepsChange: (steps: string[]) => void;
  /** cap the list height and scroll inside — for drawers where steps share the
   *  space with other sections (test settings). Drafts scroll the page instead. */
  bounded?: boolean;
  /** what a step said in earlier versions — non-empty turns on the subtle per-step
   *  history affordance (hover → clock icon → popover with restore) */
  historyFor?: (idx: number) => { version: number; text: string }[];
  /** rendered on the right of the section header (version switcher / summary) */
  headerAction?: React.ReactNode;
  /** section title override (version review: "Steps · V1 → V2") */
  title?: React.ReactNode;
  /** version-review mode: rows carry proposed add/remove markers but the whole list
   *  stays fully editable, exactly like a draft — mutations flow through
   *  onItemsChange instead of onStepsChange */
  reviewItems?: StepItem[];
  onItemsChange?: (items: StepItem[]) => void;
  /** the per-line ✓/↺ pair — accept (off=false) or reject (off=true) a suggestion */
  onDecide?: (idx: number, off: boolean) => void;
}

/** The per-suggestion decision: a miniature of the app's Segmented control (gray
 *  track, white selected thumb) — radio semantics, one side always selected. The
 *  ROW's diff color carries the meaning; the pill stays neutral, so it never
 *  fights the red/green background. */
function DecisionPill({
  off,
  onDecide,
}: {
  off?: boolean;
  onDecide: (off: boolean) => void;
}) {
  const { t } = useTranslation();
  const seg =
    'w-6 h-5 flex items-center justify-center rounded transition-all cursor-pointer';
  const selected = 'bg-white shadow-sm text-gray-darkest';
  const idle = 'text-gray-medium hover:text-gray-darkest';
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-md p-0.5"
      style={{ background: 'var(--color-gray-lightest)' }}
      role="radiogroup"
      aria-label={t('Suggestion decision')}
    >
      <Tooltip title={t('Accept suggestion')}>
        <button
          type="button"
          aria-label={t('Accept suggestion')}
          aria-pressed={!off}
          onClick={() => onDecide(false)}
          className={`${seg} ${off ? idle : selected}`}
        >
          <Check size={13} strokeWidth={2.5} />
        </button>
      </Tooltip>
      <Tooltip title={t('Reject suggestion')}>
        <button
          type="button"
          aria-label={t('Reject suggestion')}
          aria-pressed={!!off}
          onClick={() => onDecide(true)}
          className={`${seg} ${off ? selected : idle}`}
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </Tooltip>
    </span>
  );
}

/** The subtle per-step history: a clock icon that only appears on row hover (same
 *  reveal as delete), opening a popover of the step's earlier wordings, each with a
 *  one-click restore. */
function StepHistory({
  entries,
  onRestore,
}: {
  entries: { version: number; text: string }[];
  onRestore: (text: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Popover
      trigger="click"
      placement="left"
      content={
        <div className="flex flex-col w-72">
          <span className="text-xs text-disabled-text mb-1">
            {t('Previous versions of this step')}
          </span>
          {entries.map((e) => (
            <div key={e.version} className="flex items-start gap-2 py-1.5">
              <span
                className="shrink-0 text-xs leading-none text-gray-medium border rounded px-1 py-0.5 font-medium mt-0.5"
                style={{ borderColor: 'var(--color-gray-light)' }}
              >
                v{e.version}
              </span>
              <span className="flex-1 text-sm break-words">{e.text}</span>
              <Tooltip title={t('Restore this wording')}>
                <button
                  type="button"
                  aria-label={t('Restore this wording')}
                  onClick={() => onRestore(e.text)}
                  className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-gray-medium hover:text-gray-darkest hover:bg-gray-lightest"
                >
                  <Undo2 size={14} />
                </button>
              </Tooltip>
            </div>
          ))}
        </div>
      }
    >
      <Tooltip title={t('Step history')}>
        <button
          type="button"
          aria-label={t('Step history')}
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-start w-6 h-6 rounded flex items-center justify-center text-gray-medium hover:text-gray-darkest hover:bg-gray-lightest"
        >
          <History size={14} />
        </button>
      </Tooltip>
    </Popover>
  );
}

/** The gap between two steps — same height whether inserting or dragging, so starting a
 *  drag never reflows the list. At rest it's a generous hover target that reveals a
 *  muted blue line + plus; while dragging it shows the drop line at the target gap. */
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
        className={`relative z-10 flex items-center gap-1 rounded-full bg-blue text-white shadow-sm ${reveal} ${
          label ? 'pl-1 pr-2 py-0.5' : 'p-1'
        }`}
      >
        <Plus size={13} />
        {label && <span className="text-xs font-medium">{label}</span>}
      </div>
    </div>
  );
}

interface StepRowProps {
  idx: number;
  item: StepItem;
  /** live position in the resulting list — null for struck rows (they won't exist) */
  number: number | null;
  editing: boolean;
  reviewable?: boolean;
  isIgnored: boolean;
  fork?: TestAlternative;
  draft: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  setDraft: (v: string) => void;
  onStartEdit: (idx: number) => void;
  onToggleIgnore: (idx: number) => void;
  onRemove: (idx: number) => void;
  onEnter: () => void;
  onBlur: () => void;
  onEscape: () => void;
  onDragStart: (idx: number) => void;
  onDragEnd: () => void;
  historyEntries?: { version: number; text: string }[];
  onRestoreText?: (idx: number, text: string) => void;
  /** version review: accept or reject this row's suggestion */
  onDecide?: (idx: number, off: boolean) => void;
}

/** One step. Drag the grip (it replaces the number on hover) to reorder. Click the
 *  text to edit it inline — the row tints blue while editing. In version review,
 *  proposed rows add their diff dress (blue tint / struck + red −) and a toggle. */
function StepRow({
  idx,
  item,
  number,
  editing,
  reviewable,
  isIgnored,
  fork,
  draft,
  inputRef,
  setDraft,
  onStartEdit,
  onToggleIgnore,
  onRemove,
  onEnter,
  onBlur,
  onEscape,
  onDragStart,
  onDragEnd,
  historyEntries,
  onRestoreText,
  onDecide,
}: StepRowProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);

  const step = item.text;
  const struck = isStruck(item);
  // accepted addition = green row; accepted removal = red row (git-style). A
  // rejected suggestion loses its tint — it reads as the step list staying as-is.
  const addedOn = item.kind === 'added' && !item.off;
  const removedOn = item.kind === 'removed' && !item.off;

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
    <>
      <div
        ref={ref}
        data-step-row
        style={{
          opacity: isDragging ? 0.4 : 1,
          ...(!editing && addedOn ? { background: ADDED_BG } : {}),
          ...(!editing && removedOn ? { background: REMOVED_BG } : {}),
        }}
        className={`group flex items-start gap-2.5 rounded px-1 -mx-1 py-1.5 ${
          editing ? 'bg-active-blue' : struck ? '' : 'hover:bg-gray-lightest'
        }`}
      >
        {reviewable ? (
          <span className="h-6 flex items-center shrink-0">
            <Tooltip title={isIgnored ? t('Include step') : t('Ignore step')}>
              <button
                type="button"
                onClick={() => onToggleIgnore(idx)}
                className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                  isIgnored
                    ? 'border-gray-light text-disabled-text'
                    : 'bg-green-light border-green-light text-green-dark'
                }`}
              >
                {isIgnored ? <Circle size={9} /> : <Check size={12} />}
              </button>
            </Tooltip>
          </span>
        ) : struck ? (
          // a row leaving the test: red − where the number would be, no drag handle
          <span className="w-5 h-6 flex items-center justify-center shrink-0 leading-6">
            <Minus size={14} className="text-red" />
          </span>
        ) : (
          // step number at rest; on row hover it becomes the drag handle in the same
          // slot (inside the row, so moving onto it never loses the hover state)
          <span className="relative w-5 h-6 flex items-center justify-center shrink-0 leading-6">
            <span
              className={`text-sm ${
                editing ? '' : 'group-hover:opacity-0'
              } ${addedOn ? '' : 'text-disabled-text'}`}
              style={addedOn ? { color: 'var(--color-green-dark)' } : undefined}
            >
              {number}
            </span>
            {!editing && (
              <Tooltip title={t('Drag to reorder')}>
                <span
                  ref={handleRef}
                  aria-label={t('Drag to reorder')}
                  className="absolute inset-0 hidden group-hover:flex items-center justify-center cursor-grab text-gray-medium hover:text-gray-darkest"
                >
                  <GripVertical size={15} />
                </span>
              </Tooltip>
            )}
          </span>
        )}

        {editing ? (
          // native input (not antd) so its box exactly matches the static text line —
          // antd's <Input> carries its own line-height/min-height and reflows the row.
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
        ) : (
          <button
            type="button"
            onClick={() => !struck && onStartEdit(idx)}
            className={`flex-1 text-left text-[15px] leading-6 break-words ${
              struck || isIgnored
                ? 'line-through text-disabled-text cursor-default'
                : ''
            }`}
          >
            {step || (
              <span className="text-disabled-text italic">
                {t('Empty — click to edit')}
              </span>
            )}
          </button>
        )}

        {editing ? (
          // mousedown-preventDefault keeps the input focused so its onBlur doesn't
          // fire first and commit/close before the click handler runs
          <div className="flex items-center justify-end gap-0.5 shrink-0 self-start min-w-[60px]">
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
          </div>
        ) : (
          // one right-aligned controls column, same edge on every row, so nothing
          // jumps between suggestion rows (the decision pill) and plain rows (the
          // hover-revealed history/delete)
          <div className="flex items-center justify-end gap-0.5 shrink-0 self-start min-w-[60px]">
            {item.kind && onDecide ? (
              /* a suggestion asks for exactly one decision — the pill carries both
                 actions and shows the current side; no other controls compete */
              <DecisionPill
                off={item.off}
                onDecide={(off) => onDecide(idx, off)}
              />
            ) : (
              <>
                {historyEntries && historyEntries.length > 0 && onRestoreText && (
                  <StepHistory
                    entries={historyEntries}
                    onRestore={(text) => onRestoreText(idx, text)}
                  />
                )}
                <Tooltip title={t('Delete step')}>
                  <button
                    type="button"
                    aria-label={t('Delete step')}
                    onClick={() => onRemove(idx)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 w-6 h-6 rounded flex items-center justify-center text-gray-medium hover:text-red hover:bg-red-lightest"
                  >
                    <Trash2 size={14} />
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        )}
      </div>

      {fork && (
        <div className="flex items-center gap-2 pl-8 pb-1 text-xs text-disabled-text">
          <GitBranch size={12} className="text-gray-medium" />
          <span>
            {t('Alternative')}: {fork.note}
          </span>
        </div>
      )}
    </>
  );
}

/** The steps list, shared by Draft, Test and version review so they look identical.
 *  Read until you click a step — then it edits inline (no edit mode, no flicker).
 *  Insert via the blue line between steps; drag the grip to reorder; delete on hover.
 *  Renaming commits on Enter; only a freshly added blank step chains a new step on
 *  Enter. An empty step is dropped on blur/Escape — abandoning a misclick costs
 *  nothing. */
function EditableSteps({
  steps,
  alternatives,
  reviewable,
  onIncludedChange,
  onStepsChange,
  bounded,
  historyFor,
  headerAction,
  title,
  reviewItems,
  onItemsChange,
  onDecide,
}: Props) {
  const { t } = useTranslation();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [ignored, setIgnored] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  // swallow the trailing onBlur that fires when an edit commits via Enter/Esc
  const skipBlur = useRef(false);
  // whether the row being edited was just created (insert/Enter-chain) — Enter only
  // chains a next blank step while ADDING; a rename just commits
  const editingIsNew = useRef(false);

  // one shape for all modes: version review passes rich rows, everything else
  // wraps the plain strings. Mutations rebuild items and emit through the mode's
  // channel (onItemsChange keeps the add/remove markers alive).
  const review = reviewItems != null;
  const items: StepItem[] = reviewItems ?? steps.map((text) => ({ text }));
  const emit = (next: StepItem[]) =>
    review ? onItemsChange?.(next) : onStepsChange(next.map((i) => i.text));

  // drag-reorder state. Refs mirror state so the (single) drop handler reads fresh values.
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  const dropRef = useRef<number | null>(null);

  useEffect(() => {
    if (reviewable && onIncludedChange) {
      onIncludedChange(steps.filter((_, i) => !ignored.has(i)));
    }
  }, [ignored, steps, reviewable]);

  // focus the active input after it (re)renders — autoFocus is unreliable across
  // inserts. Also drop any leftover skipBlur: when Enter chains a new step, the old
  // input unmounts without ever firing its blur, and a stale flag would swallow the
  // NEXT real blur — leaving an abandoned empty step stuck in edit mode.
  useEffect(() => {
    if (editingIdx != null) {
      skipBlur.current = false;
      inputRef.current?.focus();
    }
  }, [editingIdx]);

  const toggleIgnore = (idx: number) =>
    setIgnored((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const startEdit = (idx: number) => {
    editingIsNew.current = false;
    setDraft(items[idx]?.text ?? '');
    setEditingIdx(idx);
  };

  // write the draft into `idx`; an emptied step is dropped — that's also how an
  // accidental new step is cancelled (clear it, click outside). Returns the next array.
  const commitInto = (idx: number): StepItem[] => {
    const trimmed = draft.trim();
    const next = [...items];
    if (trimmed === '') {
      next.splice(idx, 1);
      setIgnored(new Set());
    } else {
      next[idx] = { ...next[idx], text: trimmed };
    }
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
    // adding: chain the next blank step
    const at = editingIdx + 1;
    next.splice(at, 0, { text: '' });
    setIgnored(new Set());
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
      setIgnored(new Set());
      emit(next);
    }
    setEditingIdx(null);
  };

  // insert an empty step at `idx` and open it for editing
  const insertAt = (idx: number) => {
    editingIsNew.current = true;
    const next = [...items];
    next.splice(idx, 0, { text: '' });
    setIgnored(new Set());
    emit(next);
    setDraft('');
    setEditingIdx(idx);
  };

  const removeStep = (idx: number) => {
    setIgnored(new Set());
    emit(items.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  // restore an older wording of one step (from the history popover)
  const restoreText = (idx: number, text: string) =>
    emit(items.map((it, i) => (i === idx ? { ...it, text } : it)));

  // ---- drag reorder ----
  const onDragStart = (idx: number) => {
    dragRef.current = idx;
    dropRef.current = null;
    setDraggingIdx(idx);
    setDropAt(null);
  };
  const onDragEnd = () => {
    dragRef.current = null;
    dropRef.current = null;
    setDraggingIdx(null);
    setDropAt(null);
  };
  const commitDrop = () => {
    const from = dragRef.current;
    const gap = dropRef.current;
    if (from == null || gap == null) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    const at = gap > from ? gap - 1 : gap;
    if (at === from) return;
    next.splice(at, 0, moved);
    setIgnored(new Set());
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
        const r = rows[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) {
          gap = i;
          break;
        }
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
  const includedCount = items.length - ignored.size;
  const sectionTitle =
    title ??
    (reviewable
      ? `${t('Steps')} · ${includedCount}/${items.length} ${t('included')}`
      : items.length > 0
        ? `${t('Steps')} · ${items.length}`
        : t('Steps'));

  // live numbering over the steps the list would actually keep — struck rows
  // (accepted removals, rejected additions) don't count
  let liveNo = 0;

  return (
    <Section title={sectionTitle} action={headerAction}>
      {items.length === 0 ? (
        <Gap onInsert={() => insertAt(0)} always label={t('Add step')} />
      ) : (
        <div
          className={`flex flex-col ${
            // bounded: long step lists scroll inside so run settings / tags / runs
            // below stay one glance away (Jul 1 review, 50-steps question)
            bounded ? 'max-h-[50vh] overflow-y-auto overscroll-contain pr-1' : ''
          }`}
          ref={listRef}
        >
          {items.map((item, idx) => {
            const number = isStruck(item) ? null : (liveNo += 1);
            return (
              <React.Fragment key={idx}>
                <Gap
                  onInsert={() => insertAt(idx)}
                  dragging={dragging}
                  isDropTarget={dropAt === idx}
                />
                <StepRow
                  idx={idx}
                  item={item}
                  number={number}
                  editing={editingIdx === idx}
                  reviewable={reviewable}
                  isIgnored={ignored.has(idx)}
                  fork={alternatives?.find((a) => a.afterStep === idx)}
                  draft={draft}
                  inputRef={inputRef}
                  setDraft={setDraft}
                  onStartEdit={startEdit}
                  onToggleIgnore={toggleIgnore}
                  onRemove={removeStep}
                  onEnter={onEnter}
                  onBlur={onBlur}
                  onEscape={onEscape}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  historyEntries={historyFor?.(idx)}
                  onRestoreText={historyFor ? restoreText : undefined}
                  onDecide={onDecide}
                />
              </React.Fragment>
            );
          })}
          <Gap
            onInsert={() => insertAt(items.length)}
            dragging={dragging}
            isDropTarget={dropAt === items.length}
          />
        </div>
      )}
    </Section>
  );
}

export default EditableSteps;
