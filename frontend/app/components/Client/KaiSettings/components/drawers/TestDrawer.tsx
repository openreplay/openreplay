import { Button, Popconfirm, Tooltip, message } from 'antd';
import { Check, ChevronRight, Pause, Play, Trash2, X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { MOCK_RUNS } from '../shared/mockData';
import { hasNoEnvironment } from '../shared/store';
import { RunData, TestCase } from '../shared/types';
import { formatDuration, isScheduled, relativeTime } from '../shared/utils';
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
  /** "View all runs" — jump to the Runs tab filtered to this test */
  onViewRuns?: (tc: TestCase) => void;
  /** "View" on the last-failed-run row — open that exact run in the Runs tab */
  onViewRun?: (run: RunData) => void;
  /** creation mode: footer "Create test" instead of header run controls */
  creating?: boolean;
  onCreate?: () => void;
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
  onViewRun,
  creating,
  onCreate,
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
  // trend: the last 10 completed runs, oldest → newest (newest on the right)
  const trend = runs
    .filter((r) => r.status !== 'running')
    .sort((a, b) => a.date - b.date)
    .slice(-10);
  // the one thing worth surfacing — the most recent failure *within that same
  // window*, so it stays consistent with what the dots show. A test with no
  // failures in that window has nothing here (empty state instead).
  const lastFailedRun = trend
    .filter((r) => r.status === 'failed')
    .reduce(
      (latest, r) => (latest && latest.date >= r.date ? latest : r),
      undefined as RunData | undefined,
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
      eyebrow={
        creating
          ? `${t('Test')} · ${t('New')}`
          : `${t('Test')} · ${
              paused
                ? t('Paused')
                : test.status === 'approved'
                  ? t('Approved')
                  : t('Active')
            }`
      }
      headerActions={
        creating ? undefined : (
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
        )
      }
      footer={
        creating ? (
          // creation flow: commit action lives in the footer, like the draft workflow
          <div className="flex items-center justify-between">
            <Button type="text" onClick={onClose}>
              {t('Discard')}
            </Button>
            <Button type="primary" icon={<Check size={15} />} onClick={onCreate}>
              {t('Create test')}
            </Button>
          </div>
        ) : (
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
        )
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
            <div className="-mt-1 mb-3 text-sm text-disabled-text">
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
          <span className="text-sm text-disabled-text">
            {t('Up to 3 tags')}
          </span>
        }
      >
        <TagEditor
          value={test.tags}
          onChange={(tags) => onChange({ ...test, tags })}
        />
      </Section>

      {/* Runs: a "last 10" trend strip inline with the section title (glanceable
          pattern — always-red / just-started-failing / healthy), and below it just
          the one thing worth acting on — the most recent failure. Each element is a
          single run, not an aggregate: dots are read-only history, the failed-run
          row opens that exact run, "View all" opens the full filtered list. */}
      {(onViewRuns || onViewRun) && !creating && (
        <Section
          title={t('Runs')}
          className="py-3!"
          action={
            trend.length > 0 ? (
              <span className="flex items-center gap-1.5">
                {trend.map((r) => {
                  const failed = r.status === 'failed';
                  return (
                    <Tooltip
                      key={r.key}
                      title={`${failed ? t('Failed') : t('Passed')} · ${relativeTime(r.date)}`}
                    >
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-white"
                        style={{
                          border: `1.5px solid ${
                            failed ? 'var(--color-red)' : 'var(--color-green)'
                          }`,
                        }}
                        aria-label={failed ? t('Failed run') : t('Passed run')}
                      >
                        {failed ? (
                          <X size={9} strokeWidth={3} className="text-red" />
                        ) : (
                          <Check size={9} strokeWidth={3} className="text-green" />
                        )}
                      </span>
                    </Tooltip>
                  );
                })}
                <Tooltip title={t('Last {{count}} runs, oldest to most recent', { count: trend.length })}>
                  <ChevronRight
                    size={14}
                    className="text-disabled-text shrink-0"
                  />
                </Tooltip>
              </span>
            ) : undefined
          }
        >
          {runs.length === 0 ? (
            <div className="text-sm text-disabled-text">
              {t('No runs yet — run now or set a schedule above.')}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {lastFailedRun ? (
                <button
                  type="button"
                  onClick={() => onViewRun?.(lastFailedRun)}
                  aria-label={t('View this failed run')}
                  className="w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 hover:bg-active-blue transition text-left cursor-pointer"
                  style={{ borderColor: 'var(--color-gray-light)' }}
                >
                  <span className="flex items-center gap-2 text-sm min-w-0">
                    <span className="text-disabled-text whitespace-nowrap">
                      {t('Last failed run')}
                    </span>
                    {lastFailedRun.duration != null && (
                      <span className="text-gray-dark whitespace-nowrap">
                        {formatDuration(lastFailedRun.duration)}
                      </span>
                    )}
                    <span className="text-disabled-text truncate">
                      · {relativeTime(lastFailedRun.date)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0 text-sm text-main">
                    {t('View')}
                    <ChevronRight size={15} />
                  </span>
                </button>
              ) : trend.length > 0 ? (
                <div
                  className="text-sm text-disabled-text rounded-lg border px-3 py-2.5"
                  style={{ borderColor: 'var(--color-gray-light)' }}
                >
                  {t('No failures in the last {{count}} runs', {
                    count: trend.length,
                  })}
                </div>
              ) : null}

              {onViewRuns && (
                <button
                  type="button"
                  onClick={() => onViewRuns(test)}
                  className="self-start flex items-center gap-1 text-sm text-main"
                >
                  {t('View all')} {runs.length}{' '}
                  {runs.length === 1 ? t('run') : t('runs')}
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          )}
        </Section>
      )}
    </EntityDrawer>
  );
}

export default TestDrawer;
