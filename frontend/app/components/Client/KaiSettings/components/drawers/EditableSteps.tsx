import { Button, Input, Tooltip } from 'antd';
import { Check, Circle, GitBranch, Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
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
 *  Read by default, editable on demand; drafts add include/ignore toggles. */
function EditableSteps({
  steps,
  alternatives,
  reviewable,
  onIncludedChange,
  onStepsChange,
}: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editSteps, setEditSteps] = useState<string[]>(steps);
  const [ignored, setIgnored] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (reviewable && onIncludedChange) {
      onIncludedChange(steps.filter((_, i) => !ignored.has(i)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ignored, steps, reviewable]);

  const toggleIgnore = (idx: number) =>
    setIgnored((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const startEdit = () => {
    setEditSteps(steps.length ? [...steps] : ['']);
    setEditing(true);
  };
  const updateStep = (idx: number, value: string) =>
    setEditSteps((prev) => prev.map((s, i) => (i === idx ? value : s)));
  const addStep = () => setEditSteps((prev) => [...prev, '']);
  const removeStep = (idx: number) =>
    setEditSteps((prev) => prev.filter((_, i) => i !== idx));
  const saveEdit = () => {
    onStepsChange(editSteps.map((s) => s.trim()).filter(Boolean));
    setIgnored(new Set());
    setEditing(false);
  };

  const includedCount = steps.length - ignored.size;

  const action = editing ? null : (
    <Button
      type="text"
      size="small"
      icon={<Pencil size={13} />}
      onClick={startEdit}
    >
      {t('Edit')}
    </Button>
  );

  const sectionTitle =
    reviewable && !editing
      ? `${t('Steps')} · ${includedCount}/${steps.length} ${t('included')}`
      : t('Steps');

  return (
    <Section title={sectionTitle} action={action}>
      {editing ? (
        <div className="flex flex-col gap-2">
          {editSteps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-5 text-disabled-text text-xs text-center shrink-0">
                {idx + 1}
              </span>
              <Input
                value={step}
                placeholder={t('Describe the step')}
                onChange={(e) => updateStep(idx, e.target.value)}
                autoFocus={step === '' && idx === editSteps.length - 1}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<Trash2 size={14} />}
                aria-label={t('Remove step')}
                onClick={() => removeStep(idx)}
              />
            </div>
          ))}
          <div>
            <Button size="small" icon={<Plus size={14} />} onClick={addStep}>
              {t('Add step')}
            </Button>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="primary" size="small" onClick={saveEdit}>
              {t('Save')}
            </Button>
            <Button size="small" onClick={() => setEditing(false)}>
              {t('Cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {steps.map((step, idx) => {
            const isIgnored = ignored.has(idx);
            const fork = alternatives?.find((a) => a.afterStep === idx);
            return (
              <React.Fragment key={idx}>
                <div className="flex items-center gap-3 py-1.5 text-sm">
                  {reviewable ? (
                    <Tooltip
                      title={isIgnored ? t('Include step') : t('Ignore step')}
                    >
                      <button
                        type="button"
                        onClick={() => toggleIgnore(idx)}
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                          isIgnored
                            ? 'border-gray-light text-disabled-text'
                            : 'bg-green-light border-green-light text-green-dark'
                        }`}
                      >
                        {isIgnored ? <Circle size={9} /> : <Check size={12} />}
                      </button>
                    </Tooltip>
                  ) : (
                    <span className="w-5 text-disabled-text text-xs text-center shrink-0">
                      {idx + 1}
                    </span>
                  )}
                  <span
                    className={
                      isIgnored ? 'line-through text-disabled-text' : ''
                    }
                  >
                    {step}
                  </span>
                </div>
                {fork && (
                  <div className="flex items-center gap-2 pl-8 pb-1 text-xs text-disabled-text">
                    <GitBranch size={12} className="text-tealx" />
                    <span>
                      {t('Alternative')}: {fork.note}
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </Section>
  );
}

export default EditableSteps;
