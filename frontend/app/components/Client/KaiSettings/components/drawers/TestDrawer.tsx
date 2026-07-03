import { Button, Dropdown, Popconfirm, Tooltip, message } from 'antd';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MoveRight,
  Pause,
  Play,
  Trash2,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MOCK_RUNS } from '../shared/mockData';
import {
  StepItem,
  applyRevision,
  buildReviewItems,
  keepCurrentVersion,
  resolveItems,
  stepHistory,
  testVersion,
} from '../shared/revisions';
import { hasNoEnvironment } from '../shared/store';
import { RunData, TestCase } from '../shared/types';
import {
  VersionLabel,
  formatDuration,
  isScheduled,
  relativeTime,
} from '../shared/utils';
import EditableSteps from './EditableSteps';
import { EntityDrawer, Section, TagEditor } from './EntityDrawer';
import RunSettingsFields, { RunSettings } from './RunSettingsFields';

const versionDate = (ts: number): string =>
  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

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

  // review state: the proposal materialised as a live, fully-editable step list
  // (plain rows + marked add/remove rows) — rebuilt when another test or another
  // revision opens. Edits during a review land here, not on test.steps.
  const [reviewItems, setReviewItems] = useState<StepItem[] | null>(null);
  // version switcher: non-null = viewing an older read-only snapshot
  const [viewVersion, setViewVersion] = useState<number | null>(null);
  useEffect(() => {
    setReviewItems(
      test?.pendingRevision
        ? buildReviewItems(test.steps, test.pendingRevision.changes)
        : null,
    );
    setViewVersion(null);
  }, [test?.key, test?.pendingRevision]);

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
  const revision = test.pendingRevision;
  const version = testVersion(test);
  const history = test.history ?? [];
  const viewedSnapshot =
    viewVersion != null
      ? history.find((h) => h.version === viewVersion)
      : undefined;

  // ---- pending revision (needs review) ---------------------------------
  // ✕ on a struck row: keep the step — the removal marker clears and the row is a
  // plain, editable step again (re-deleting it is just the normal trash)
  const keepStep = (idx: number) =>
    setReviewItems(
      (prev) =>
        prev && prev.map((it, i) => (i === idx ? { text: it.text } : it)),
    );
  // live count of proposal rows still in the list, next to Steps · V1 → V2
  const changedCount = reviewItems?.filter((it) => it.kind).length ?? 0;
  const reviewSummary =
    changedCount > 0 ? (
      <span className="text-sm text-disabled-text">
        {changedCount} {changedCount === 1 ? t('change') : t('changes')}
      </span>
    ) : undefined;
  const saveRevision = () => {
    if (!revision || !reviewItems) return;
    onChange(applyRevision(test, resolveItems(reviewItems), Date.now()));
    message.success(
      test.status === 'active'
        ? t('Saved as V{{v}} — schedule resumed', { v: revision.toVersion })
        : t('Saved as V{{v}}', { v: revision.toVersion }),
    );
  };
  const keepVersion = () => {
    if (!revision) return;
    onChange(keepCurrentVersion(test));
    message.success(t('Kept V{{v}}', { v: version }));
  };

  // ---- version switcher (older versions are read-only history) ---------
  const versionMenu = {
    items: [
      {
        key: String(version),
        label: `V${version} · ${t('Current')}`,
      },
      ...[...history]
        .sort((a, b) => b.version - a.version)
        .map((h) => ({
          key: String(h.version),
          label: `V${h.version} · ${versionDate(h.savedAt)}`,
        })),
    ],
    selectedKeys: [String(viewVersion ?? version)],
    onClick: ({ key }: { key: string }) =>
      setViewVersion(Number(key) === version ? null : Number(key)),
  };
  // the version chip + dropdown next to the Steps title — only once v2 exists
  const versionSwitcher =
    history.length > 0 ? (
      <Dropdown menu={versionMenu} trigger={['click']} placement="bottomRight">
        <button
          type="button"
          aria-label={t('Switch version')}
          className="flex items-center gap-1 text-sm text-gray-dark border rounded px-2 py-0.5 hover:bg-gray-lightest"
          style={{ borderColor: 'var(--color-gray-light)' }}
        >
          V{viewVersion ?? version}
          <ChevronDown size={13} className="text-gray-medium" />
        </button>
      </Dropdown>
    ) : undefined;
  // a paused test with no environment can't resume until one is set below
  const resumeBlocked = paused && hasNoEnvironment(test);
  const runs = MOCK_RUNS.filter((r) => r.testName === test.title);
  // trend: the last 10 completed runs, oldest → newest (newest on the right)
  const trend = runs
    .filter((r) => r.status !== 'running')
    .sort((a, b) => a.date - b.date)
    .slice(-10);
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
          : revision
            ? `${t('Test')} · ${t('Needs review')}`
            : `${t('Test')} · ${
                paused
                  ? t('Paused')
                  : test.status === 'approved'
                    ? t('Approved')
                    : t('Active')
              }${version > 1 ? ` · V${version}` : ''}`
      }
      headerActions={
        creating ? undefined : revision ? (
          // a pending revision pauses the runs — nothing to start until it's reviewed
          <Tooltip title={t('Runs are paused until the new version is reviewed.')}>
            <Button size="small" disabled icon={<Play size={13} />}>
              {t('Run now')}
            </Button>
          </Tooltip>
        ) : (
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
        ) : revision ? (
          // reviewing: stay on the current version, or save the reviewed one
          <div className="flex items-center justify-between">
            <Button type="text" onClick={keepVersion}>
              {t('Keep V{{v}}', { v: version })}
            </Button>
            <Button
              type="primary"
              icon={<Check size={15} />}
              onClick={saveRevision}
            >
              {t('Save V{{v}}', { v: revision.toVersion })}
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
      {/* the steps section wears three hats: reviewing a proposed version (the same
          fully-editable list, with the proposal's add/remove rows dressed as a
          diff), viewing an older snapshot (read-only), or plain editing */}
      {revision && reviewItems ? (
        <EditableSteps
          steps={[]}
          bounded
          title={
            // same version chips as the table's title label, gray arrow between
            <span className="flex items-center gap-1.5">
              {t('Steps')}
              <span className="text-gray-medium font-normal">·</span>
              <VersionLabel version={version} always />
              <MoveRight size={15} className="text-gray-medium" />
              <VersionLabel version={revision.toVersion} always />
            </span>
          }
          headerAction={reviewSummary}
          reviewItems={reviewItems}
          onItemsChange={setReviewItems}
          onKeepStep={keepStep}
          onStepsChange={() => {}}
        />
      ) : viewedSnapshot ? (
        <Section
          title={
            // an approved version is history — read-only, no way back; the version
            // dropdown already names it (no chip), the rest fits the title line.
            <span className="flex items-center gap-1.5">
              {`${t('Steps')} · ${viewedSnapshot.steps.length}`}
              <span className="text-sm text-disabled-text font-normal">
                {t('saved {{date}} · read-only', {
                  date: versionDate(viewedSnapshot.savedAt),
                })}
              </span>
            </span>
          }
          action={versionSwitcher}
        >
          <div className="flex flex-col max-h-[50vh] overflow-y-auto overscroll-contain pr-1">
            {viewedSnapshot.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded px-1 -mx-1 py-1.5"
              >
                <span className="w-5 h-6 flex items-center justify-center shrink-0 leading-6 text-sm text-disabled-text">
                  {idx + 1}
                </span>
                <span className="flex-1 text-[15px] leading-6 break-words text-gray-dark">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        /* bounded: run settings / tags / runs stay reachable even with 50 steps */
        <EditableSteps
          steps={test.steps}
          bounded
          headerAction={versionSwitcher}
          historyFor={history.length > 0 ? (idx) => stepHistory(test, idx) : undefined}
          onStepsChange={(steps) => onChange({ ...test, steps })}
        />
      )}

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

      {/* Runs: just the "last 10" trend strip inline with the section title
          (glanceable pattern — always-red / just-started-failing / healthy).
          Each icon is one run: hover for result · duration · when, click to open
          that exact run's drawer; the trailing chevron opens the full filtered list. */}
      {(onViewRuns || onViewRun) && !creating && (
        <Section
          title={t('Runs')}
          className="py-3!"
          action={
            runs.length > 0 ? (
              <span className="flex items-center gap-1.5">
                {trend.map((r) => {
                  const failed = r.status === 'failed';
                  // same icons as the Failed/Passed pill everywhere else (getRunResult)
                  // — a custom heavier-stroke circle here read inconsistent next to it
                  const Icon = failed ? XCircle : CheckCircle2;
                  const info = [
                    failed ? t('Failed') : t('Passed'),
                    r.duration != null ? formatDuration(r.duration) : null,
                    relativeTime(r.date),
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <Tooltip key={r.key} title={info}>
                      <button
                        type="button"
                        onClick={() => onViewRun?.(r)}
                        aria-label={`${info} — ${t('View run')}`}
                        className="flex items-center shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                      >
                        <Icon
                          size={14}
                          className={failed ? 'text-red' : 'text-green'}
                        />
                      </button>
                    </Tooltip>
                  );
                })}
                {onViewRuns && (
                  <Tooltip
                    title={t('View all {{count}} runs', { count: runs.length })}
                  >
                    <button
                      type="button"
                      onClick={() => onViewRuns(test)}
                      aria-label={t('View all runs')}
                      className="text-disabled-text hover:text-main transition-colors shrink-0 flex items-center"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </Tooltip>
                )}
              </span>
            ) : undefined
          }
        >
          {runs.length === 0 ? (
            <div className="text-sm text-disabled-text">
              {t('No runs yet — run now or set a schedule above.')}
            </div>
          ) : null}
        </Section>
      )}
    </EntityDrawer>
  );
}

export default TestDrawer;
