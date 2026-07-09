import { Button, Dropdown, Popconfirm, Tooltip, message } from 'antd';
import {
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MoveRight,
  Pause,
  Play,
  Trash2,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useActivateVersion,
  useAllRuns,
  useDismissVersion,
  useSettings,
  useTriggerRun,
  useVersionDiff,
} from '../../queries';
import { apiRunToVM, stepsToChanges } from '../shared/adapters';
import {
  StepItem,
  buildReviewItems,
  resolveItems,
  stepHistory,
  testVersion,
} from '../shared/revisions';
import { RunData, TestCase } from '../shared/types';
import {
  VersionLabel,
  formatDuration,
  hasNoEnvironment,
  isScheduled,
  relativeTime,
  stepsToLines,
} from '../shared/utils';
import EditableSteps from './EditableSteps';
import { EntityDrawer, Section, TagEditor } from './EntityDrawer';
import RunSettingsFields, { RunSettings } from './RunSettingsFields';

// The runs list is fetched once and filtered client-side; the API clamps `limit` to 100.
const LOOKUP_LIMIT = 100;

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
  /** "View" on a run icon — open that exact run in the Runs tab */
  onViewRun?: (run: RunData) => void;
  /** creation mode: footer "Create test" instead of header run controls */
  creating?: boolean;
  onCreate?: () => void;
}

/** A live, approved test. Single-column control panel; the row's actions live in the
 *  header (Run now / Pause) next to the close icon, Delete sits in the footer danger
 *  zone. Edits persist live. Statuses: approved (no schedule) · active (scheduled) ·
 *  paused. Adding a schedule activates the test; clearing it returns to approved.
 *  A pending revision turns the steps section into a git-style review. */
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
  const { data: runsData } = useAllRuns({ limit: LOOKUP_LIMIT });
  // Settings → "Pause tests on new revisions": decides whether a pending revision
  // pauses the test (Needs review status, run controls off) or it keeps running.
  const { data: projectSettings } = useSettings();
  const pauseOnRevision = projectSettings?.pauseOnNewRevisions ?? true;
  const triggerMut = useTriggerRun();
  const activateMut = useActivateVersion();
  const dismissMut = useDismissVersion();
  // the git-style diff behind a pending suggestion (active vs proposed steps)
  const { data: versionDiff } = useVersionDiff(
    test?.key,
    !!test?.pendingRevision,
  );

  // Steps edit locally; nothing is sent until "Save steps". Seeded once per mount — the
  // parent keys this drawer by the test id, so opening a different test remounts it fresh
  // (no prop→state sync effect). The ref mirrors state so a click that commits an open
  // input (via blur) then saves reads the just-committed value.
  const savedSteps = test?.steps ?? [];
  const [stepsDraft, setStepsDraft] = useState<string[]>(savedSteps);
  const stepsRef = useRef<string[]>(savedSteps);
  const setSteps = (steps: string[]) => {
    stepsRef.current = steps;
    setStepsDraft(steps);
  };
  const stepsDirty = JSON.stringify(stepsDraft) !== JSON.stringify(savedSteps);

  // review state: the proposal materialised as a live, fully-editable step list
  // (plain rows + marked add/remove rows) — rebuilt when another test or another
  // revision opens. Edits during a review land here, not on test.steps.
  const [reviewItems, setReviewItems] = useState<StepItem[] | null>(null);
  // version switcher: non-null = viewing an older read-only snapshot
  const [viewVersion, setViewVersion] = useState<number | null>(null);
  // Build the review list once the diff arrives (active vs proposed steps → git-style
  // add/remove markers over the active steps). No pending suggestion → no review.
  useEffect(() => {
    if (test?.pendingRevision && versionDiff) {
      const active = stepsToLines(versionDiff.active.steps);
      const latest = stepsToLines(versionDiff.latest.steps);
      setReviewItems(buildReviewItems(active, stepsToChanges(active, latest)));
    } else if (!test?.pendingRevision) {
      setReviewItems(null);
    }
    setViewVersion(null);
  }, [test?.key, test?.pendingRevision, versionDiff]);

  // this test's runs, newest-last — scoped to the viewed version (a run from before a
  // bump belongs to that version's story; no version recorded = v1)
  const runs = useMemo(() => {
    if (!test) return [];
    return (runsData?.items ?? [])
      .filter((r) => r.testId === test.key)
      .map((r) => apiRunToVM(r, test.title))
      .filter((r) => viewVersion == null || (r.version ?? 1) === viewVersion);
  }, [runsData, test, viewVersion]);
  // trend: the last 10 completed runs, oldest → newest (newest on the right)
  const trend = useMemo(
    () =>
      runs
        .filter((r) => r.status !== 'running')
        .sort((a, b) => a.date - b.date)
        .slice(-10),
    [runs],
  );

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
  // a paused test with no environment can't resume until one is set below
  const resumeBlocked = paused && hasNoEnvironment(test);
  const settings: RunSettings = {
    environments: test.environments,
    resolutions: test.resolutions,
    regions: test.regions,
    schedule: test.schedule,
  };

  // run settings persist live; a schedule activates the test, clearing it drops it back
  // to approved. (Pause/Resume is a separate, explicit control below.)
  const patch = (p: Partial<RunSettings>) => {
    const next: TestCase = { ...test, ...p };
    if ('schedule' in p)
      next.status = isScheduled(p.schedule) ? 'active' : 'approved';
    onChange(next);
  };

  const runNow = () =>
    triggerMut.mutate(test.key, {
      onSuccess: () =>
        message.success(`${test.title} — ${t('run started, see Runs')}`),
      onError: () => message.error(t('Failed to start run')),
    });
  const togglePause = () =>
    onChange({ ...test, status: paused ? 'active' : 'paused' });
  const remove = () => {
    onRemove(test.key);
    onClose();
  };

  // ---- pending revision (needs review) ---------------------------------
  // the per-line ✓/✕ pair: clicking a side decides the suggestion; clicking the
  // same side again un-decides it — every click gives feedback
  const decideChange = (idx: number, decision: 'accepted' | 'rejected') =>
    setReviewItems(
      (prev) =>
        prev &&
        prev.map((it, i) =>
          i === idx
            ? { ...it, decision: it.decision === decision ? undefined : decision }
            : it,
        ),
    );
  const changedCount = reviewItems?.filter((it) => it.kind).length ?? 0;
  const decidedCount =
    reviewItems?.filter((it) => it.kind && it.decision).length ?? 0;
  const allAccepted =
    changedCount > 0 &&
    (reviewItems?.every((it) => !it.kind || it.decision === 'accepted') ??
      false);
  const acceptAll = () =>
    setReviewItems(
      (prev) =>
        prev &&
        prev.map((it) => (it.kind ? { ...it, decision: 'accepted' } : it)),
    );
  const reviewSummary =
    changedCount > 0 ? (
      <span className="flex items-center gap-2">
        <span className="text-sm text-disabled-text">
          {decidedCount > 0
            ? `${decidedCount} ${t('of')} ${changedCount} ${t('reviewed')}`
            : `${changedCount} ${changedCount === 1 ? t('change') : t('changes')}`}
        </span>
        <Button
          size="small"
          type="text"
          disabled={allAccepted}
          icon={<CheckCheck size={14} />}
          onClick={acceptAll}
        >
          {t('Accept all')}
        </Button>
      </span>
    ) : undefined;
  // finishing a review closes the drawer — activating adopts the reviewed steps as the
  // new version (partial accept: the client-merged steps + per-change decisions).
  const saveRevision = () => {
    if (!revision?.versionId || !reviewItems) return;
    const decisions = reviewItems
      .filter((it) => it.kind)
      .map((it) => ({ text: it.text, kind: it.kind, decision: it.decision }));
    activateMut.mutate(
      {
        testId: test.key,
        versionId: revision.versionId,
        body: { steps: resolveItems(reviewItems), decisions },
      },
      {
        onSuccess: () =>
          message.success(t('Saved as v{{v}}', { v: revision.toVersion })),
        onError: () => message.error(t('Could not save the new version')),
      },
    );
    onClose();
  };
  const keepVersion = () => {
    if (!revision?.versionId) return;
    dismissMut.mutate(
      { testId: test.key, versionId: revision.versionId },
      {
        onSuccess: () => message.success(t('Kept v{{v}}', { v: version })),
        onError: () => message.error(t('Could not dismiss the suggestion')),
      },
    );
    onClose();
  };

  // ---- version switcher (older versions are read-only history) ---------
  const versionMenu = {
    items: [
      { key: String(version), label: `v${version} · ${t('Current')}` },
      ...[...history]
        .sort((a, b) => b.version - a.version)
        .map((h) => ({
          key: String(h.version),
          label: `v${h.version} · ${versionDate(h.savedAt)}`,
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
          v{viewVersion ?? version}
          <ChevronDown size={13} className="text-gray-medium" />
        </button>
      </Dropdown>
    ) : undefined;

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
          : revision && pauseOnRevision
            ? `${t('Test')} · ${t('Needs review')}`
            : `${t('Test')} · ${
                paused
                  ? t('Paused')
                  : test.status === 'approved'
                    ? t('Approved')
                    : t('Active')
              }${version > 1 ? ` · v${version}` : ''}${
                revision ? ` · ${t('Needs review')}` : ''
              }`
      }
      headerActions={
        creating ? undefined : revision && pauseOnRevision ? (
          // pause-on-revision is ON: nothing runs until the review is done
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
              {t('Keep v{{v}}', { v: version })}
            </Button>
            <Button
              type="primary"
              icon={<Check size={15} />}
              onClick={saveRevision}
            >
              {t('Save v{{v}}', { v: revision.toVersion })}
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
          fully-editable list, with the proposal's add/remove rows dressed as a diff),
          viewing an older snapshot (read-only), or plain editing. */}
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
          onDecide={decideChange}
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
      ) : creating ? (
        // creating: nothing persisted yet, so steps edit live (no Save/Cancel gate)
        <EditableSteps
          steps={test.steps}
          bounded
          onStepsChange={(steps) => onChange({ ...test, steps })}
        />
      ) : (
        // plain editing: local draft + Save bar; version switcher / step history ride
        // the header once older versions exist
        <EditableSteps
          steps={stepsDraft}
          bounded
          headerAction={versionSwitcher}
          historyFor={
            history.length > 0 ? (idx) => stepHistory(test, idx) : undefined
          }
          onStepsChange={setSteps}
          dirty={stepsDirty}
          onSave={() => onChange({ ...test, steps: stepsRef.current })}
          onCancel={() => setSteps(savedSteps)}
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
          <span className="text-sm text-disabled-text">{t('Up to 3 tags')}</span>
        }
      >
        <TagEditor
          value={test.tags}
          onChange={(tags) => onChange({ ...test, tags })}
        />
      </Section>

      {/* Runs: just the "last 10" trend strip inline with the section title
          (glanceable pattern — always-red / just-started-failing / healthy). Each
          icon is one run: hover for result · duration · when, click to open that
          exact run's drawer; the trailing chevron opens the full filtered list. */}
      {(onViewRuns || onViewRun) && !creating && (
        <Section
          title={t('Runs')}
          className="py-3!"
          action={
            runs.length > 0 ? (
              <span className="flex items-center gap-1.5">
                {trend.map((r) => {
                  const failed = r.status === 'failed';
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
              {viewVersion != null
                ? t('No runs on v{{v}}.', { v: viewVersion })
                : t('No runs yet — run now or set a schedule above.')}
            </div>
          ) : null}
        </Section>
      )}
    </EntityDrawer>
  );
}

export default TestDrawer;
