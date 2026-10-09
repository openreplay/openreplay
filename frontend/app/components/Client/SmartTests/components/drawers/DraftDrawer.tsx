import { Button } from '@/ui/actions/button';
import { useToast } from '@/ui/overlays/toast';
import { ArrowLeft, ArrowRight, CalendarClock, Check, X } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RunDefaults, TestCase } from '../shared/types';
import { isScheduled } from '../shared/utils';
import EditableSteps from './EditableSteps';
import { DrawerFooter, EntityDrawer, Section, TagEditor } from './EntityDrawer';
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
  const toast = useToast();
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
      <DrawerFooter
        left={
          /* Dismiss rejects the proposal → the X ("reject a suggestion") rather than
             the bin ("delete something you built") */
          <Button variant="danger-subtle" onClick={dismiss}>
            <X size={14} />
            {t('Dismiss')}
          </Button>
        }
        right={
          <>
            <Button onClick={saveDraft}>{t('Save draft')}</Button>
            <Button variant="primary" onClick={approveSteps}>
              {t('Approve steps')}
              <ArrowRight size={14} />
            </Button>
          </>
        }
      />
    ) : step === 1 ? (
      <DrawerFooter
        left={
          <Button variant="subtle" onClick={() => setStep(0)}>
            <ArrowLeft size={14} />
            {t('Back')}
          </Button>
        }
        right={
          <>
            <Button variant="subtle" onClick={finalize}>
              <span className="max-sm:hidden">
                {scheduled
                  ? t('Skip tags & finish')
                  : t('Finish without schedule')}
              </span>
              <span className="sm:hidden">{t('Finish')}</span>
            </Button>
            <Button variant="primary" onClick={() => setStep(2)}>
              <span className="max-sm:hidden">{t('Continue to tags')}</span>
              <span className="sm:hidden">{t('Continue')}</span>
              <ArrowRight size={14} />
            </Button>
          </>
        }
      />
    ) : (
      <DrawerFooter
        left={
          <Button variant="subtle" onClick={() => setStep(1)}>
            <ArrowLeft size={14} />
            {t('Back')}
          </Button>
        }
        right={
          <Button variant="primary" onClick={finalize}>
            <Check size={14} />
            {t('Done')}
          </Button>
        }
      />
    );

  return (
    <EntityDrawer
      size="wide"
      open={open}
      onClose={handleClose}
      eyebrow={`${t('Draft')}${draft.isNew ? ` · ${t('New')}` : ''}`}
      title={draft.title}
      onTitleChange={(title) => patch({ title })}
      footer={footer}
    >
      <ol className="m-dwiz" aria-label={t('Review steps')}>
        {stepLabels.map((label, i) => {
          const done = i < step;
          const reachable = i === 0 || approved;
          return (
            <li
              key={label}
              className={`m-dwiz__item${i === step ? ' is-current' : ''}${done ? ' is-done' : ''}`}
              aria-current={i === step ? 'step' : undefined}
            >
              {i > 0 && <span className="m-dwiz__line" aria-hidden="true" />}
              <button
                type="button"
                className="m-dwiz__btn"
                disabled={!reachable}
                onClick={() => goStep(i)}
              >
                <span className="m-dwiz__bullet" aria-hidden="true">
                  {done ? <Check size={11} strokeWidth={2.5} /> : i + 1}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>

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
        <Section
          title={t('Where & when it runs')}
          hint={
            <span className="inline-flex items-start gap-2">
              <CalendarClock size={13} className="mt-0.5 shrink-0" />
              {scheduled
                ? t('It will run automatically on this schedule.')
                : t(
                    'No schedule yet. The test will be Approved, and you can run it manually or schedule it later.',
                  )}
            </span>
          }
        >
          <RunSettingsFields
            value={settings}
            onChange={patch}
            defaults={defaults}
            defaultHints
          />
        </Section>
      )}

      {step === 2 && (
        <Section
          title={t('Tags')}
          hint={t('Add up to 3 tags to organise this test (optional).')}
        >
          <TagEditor value={draft.tags} onChange={(tags) => patch({ tags })} />
        </Section>
      )}
    </EntityDrawer>
  );
}

export default DraftDrawer;
