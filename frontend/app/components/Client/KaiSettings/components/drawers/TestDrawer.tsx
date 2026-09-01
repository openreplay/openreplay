import { App, Button, Dropdown, Popconfirm, Tooltip } from 'antd';
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
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import {
  useActivateVersion,
  useDismissVersion,
  useRuns,
  useSettings,
  useTriggerRun,
  useVersion,
  useVersionDiff,
  useVersions,
} from '../../queries';
import { apiRunToVM, stepsToChanges } from '../shared/adapters';
import {
  StepItem,
  buildReviewItems,
  resolveItems,
  testVersion,
} from '../shared/revisions';
import { RunData, TestCase } from '../shared/types';
import {
  LOOKUP_LIMIT,
  VersionLabel,
  formatDuration,
  hasNoEnvironment,
  relativeTime,
  stepsToLines,
} from '../shared/utils';
import EditableSteps from './EditableSteps';
import { EntityDrawer, Section, TagEditor } from './EntityDrawer';
import RunSettingsFields, { RunSettings } from './RunSettingsFields';

const versionDate = (ts: number): string =>
  new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

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
  /** merge review: accept flattens the arranged groups into one step list (the parent
   *  posts it as a new test + deletes the sources); cancel drops the pending merge */
  onMergeAccept?: (steps: string[]) => void;
  onCancelMerge?: () => void;
}

/** A live, approved test. Edits buffer locally and commit on Save — the drawer's one
 *  commit point. Adding a schedule activates the test (the runner promotes it on the
 *  cron); clearing it returns to approved. A pending revision turns the steps section
 *  into a git-style review. */
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
  onMergeAccept,
  onCancelMerge,
}: Props) {
  const { t } = useTranslation();
  const settingsRef = useRef<HTMLDivElement>(null);
  const { data: runsData } = useRuns(test?.key, { limit: LOOKUP_LIMIT });
  // Settings → "Pause tests on new revisions": decides whether a pending revision pauses
  // the test (run controls off) or it keeps running.
  const { data: projectSettings } = useSettings();
  const pauseOnRevision = projectSettings?.pauseOnNewRevisions ?? true;
  const triggerMut = useTriggerRun();
  const activateMut = useActivateVersion();
  const dismissMut = useDismissVersion();
  const { data: versionDiff } = useVersionDiff(
    test?.key,
    !!test?.pendingRevision,
  );
  // pending/rejected rows are owned by the review flow, not the switcher
  const { data: versionsData } = useVersions(test?.key, open && !creating);
  const versionItems = useMemo(
    () =>
      (versionsData?.items ?? []).filter(
        (v) => v.status !== 'pending' && v.status !== 'rejected',
      ),
    [versionsData],
  );

  const { modal } = App.useApp();
  // Buffered edits — nothing persists until Save. Only the user-editable fields live
  // here; status, the pending revision and the run history always read from `test`, so a
  // background refetch still shows through. Dropped whenever a different test lands here
  // (including a deep-linked one that resolves after mount).
  const [edits, setEdits] = useState<Partial<TestCase>>({});
  // stepsChanged → the update PUT replaces `steps`; plain metadata edits must not
  const [stepsDirty, setStepsDirty] = useState(false);
  const [seededKey, setSeededKey] = useState<string | null>(test?.key ?? null);
  if (test && test.key !== seededKey) {
    setSeededKey(test.key);
    setEdits({});
    setStepsDirty(false);
  }
  const dirty = Object.keys(edits).length > 0;

  // the proposal materialised as a live, fully-editable step list; edits during a review
  // land here, not on test.steps
  const [reviewItems, setReviewItems] = useState<StepItem[] | null>(null);
  // merge review: the SAME editable list, each source test's steps under a group label
  const [mergeItems, setMergeItems] = useState<StepItem[] | null>(null);
  // non-null = viewing an older read-only snapshot
  const [viewVersion, setViewVersion] = useState<number | null>(null);
  const viewVersionId =
    viewVersion != null
      ? versionItems.find((v) => v.version === viewVersion)?.versionId
      : undefined;
  const { data: viewedVersionDetail } = useVersion(test?.key, viewVersionId);

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

  // seed the merge-review list from the pending merge's groups. Each label carries a
  // stable id so two sources sharing a title stay independent.
  useEffect(() => {
    setMergeItems(
      test?.pendingMerge
        ? test.pendingMerge.groups.flatMap((g, i) => [
            { text: g.title, kind: 'group' as const, id: `group-${i}` },
            ...g.steps.map((text) => ({ text })),
          ])
        : null,
    );
  }, [test?.key, test?.pendingMerge]);

  // scoped to the viewed version (a run from before a bump belongs to that version's
  // story; no version recorded = v1)
  const runs = useMemo(() => {
    if (!test) return [];
    return (runsData?.items ?? [])
      .map((r) => apiRunToVM(r, test.title))
      .filter((r) => viewVersion == null || (r.version ?? 1) === viewVersion);
  }, [runsData, test, viewVersion]);
  // the last 10 completed runs, oldest → newest
  const trend = useMemo(
    () =>
      runs
        .filter((r) => r.status !== 'running')
        .sort((a, b) => a.date - b.date)
        .slice(-10),
    [runs],
  );

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
  const merge = test.pendingMerge;
  const version = testVersion(test);
  const pastVersions = versionItems
    .filter((v) => v.version !== version)
    .sort((a, b) => b.version - a.version);
  const viewedSnapshot =
    viewVersion != null
      ? {
          version: viewVersion,
          savedAt: viewedVersionDetail
            ? new Date(viewedVersionDetail.createdAt).getTime()
            : 0,
          steps: viewedVersionDetail
            ? stepsToLines(viewedVersionDetail.steps)
            : [],
        }
      : undefined;
  // What the fields render: the stored test with the unsaved edits laid over it. While
  // creating, the parent owns the unsaved test, so it is already the live copy.
  const view: TestCase = creating ? test : { ...test, ...edits };
  const resumeBlocked = paused && hasNoEnvironment(view);
  const settings: RunSettings = {
    environments: view.environments,
    resolutions: view.resolutions,
    regions: view.regions,
    schedule: view.schedule,
  };
  // only a scheduled test has runs to pause; approved ones run on demand
  const canPause = paused || test.status === 'active';

  // Buffer an edit (or, while creating, hand it straight to the parent). A schedule
  // change writes cron only — the runner owns the approved ↔ active promotion, so the
  // status re-reads from the server after Save.
  const patch = (p: Partial<TestCase>) => {
    if (creating) {
      onChange({ ...test, ...p });
      return;
    }
    setEdits((prev) => ({ ...prev, ...p }));
  };
  const patchSteps = (steps: string[]) => {
    patch({ steps });
    setStepsDirty(true);
  };
  const save = () => {
    onChange({ ...test, ...edits, stepsChanged: stepsDirty });
    setEdits({});
    setStepsDirty(false);
    onClose();
  };
  // closing with buffered edits would silently drop them
  const handleClose = () => {
    if (!dirty) {
      onClose();
      return;
    }
    modal.confirm({
      title: t('Discard unsaved changes?'),
      content: t('The edits you made to this test will be lost.'),
      okText: t('Discard'),
      okButtonProps: { danger: true },
      cancelText: t('Keep editing'),
      onOk: onClose,
    });
  };

  const runNow = () =>
    triggerMut.mutate(test.key, {
      onSuccess: () =>
        toast.success(`${test.title} — ${t('run started, see Runs')}`),
      onError: () => toast.error(t('Failed to start run')),
    });
  // A header action, not an edit: it commits the status on its own and leaves whatever
  // is buffered in the form for Save.
  const togglePause = () =>
    onChange({ ...test, status: paused ? 'active' : 'paused' });
  const remove = () => {
    onRemove(test.key);
    onClose();
  };

  // ---- pending revision (needs review) ---------------------------------
  // clicking a side decides the suggestion; clicking the same side again un-decides it
  const decideChange = (idx: number, decision: 'accepted' | 'rejected') =>
    setReviewItems(
      (prev) =>
        prev &&
        prev.map((it, i) =>
          i === idx
            ? {
                ...it,
                decision: it.decision === decision ? undefined : decision,
              }
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
            ? t('{{done}} of {{total}} reviewed', {
                done: decidedCount,
                total: changedCount,
              })
            : t('{{count}} changes', { count: changedCount })}
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
  // partial accept: the client-merged steps + the per-change decisions
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
          toast.success(t('Saved as v{{v}}', { v: revision.toVersion })),
        onError: () => toast.error(t('Could not save the new version')),
      },
    );
    onClose();
  };
  const keepVersion = () => {
    if (!revision?.versionId) return;
    dismissMut.mutate(
      { testId: test.key, versionId: revision.versionId },
      {
        onSuccess: () => toast.success(t('Kept v{{v}}', { v: version })),
        onError: () => toast.error(t('Could not dismiss the suggestion')),
      },
    );
    onClose();
  };

  // ---- pending merge ----------------------------------------------------
  const mergedSteps =
    mergeItems?.filter((it) => it.kind !== 'group' && it.text.trim()) ?? [];
  const mergedGroupCount =
    mergeItems?.filter((it) => it.kind === 'group').length ?? 0;
  const acceptMerge = () => {
    if (!merge) return;
    onMergeAccept?.(mergedSteps.map((it) => it.text));
    onClose();
  };
  const cancelMerge = () => {
    onCancelMerge?.();
    onClose();
  };

  // ---- version switcher (older versions are read-only history) ---------
  const versionMenu = {
    items: [
      { key: String(version), label: `v${version} · ${t('Current')}` },
      ...pastVersions.map((v) => ({
        key: String(v.version),
        label: `v${v.version} · ${versionDate(new Date(v.createdAt).getTime())}`,
      })),
    ],
    selectedKeys: [String(viewVersion ?? version)],
    onClick: ({ key }: { key: string }) =>
      setViewVersion(Number(key) === version ? null : Number(key)),
  };
  const versionSwitcher =
    pastVersions.length > 0 ? (
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
      open={open}
      onClose={handleClose}
      title={view.title}
      onTitleChange={(title) => patch({ title })}
      autoEditTitle={creating}
      eyebrow={
        creating
          ? `${t('Test')} · ${t('New')}`
          : merge
            ? `${t('Test')} · ${t('Merge review')}`
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
      /* the header carries no primary action — running and saving live in the footer.
         Pause / Resume is the one control here, and only for a scheduled test. */
      headerActions={
        creating ? undefined : merge ? (
          <span className="text-sm text-disabled-text">
            {t('Runs paused during merge review')}
          </span>
        ) : revision && pauseOnRevision ? (
          <span className="text-sm text-disabled-text">
            {t('Runs paused until reviewed')}
          </span>
        ) : canPause ? (
          <Tooltip
            title={
              resumeBlocked
                ? t('Set an environment below to resume this test.')
                : undefined
            }
          >
            <Button
              size="small"
              disabled={resumeBlocked}
              icon={paused ? <Play size={13} /> : <Pause size={13} />}
              onClick={togglePause}
            >
              {paused ? t('Resume') : t('Pause')}
            </Button>
          </Tooltip>
        ) : undefined
      }
      footer={
        creating ? (
          <div className="flex items-center justify-between">
            <Button type="text" onClick={onClose}>
              {t('Discard')}
            </Button>
            <Button
              type="primary"
              icon={<Check size={15} />}
              onClick={onCreate}
            >
              {t('Create test')}
            </Button>
          </div>
        ) : merge ? (
          <div className="flex items-center justify-between">
            <Button type="text" onClick={cancelMerge}>
              {t('Cancel merge')}
            </Button>
            <Button
              type="primary"
              icon={<Check size={15} />}
              onClick={acceptMerge}
            >
              {t('Combine {{n}} steps', { n: mergedSteps.length })}
            </Button>
          </div>
        ) : revision ? (
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
          <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-2">
              {dirty && (
                <span className="text-sm text-disabled-text">
                  {t('Unsaved changes')}
                </span>
              )}
              {/* Run now uses the stored steps, so it runs what is saved, not the buffer */}
              <Tooltip
                title={dirty ? t('Runs the last saved version.') : undefined}
              >
                <Button
                  icon={<Play size={13} />}
                  loading={triggerMut.isPending}
                  onClick={runNow}
                >
                  {t('Run now')}
                </Button>
              </Tooltip>
              <Button
                type="primary"
                icon={<Check size={15} />}
                disabled={!dirty}
                onClick={save}
              >
                {t('Save')}
              </Button>
            </div>
          </div>
        )
      }
    >
      {test.hasSideEffects && (
        <div className="flex items-start gap-2 mb-4 px-3 py-2 rounded text-sm bg-warning-surface text-warning-text">
          <TriangleAlert size={16} className="shrink-0 mt-0.5" />
          <span>
            {t(
              'This test has side effects — running it changes real data (orders, accounts, payments). Review its steps before triggering a run.',
            )}
          </span>
        </div>
      )}
      {/* the steps section wears several hats: arranging a pending merge, reviewing a
          proposed version, viewing an older snapshot (read-only), or plain editing */}
      {merge && mergeItems ? (
        <EditableSteps
          steps={[]}
          bounded
          title={`${t('Steps')} · ${t('merge review')}`}
          headerAction={
            <span className="text-sm text-disabled-text">
              {t('{{groups}} groups · {{steps}} steps', {
                groups: mergedGroupCount,
                steps: mergedSteps.length,
              })}
            </span>
          }
          reviewItems={mergeItems}
          onItemsChange={setMergeItems}
          onStepsChange={() => {}}
        />
      ) : revision && reviewItems ? (
        <EditableSteps
          steps={[]}
          bounded
          title={
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
        <EditableSteps steps={view.steps} bounded onStepsChange={patchSteps} />
      ) : (
        <EditableSteps
          steps={view.steps}
          bounded
          headerAction={versionSwitcher}
          onStepsChange={patchSteps}
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

      <Section
        title={t('Tags')}
        className="py-3!"
        action={
          <span className="text-sm text-disabled-text">
            {t('Up to 3 tags')}
          </span>
        }
      >
        <TagEditor value={view.tags} onChange={(tags) => patch({ tags })} />
      </Section>

      {/* the "last 10" trend strip: each icon is one run — hover for result · duration ·
          when, click to open it; the trailing chevron opens the full filtered list */}
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
                    relativeTime(t, r.date),
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
