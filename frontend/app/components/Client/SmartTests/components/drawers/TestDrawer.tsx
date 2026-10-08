import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import {
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MoveRight,
  Pause,
  Play,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  formatDuration,
  hasNoEnvironment,
  relativeTime,
  stepsToLines,
} from '../shared/utils';
import EditableSteps from './EditableSteps';
import { DrawerFooter, EntityDrawer, Section, TagEditor } from './EntityDrawer';
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
  const toast = useToast();
  const settingsRef = useRef<HTMLDivElement>(null);
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null);
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
        el.classList.add('m-tdrawer__flash');
        window.setTimeout(() => el.classList.remove('m-tdrawer__flash'), 1200);
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
    setConfirm('discard');
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
      <span className="m-tdrawer__sum">
        <span>
          {decidedCount > 0
            ? t('{{done}} of {{total}} reviewed', {
                done: decidedCount,
                total: changedCount,
              })
            : t('{{count}} changes', { count: changedCount })}
        </span>
        <Button variant="subtle" disabled={allAccepted} onClick={acceptAll}>
          <CheckCheck size={14} />
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
  const shownVersion = viewVersion ?? version;
  const versionSwitcher =
    pastVersions.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="m-tdrawer__vswitch"
            aria-label={t('Showing v{{v}}. Switch version', {
              v: shownVersion,
            })}
          >
            {t('v{{n}}', { n: shownVersion })}
            <ChevronDown size={13} aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItems
            items={[
              {
                key: String(version),
                label: `v${version} · ${t('Current')}`,
              },
              ...pastVersions.map((v) => ({
                key: String(v.version),
                label: `v${v.version} · ${versionDate(new Date(v.createdAt).getTime())}`,
              })),
            ].map((it) => ({
              ...it,
              // the tick sits in a slot every row reserves, so labels line up
              icon:
                Number(it.key) === shownVersion ? (
                  <Check size={13} />
                ) : (
                  <span style={{ width: 13 }} aria-hidden="true" />
                ),
              onClick: () =>
                setViewVersion(
                  Number(it.key) === version ? null : Number(it.key),
                ),
            }))}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    ) : undefined;

  const pausedNote = (text: string) => (
    <span className="m-tdrawer__note max-sm:hidden">{text}</span>
  );

  return (
    <>
      <EntityDrawer
        size="wide"
        open={open}
        onClose={handleClose}
        title={view.title}
        onTitleChange={(title) => patch({ title })}
        autoEditTitle={creating}
        namePlaceholder={t('Name this test')}
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
        /* running and saving live in the footer; Pause / Resume is the one header
           control, and only for a scheduled test */
        headerActions={
          creating ? undefined : merge ? (
            pausedNote(t('Runs paused during merge review'))
          ) : revision && pauseOnRevision ? (
            pausedNote(t('Runs paused until reviewed'))
          ) : canPause ? (
            <Tooltip
              title={
                resumeBlocked
                  ? t('Set an environment below to resume this test.')
                  : undefined
              }
            >
              <span>
                <Button disabled={resumeBlocked} onClick={togglePause}>
                  {paused ? <Play size={13} /> : <Pause size={13} />}
                  {paused ? t('Resume') : t('Pause')}
                </Button>
              </span>
            </Tooltip>
          ) : undefined
        }
        footer={
          creating ? (
            <DrawerFooter
              left={
                <Button variant="subtle" onClick={onClose}>
                  {t('Discard')}
                </Button>
              }
              right={
                <Button variant="primary" onClick={onCreate}>
                  <Check size={14} />
                  {t('Create test')}
                </Button>
              }
            />
          ) : merge ? (
            <DrawerFooter
              left={
                <Button variant="subtle" onClick={cancelMerge}>
                  {t('Cancel merge')}
                </Button>
              }
              right={
                <Button variant="primary" onClick={acceptMerge}>
                  <Check size={14} />
                  {t('Combine {{n}} steps', { n: mergedSteps.length })}
                </Button>
              }
            />
          ) : revision ? (
            <DrawerFooter
              left={
                <Button variant="subtle" onClick={keepVersion}>
                  {t('Keep v{{v}}', { v: version })}
                </Button>
              }
              right={
                <Button variant="primary" onClick={saveRevision}>
                  <Check size={14} />
                  {t('Save v{{v}}', { v: revision.toVersion })}
                </Button>
              }
            />
          ) : (
            <DrawerFooter
              left={
                <Button
                  variant="danger-subtle"
                  onClick={() => setConfirm('delete')}
                >
                  <Trash2 size={14} />
                  <span className="max-sm:hidden">{t('Delete test')}</span>
                </Button>
              }
              right={
                <>
                  {dirty && (
                    <span className="m-tdrawer__dirty max-sm:hidden">
                      {t('Unsaved changes')}
                    </span>
                  )}
                  {/* Run now uses the stored steps, so it runs what is saved */}
                  <Tooltip
                    title={
                      dirty ? t('Runs the last saved version.') : undefined
                    }
                  >
                    <span>
                      <Button disabled={triggerMut.isPending} onClick={runNow}>
                        <Play size={13} />
                        {t('Run now')}
                      </Button>
                    </span>
                  </Tooltip>
                  <Button variant="primary" disabled={!dirty} onClick={save}>
                    <Check size={14} />
                    {t('Save')}
                  </Button>
                </>
              }
            />
          )
        }
      >
        {test.hasSideEffects && (
          <div className="m-tdrawer__fx">
            <ShieldAlert size={15} aria-hidden="true" />
            <p>
              {t(
                'This test changes real data. Running it places real orders, accounts or payments.',
              )}
            </p>
          </div>
        )}
        {/* the steps section wears several hats: arranging a pending merge, reviewing a
            proposed version, viewing an older snapshot (read-only), or plain editing */}
        {merge && mergeItems ? (
          <EditableSteps
            steps={[]}
            bounded
            title={
              <>
                {t('Steps')}
                <span className="m-dsec__count">{t('merge review')}</span>
              </>
            }
            headerAction={
              <span className="m-tdrawer__sum">
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
              <>
                {t('Steps')}
                <span className="m-tdrawer__vpair">
                  {t('v{{n}}', { n: version })}
                  <MoveRight size={13} aria-hidden="true" />
                  {t('v{{n}}', { n: revision.toVersion })}
                </span>
              </>
            }
            headerAction={reviewSummary}
            reviewItems={reviewItems}
            onItemsChange={setReviewItems}
            onDecide={decideChange}
            onStepsChange={() => {}}
          />
        ) : viewedSnapshot ? (
          <EditableSteps
            steps={viewedSnapshot.steps}
            bounded
            readOnly
            headerAction={versionSwitcher}
            hint={t(
              'Saved {{date}}. An older version is history, so this list is read-only.',
              {
                date: versionDate(viewedSnapshot.savedAt),
              },
            )}
            onStepsChange={() => {}}
          />
        ) : creating ? (
          <EditableSteps
            steps={view.steps}
            bounded
            onStepsChange={patchSteps}
          />
        ) : (
          <EditableSteps
            steps={view.steps}
            bounded
            headerAction={versionSwitcher}
            onStepsChange={patchSteps}
          />
        )}

        <div ref={settingsRef}>
          <Section
            title={t('Run settings')}
            hint={
              test.status === 'approved'
                ? t(
                    'Not scheduled. This test runs when you ask it to, until you set a schedule below.',
                  )
                : undefined
            }
          >
            <RunSettingsFields value={settings} onChange={patch} />
          </Section>
        </div>

        <Section
          title={t('Tags')}
          action={<span className="m-tdrawer__note">{t('Up to 3')}</span>}
        >
          <TagEditor value={view.tags} onChange={(tags) => patch({ tags })} />
        </Section>

        {/* the last-10 strip: each icon is one run — hover for result · duration ·
            when, click to open it; the trailing chevron opens the full filtered list */}
        {(onViewRuns || onViewRun) && !creating && (
          <Section
            title={t('Runs')}
            action={
              runs.length > 0 ? (
                <span className="m-tdrawer__trend">
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
                          className={failed ? 'is-failed' : undefined}
                          onClick={() => onViewRun?.(r)}
                          aria-label={`${info} — ${t('View run')}`}
                        >
                          <Icon size={14} />
                        </button>
                      </Tooltip>
                    );
                  })}
                  {onViewRuns && (
                    <Tooltip
                      title={t('View all {{count}} runs', {
                        count: runs.length,
                      })}
                    >
                      <button
                        type="button"
                        className="is-more"
                        onClick={() => onViewRuns(test)}
                        aria-label={t('View all runs')}
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
              <p className="m-tdrawer__note">
                {viewVersion != null
                  ? t('No runs on v{{v}}.', { v: viewVersion })
                  : t(
                      'This test has never run. Run it now, or give it a schedule above.',
                    )}
              </p>
            ) : null}
          </Section>
        )}
      </EntityDrawer>
      <ConfirmDialog
        open={confirm === 'discard'}
        title={t('Discard unsaved changes?')}
        okText={t('Discard')}
        danger
        onCancel={() => setConfirm(null)}
        onOk={() => {
          setConfirm(null);
          setEdits({});
          onClose();
        }}
      >
        {t('The edits you made to this test will be lost.')}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'delete'}
        title={t('Delete this test?')}
        okText={t('Delete')}
        danger
        onCancel={() => setConfirm(null)}
        onOk={() => {
          setConfirm(null);
          remove();
        }}
      >
        {t('“{{title}}” and its run history will be removed.', {
          title: test.title,
        })}
      </ConfirmDialog>
    </>
  );
}

export default TestDrawer;
