import { Button, Popconfirm, Tooltip, message } from 'antd';
import { ChevronRight, Pause, Play, Trash2 } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { MOCK_RUNS } from '../shared/mockData';
import { hasNoEnvironment } from '../shared/store';
import { TestCase } from '../shared/types';
import { getRunResult, isScheduled, relativeTime } from '../shared/utils';
import EditableSteps from './EditableSteps';
import { EntityDrawer, Section, TagEditor } from './EntityDrawer';
import RunSettingsFields, { RunSettings } from './RunSettingsFields';

interface Props {
  test: TestCase | null;
  open: boolean;
  /** open scrolled to the run settings / schedule (from the "Schedule" action) */
  focusSchedule?: boolean;
  onClose: () => void;
  onChange: (updated: TestCase) => void;
  onRemove: (key: string) => void;
  /** the Runs-history shortcut — jump to the Runs tab filtered to this test */
  onViewRuns?: (tc: TestCase) => void;
}

/** A live, approved test. Single-column control panel; the row's actions live in the
 *  header (Run now / Pause) next to the close icon, Delete sits in the footer danger
 *  zone. Edits persist live. Statuses: approved (no schedule) · active (scheduled) ·
 *  paused. Adding a schedule activates the test; clearing it returns to approved. */
function TestDrawer({
  test,
  open,
  focusSchedule,
  onClose,
  onChange,
  onRemove,
  onViewRuns,
}: Props) {
  const { t } = useTranslation();
  const settingsRef = useRef<HTMLDivElement>(null);

  // jump to the schedule when opened via the Schedule action
  useEffect(() => {
    if (open && focusSchedule && settingsRef.current) {
      const el = settingsRef.current;
      const id = window.setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('kai-flash');
        window.setTimeout(() => el.classList.remove('kai-flash'), 1200);
      }, 250);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open, focusSchedule]);

  if (!test) return null;

  const paused = test.status === 'paused';
  // a paused test with no environment can't resume until one is set below
  const resumeBlocked = paused && hasNoEnvironment(test);
  const runs = MOCK_RUNS.filter((r) => r.testName === test.title);
  const lastRun = runs.reduce(
    (latest, r) => (latest && latest.date >= r.date ? latest : r),
    undefined as (typeof runs)[number] | undefined,
  );
  const settings: RunSettings = {
    envNames: test.envNames,
    resolutions: test.resolutions,
    regions: test.regions,
    schedule: test.schedule,
  };

  // run settings persist live; a schedule activates the test, clearing it drops it back
  // to approved. (Pause/Resume is a separate, explicit control below.)
  const patch = (p: Partial<RunSettings>) => {
    const next: TestCase = { ...test, ...p };
    if ('schedule' in p) next.status = isScheduled(p.schedule) ? 'active' : 'approved';
    onChange(next);
  };

  const runNow = () =>
    message.success(`${test.title} — ${t('run started, see Runs')}`);
  const togglePause = () =>
    onChange({ ...test, status: paused ? 'active' : 'paused' });
  const remove = () => {
    onRemove(test.key);
    onClose();
  };

  return (
    <EntityDrawer
      type="test"
      open={open}
      onClose={onClose}
      title={test.title}
      onTitleChange={(title) => onChange({ ...test, title })}
      eyebrow={`${t('Test')} · ${
        paused ? t('Paused') : test.status === 'approved' ? t('Approved') : t('Active')
      }`}
      headerActions={
        <div className="flex items-center gap-2">
          {/* paused: resuming is the main intent, so Resume takes the primary slot */}
          <Button
            type={paused ? 'default' : 'primary'}
            size="small"
            icon={<Play size={13} />}
            onClick={runNow}
          >
            {t('Run now')}
          </Button>
          {/* approved tests have no schedule to pause — they just run on demand */}
          {test.status !== 'approved' && (
            <Tooltip
              title={
                resumeBlocked
                  ? t('Set an environment below to resume this test.')
                  : undefined
              }
            >
              <Button
                type={paused ? 'primary' : 'default'}
                size="small"
                disabled={resumeBlocked}
                icon={paused ? <Play size={13} /> : <Pause size={13} />}
                onClick={togglePause}
              >
                {paused ? t('Resume') : t('Pause')}
              </Button>
            </Tooltip>
          )}
        </div>
      }
      footer={
        <Popconfirm
          title={t('Delete this test?')}
          okText={t('Delete')}
          okButtonProps={{ danger: true }}
          cancelText={t('Cancel')}
          onConfirm={remove}
        >
          <Button type="text" danger icon={<Trash2 size={15} />}>
            {t('Delete test')}
          </Button>
        </Popconfirm>
      }
    >
      {/* bounded: run settings / tags / runs stay reachable even with 50 steps */}
      <EditableSteps
        steps={test.steps}
        bounded
        onStepsChange={(steps) => onChange({ ...test, steps })}
      />

      <div ref={settingsRef}>
        <Section title={t('Run settings')}>
          {test.status === 'approved' && (
            <div className="-mt-1 mb-3 text-xs text-disabled-text">
              {t(
                'Not scheduled — this test runs manually until you set a schedule below.',
              )}
            </div>
          )}
          <RunSettingsFields value={settings} onChange={patch} />
        </Section>
      </div>

      {/* compact — the hint rides the header so tags stay a single row */}
      <Section
        title={t('Tags')}
        className="py-3!"
        action={
          <span className="text-xs text-disabled-text">
            {t('Up to 3 tags')}
          </span>
        }
      >
        <TagEditor
          value={test.tags}
          onChange={(tags) => onChange({ ...test, tags })}
        />
      </Section>

      {/* shortcut into this test's execution history on the Runs tab */}
      {onViewRuns && (
        <Section title={t('Runs')} className="py-3!">
          {runs.length === 0 ? (
            <div className="text-sm text-disabled-text">
              {t('No runs yet — run now or set a schedule above.')}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onViewRuns(test)}
              className="w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2 hover:bg-active-blue transition text-left cursor-pointer"
              style={{ borderColor: 'var(--color-gray-light)' }}
            >
              <span className="flex items-center gap-2 text-sm min-w-0">
                {lastRun && getRunResult(lastRun.status, t)}
                <span className="text-gray-dark whitespace-nowrap">
                  {runs.length} {runs.length === 1 ? t('run') : t('runs')}
                </span>
                {lastRun && (
                  <span className="text-disabled-text truncate">
                    · {t('last')} {relativeTime(lastRun.date)}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1 shrink-0 text-sm text-main">
                {t('View all')}
                <ChevronRight size={15} />
              </span>
            </button>
          )}
        </Section>
      )}
    </EntityDrawer>
  );
}

export default TestDrawer;
