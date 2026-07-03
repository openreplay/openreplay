import { Popover, Tooltip } from 'antd';
import {
  Check,
  Circle,
  CornerDownLeft,
  GitBranch,
  GripVertical,
  History,
  Plus,
  Trash2,
  Undo2,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useTranslation } from 'react-i18next';

import { TestAlternative } from '../shared/types';
import { Section } from './EntityDrawer';

const STEP_DND = 'KAI_STEP';
// muted, semi-transparent blue — shared by the insert line and the drag drop line so
// "add here" and "move here" read identically.
const LINE = 'rgba(54, 108, 217, 0.55)';

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
  /** rendered on the right of the section header (the version switcher) */
  headerAction?: React.ReactNode;
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
  step: string;
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
}

/** One step. Drag the grip (it replaces the number on hover) to reorder. Click the
 *  text to edit it inline — the row tints blue while editing. */
function StepRow({
  idx,
  step,
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
}: StepRowProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: STEP_DND,
    item: () => {
      onDragStart(idx);
      return { idx };
    },
    canDrag: !editing,
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
        style={{ opacity: isDragging ? 0.4 : 1 }}
        className={`group flex items-start gap-2.5 rounded px-1 -mx-1 py-1.5 ${
          editing ? 'bg-active-blue' : 'hover:bg-gray-lightest'
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
        ) : (
          // step number at rest; on row hover it becomes the drag handle in the same
          // slot (inside the row, so moving onto it never loses the hover state)
          <span className="relative w-5 h-6 flex items-center justify-center shrink-0 leading-6">
            <span
              className={`text-sm text-disabled-text ${
                editing ? '' : 'group-hover:opacity-0'
              }`}
            >
              {idx + 1}
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
            onClick={() => onStartEdit(idx)}
            className={`flex-1 text-left text-[15px] leading-6 break-words ${
              isIgnored ? 'line-through text-disabled-text' : ''
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
          <div className="flex items-center gap-0.5 shrink-0 self-start">
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
          <div className="flex items-center gap-0.5 shrink-0 self-start">
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

/** The steps list, shared by Draft and Test so they look identical.
 *  Read until you click a step — then it edits inline (no edit mode, no flicker).
 *  Insert via the blue line between steps; drag the grip to reorder; delete on hover. */
function EditableSteps({
  steps,
  alternatives,
  reviewable,
  onIncludedChange,
  onStepsChange,
  bounded,
  historyFor,
  headerAction,
}: Props) {
  const { t } = useTranslation();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [ignored, setIgnored] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  // swallow the trailing onBlur that fires when an edit commits via Enter/Esc
  const skipBlur = useRef(false);

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

  // focus the active input after it (re)renders — autoFocus is unreliable across inserts
  useEffect(() => {
    if (editingIdx != null) inputRef.current?.focus();
  }, [editingIdx]);

  const toggleIgnore = (idx: number) =>
    setIgnored((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const startEdit = (idx: number) => {
    setDraft(steps[idx] ?? '');
    setEditingIdx(idx);
  };

  // write the draft into `idx`; an emptied step is dropped. Returns the next array.
  const commitInto = (idx: number): string[] => {
    const trimmed = draft.trim();
    const next = [...steps];
    if (trimmed === '') {
      next.splice(idx, 1);
      setIgnored(new Set());
    } else {
      next[idx] = trimmed;
    }
    return next;
  };

  const onEnter = () => {
    if (editingIdx == null) return;
    skipBlur.current = true;
    const next = commitInto(editingIdx);
    if (draft.trim() === '') {
      onStepsChange(next);
      setEditingIdx(null);
      return;
    }
    const at = editingIdx + 1;
    next.splice(at, 0, '');
    setIgnored(new Set());
    onStepsChange(next);
    setDraft('');
    setEditingIdx(at);
  };

  const onBlur = () => {
    if (skipBlur.current) {
      skipBlur.current = false;
      return;
    }
    if (editingIdx == null) return;
    onStepsChange(commitInto(editingIdx));
    setEditingIdx(null);
  };

  const onEscape = () => {
    if (editingIdx == null) return;
    skipBlur.current = true;
    if ((steps[editingIdx] ?? '') === '') {
      const next = [...steps];
      next.splice(editingIdx, 1);
      setIgnored(new Set());
      onStepsChange(next);
    }
    setEditingIdx(null);
  };

  // insert an empty step at `idx` and open it for editing
  const insertAt = (idx: number) => {
    const next = [...steps];
    next.splice(idx, 0, '');
    setIgnored(new Set());
    onStepsChange(next);
    setDraft('');
    setEditingIdx(idx);
  };

  const removeStep = (idx: number) => {
    setIgnored(new Set());
    onStepsChange(steps.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

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
    const next = [...steps];
    const [moved] = next.splice(from, 1);
    const at = gap > from ? gap - 1 : gap;
    if (at === from) return;
    next.splice(at, 0, moved);
    setIgnored(new Set());
    onStepsChange(next);
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
  const includedCount = steps.length - ignored.size;
  const sectionTitle = reviewable
    ? `${t('Steps')} · ${includedCount}/${steps.length} ${t('included')}`
    : steps.length > 0
      ? `${t('Steps')} · ${steps.length}`
      : t('Steps');

  // restore an older wording of one step (from the history popover)
  const restoreText = (idx: number, text: string) =>
    onStepsChange(steps.map((s, i) => (i === idx ? text : s)));

  return (
    <Section title={sectionTitle} action={headerAction}>
      {steps.length === 0 ? (
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
          {steps.map((step, idx) => (
            <React.Fragment key={idx}>
              <Gap
                onInsert={() => insertAt(idx)}
                dragging={dragging}
                isDropTarget={dropAt === idx}
              />
              <StepRow
                idx={idx}
                step={step}
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
              />
            </React.Fragment>
          ))}
          <Gap
            onInsert={() => insertAt(steps.length)}
            dragging={dragging}
            isDropTarget={dropAt === steps.length}
          />
        </div>
      )}
    </Section>
  );
}

export default EditableSteps;
