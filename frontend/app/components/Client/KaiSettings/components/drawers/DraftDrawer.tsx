import { Button } from 'antd';
import { ArrowLeft, ArrowRight, CalendarClock, Check, X } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { RunDefaults, TestCase } from '../shared/types';
import { isScheduled } from '../shared/utils';
import EditableSteps from './EditableSteps';
import { EntityDrawer, Section, TagEditor } from './EntityDrawer';
import RunSettingsFields, { RunSettings } from './RunSettingsFields';

// Pre-fill env / viewport / region from Settings' defaults; never overwrite real values.
const withDefaults = (tc: TestCase, defaults?: RunDefaults): TestCase => {
  if (!defaults) return tc;
  return {
    ...tc,
    environments: tc.environments?.length
      ? tc.environments
      : defaults.envId
        ? [defaults.envId]
        : tc.environments,
    resolutions: tc.resolutions?.length
      ? tc.resolutions
      : defaults.resolution
        ? [defaults.resolution]
        : tc.resolutions,
    regions: tc.regions?.length
      ? tc.regions
      : defaults.region
        ? [defaults.region]
        : tc.regions,
  };
};

interface Props {
  test: TestCase | null;
  open: boolean;
  onClose: () => void;
  onChange: (updated: TestCase) => void;
  onRemove: (key: string) => void;
  /** Settings → Default run configuration; pre-fills a fresh draft's run settings */
  defaults?: RunDefaults;
}

type WizStep = 0 | 1 | 2;

/** A draft: the agent's proposal. Walk approve → schedule → tag, or dismiss it.
 *  Approving without a schedule leaves the test "approved"; adding one makes it
 *  "active". Nothing is committed until the user finishes (or closes after approving). */
function DraftDrawer({
  test,
  open,
  onClose,
  onChange,
  onRemove,
  defaults,
}: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<TestCase | null>(() =>
    test ? withDefaults(test, defaults) : null,
  );
  // re-seed whenever a different draft lands here — including a deep-linked one that
  // resolves after mount
  const [seededKey, setSeededKey] = useState<string | null>(test?.key ?? null);
  const [step, setStep] = useState<WizStep>(0);
  // true once the user has clicked "Approve steps" — closing now keeps it approved
  const [approved, setApproved] = useState(false);
  // true once the user edits the proposed steps — only then does approving replace the
  // stored steps (otherwise approve is a status-only change)
  const [stepsChanged, setStepsChanged] = useState(false);

  if (test && test.key !== seededKey) {
    setSeededKey(test.key);
    setDraft(withDefaults(test, defaults));
    setStep(0);
    setApproved(false);
    setStepsChanged(false);
  }

  if (!draft) return null;

  const scheduled = isScheduled(draft.schedule);
  const settings: RunSettings = {
    environments: draft.environments,
    resolutions: draft.resolutions,
    regions: draft.regions,
    schedule: draft.schedule,
  };
  const patch = (p: Partial<TestCase>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  // The one client-settable transition is draft → approved; the cron rides along and the
  // runner promotes it to `active`.
  const finalize = () => {
    onChange({ ...draft, status: 'approved', isNew: false, stepsChanged });
    onClose();
  };
  const approveSteps = () => {
    setApproved(true);
    setStep(1);
  };
  const saveDraft = () => {
    onChange({ ...draft, stepsChanged });
    onClose();
  };
  const dismiss = () => {
    onRemove(draft.key);
    toast.success(t('Draft dismissed'));
    onClose();
  };
  const handleClose = () => {
    if (approved) finalize();
    else onClose();
  };

  const stepLabels = [t('Approve'), t('Schedule'), t('Tags')];
  // step 0 is always revisitable; the later steps unlock once the steps are approved
  const goStep = (i: number) => {
    if (i === 0 || approved) setStep(i as WizStep);
  };

  const footer =
    step === 0 ? (
      <div className="flex items-center justify-between">
        {/* Dismiss rejects the proposal → the X ("reject a suggestion") rather than the
            bin ("delete something you built") */}
        <Button type="text" danger icon={<X size={15} />} onClick={dismiss}>
          {t('Dismiss')}
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={saveDraft}>{t('Save draft')}</Button>
          <Button
            type="primary"
            onClick={approveSteps}
            icon={<ArrowRight size={15} />}
            iconPosition="end"
          >
            {t('Approve steps')}
          </Button>
        </div>
      </div>
    ) : step === 1 ? (
      <div className="flex items-center justify-between">
        <Button
          type="text"
          onClick={() => setStep(0)}
          icon={<ArrowLeft size={15} />}
        >
          {t('Back')}
        </Button>
        <div className="flex items-center gap-2">
          <Button type="text" onClick={finalize}>
            {scheduled ? t('Skip tags & finish') : t('Finish without schedule')}
          </Button>
          <Button
            type="primary"
            onClick={() => setStep(2)}
            icon={<ArrowRight size={15} />}
            iconPosition="end"
          >
            {t('Continue to tags')}
          </Button>
        </div>
      </div>
    ) : (
      <div className="flex items-center justify-between">
        <Button
          type="text"
          onClick={() => setStep(1)}
          icon={<ArrowLeft size={15} />}
        >
          {t('Back')}
        </Button>
        <Button type="primary" onClick={finalize} icon={<Check size={15} />}>
          {t('Done')}
        </Button>
      </div>
    );

  return (
    <EntityDrawer
      open={open}
      onClose={handleClose}
      eyebrow={t('Draft')}
      title={draft.title}
      onTitleChange={(title) => patch({ title })}
      footer={footer}
    >
      {/* custom stepper — antd's theme algorithm can't derive a palette from the app's
          CSS-var primary */}
      <div className="px-6 pt-5">
        <div className="flex items-center">
          {stepLabels.map((label, i) => {
            const done = i < step;
            const active = i === step;
            const reachable = i === 0 || approved;
            return (
              <React.Fragment key={label}>
                {i > 0 && (
                  <div
                    className="flex-1 h-px mx-2"
                    style={{
                      background:
                        i <= step
                          ? 'var(--color-main)'
                          : 'var(--color-gray-light)',
                    }}
                  />
                )}
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => goStep(i)}
                  className={`flex items-center gap-2 ${
                    reachable ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={
                      done || active
                        ? { background: 'var(--color-main)', color: '#fff' }
                        : {
                            background: 'var(--color-gray-lightest)',
                            color: 'var(--color-gray-medium)',
                            border: '1px solid var(--color-gray-light)',
                          }
                    }
                  >
                    {done ? <Check size={14} /> : i + 1}
                  </span>
                  <span
                    className={`text-sm ${
                      active
                        ? 'font-medium text-black'
                        : done
                          ? 'text-black'
                          : 'text-disabled-text'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {step === 0 && (
        <EditableSteps
          steps={draft.steps}
          onStepsChange={(steps) => {
            patch({ steps });
            setStepsChanged(true);
          }}
        />
      )}

      {step === 1 && (
        <Section title={t('Where & when it runs')}>
          <RunSettingsFields
            value={settings}
            onChange={patch}
            defaults={defaults}
            defaultHints
          />
          <div className="mt-3 flex items-start gap-2 text-sm text-disabled-text">
            <CalendarClock size={14} className="mt-0.5 shrink-0" />
            <span>
              {scheduled
                ? t('It will run automatically on this schedule.')
                : t(
                    'No schedule yet — the test will be Approved and you can run it manually or schedule it later.',
                  )}
            </span>
          </div>
        </Section>
      )}

      {step === 2 && (
        <Section title={t('Tags')}>
          <div className="text-sm text-disabled-text mb-3">
            {t('Add up to 3 tags to organise this test (optional).')}
          </div>
          <TagEditor value={draft.tags} onChange={(tags) => patch({ tags })} />
        </Section>
      )}
    </EntityDrawer>
  );
}

export default DraftDrawer;
