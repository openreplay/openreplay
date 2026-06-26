import { Button, Input, InputRef, Tooltip } from 'antd';
import { Check, Circle, GitBranch, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TestAlternative } from '../shared/types';
import { Section } from './EntityDrawer';

interface Props {
  steps: string[];
  alternatives?: TestAlternative[];
  /** draft mode: each step gets an include/ignore toggle */
  reviewable?: boolean;
  /** reports the currently-included steps (review mode) */
  onIncludedChange?: (included: string[]) => void;
  /** commit an edit (add / delete / rename steps) */
  onStepsChange: (steps: string[]) => void;
}

/** The steps list, shared by Draft and Test so they look identical.
 *  Read until you click a step — then it edits inline (no edit mode, no flicker).
 *  Hovering a step reveals + (insert below) and delete; drafts add include toggles. */
function EditableSteps({
  steps,
  alternatives,
  reviewable,
  onIncludedChange,
  onStepsChange,
}: Props) {
  const { t } = useTranslation();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [ignored, setIgnored] = useState<Set<number>>(new Set());
  const inputRef = useRef<InputRef>(null);
  // swallow the trailing onBlur that fires when an edit commits via Enter/Esc
  const skipBlur = useRef(false);

  useEffect(() => {
    if (reviewable && onIncludedChange) {
      onIncludedChange(steps.filter((_, i) => !ignored.has(i)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // commit, then open a fresh step right after for fast authoring
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
      // drop a placeholder the user never filled in
      const next = [...steps];
      next.splice(editingIdx, 1);
      setIgnored(new Set());
      onStepsChange(next);
    }
    setEditingIdx(null);
  };

  const insertAfter = (idx: number) => {
    const next = [...steps];
    next.splice(idx + 1, 0, '');
    setIgnored(new Set());
    onStepsChange(next);
    setDraft('');
    setEditingIdx(idx + 1);
  };

  const addStepEnd = () => {
    const next = [...steps, ''];
    setIgnored(new Set());
    onStepsChange(next);
    setDraft('');
    setEditingIdx(next.length - 1);
  };

  const removeStep = (idx: number) => {
    setIgnored(new Set());
    onStepsChange(steps.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const includedCount = steps.length - ignored.size;
  const sectionTitle = reviewable
    ? `${t('Steps')} · ${includedCount}/${steps.length} ${t('included')}`
    : t('Steps');

  return (
    <Section title={sectionTitle}>
      <div className="flex flex-col">
        {steps.map((step, idx) => {
          const isIgnored = ignored.has(idx);
          const fork = alternatives?.find((a) => a.afterStep === idx);
          const editing = editingIdx === idx;
          return (
            <React.Fragment key={idx}>
              <div className="group flex items-start gap-2.5 rounded px-1 -mx-1 py-1 min-h-[30px] hover:bg-gray-lightest">
                {reviewable ? (
                  <Tooltip
                    title={isIgnored ? t('Include step') : t('Ignore step')}
                  >
                    <button
                      type="button"
                      onClick={() => toggleIgnore(idx)}
                      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                        isIgnored
                          ? 'border-gray-light text-disabled-text'
                          : 'bg-green-light border-green-light text-green-dark'
                      }`}
                    >
                      {isIgnored ? <Circle size={9} /> : <Check size={12} />}
                    </button>
                  </Tooltip>
                ) : (
                  <span className="mt-0.5 w-5 text-disabled-text text-xs text-center shrink-0">
                    {idx + 1}
                  </span>
                )}

                {editing ? (
                  <Input
                    ref={inputRef}
                    size="small"
                    variant="borderless"
                    value={draft}
                    placeholder={t('Describe the step')}
                    onChange={(e) => setDraft(e.target.value)}
                    onPressEnter={onEnter}
                    onBlur={onBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') onEscape();
                    }}
                    className="flex-1 px-0!"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(idx)}
                    className={`flex-1 text-left text-sm break-words leading-5 ${
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

                {!editing && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Tooltip title={t('Insert step below')}>
                      <Button
                        type="text"
                        size="small"
                        icon={<Plus size={14} />}
                        aria-label={t('Insert step below')}
                        onClick={() => insertAfter(idx)}
                      />
                    </Tooltip>
                    <Tooltip title={t('Delete step')}>
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<Trash2 size={13} />}
                        aria-label={t('Delete step')}
                        onClick={() => removeStep(idx)}
                      />
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
            </React.Fragment>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addStepEnd}
        className="mt-1.5 flex items-center gap-1.5 text-sm text-disabled-text hover:text-black"
      >
        <Plus size={14} /> {t('Add step')}
      </button>
    </Section>
  );
}

export default EditableSteps;
