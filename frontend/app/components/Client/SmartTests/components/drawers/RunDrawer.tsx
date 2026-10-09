import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { SimpleSelect } from '@/ui/inputs/select';
import { Segmented, type SegmentedOption } from '@/ui/inputs/toggle-group';
import { Modal } from '@/ui/overlays/modal';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  Images,
  Maximize2,
  Network,
  RotateCw,
  Server,
  Tag as TagIcon,
  Terminal,
  Timer,
} from 'lucide-react';
import React, {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { formatDateTimeDefault } from 'App/date';

import CountryFlagIcon from 'Shared/CountryFlagIcon';

import { getRunScreenshot } from '../../api';
import { useProjectId, useRunHar, useTriggerRun } from '../../queries';
import { harToNetworkRequests } from '../shared/adapters';
import { ConsoleLog, NetworkRequest, RunData, TestStep } from '../shared/types';
import {
  RESOLUTION_ICON,
  formatDuration,
  getRunResult,
  regionCountry,
  regionLabel,
  relativeTime,
  resolutionLabel,
  resultSummary,
} from '../shared/utils';
import { DrawerFooter, EntityDrawer, Section } from './EntityDrawer';
import NetworkPanel from './NetworkPanel';
import './run-drawer.css';

interface Props {
  run: RunData | null;
  open: boolean;
  onClose: () => void;
}

const hasShot = (s: TestStep) => !!s.screenshots?.length;

const isNetError = (r: NetworkRequest) => r.status === 0 || r.status >= 400;

/** One run screenshot, fetched as an authed blob → object URL (a bare authed path can't
 *  be an <img src>). */
function RunShot({ runId, name }: { runId: string; name: string }) {
  const { t } = useTranslation();
  const projectId = useProjectId();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // keyed by name at the call site, so a new screenshot mounts a fresh instance
  useEffect(() => {
    let alive = true;
    let obj: string | undefined;
    getRunScreenshot(projectId, runId, name)
      .then((blob) => {
        if (!alive) return;
        obj = URL.createObjectURL(blob);
        setUrl(obj);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (obj) URL.revokeObjectURL(obj);
    };
  }, [projectId, runId, name]);

  if (url)
    return <img src={url} alt={t('Run screenshot')} className="m-rd__img" />;
  return (
    <span className="m-rd__placeholder">
      <ImageIcon size={20} aria-hidden="true" />
      {failed ? t('Screenshot unavailable') : `${t('Loading')}…`}
    </span>
  );
}

function DevEmpty({ text }: { text: string }) {
  return <p className="m-rd__none">{text}</p>;
}

/** Console output captured during the run — machine output, so mono; the level is
 *  the only colour. */
function ConsoleView({ logs }: { logs?: ConsoleLog[] }) {
  const { t } = useTranslation();
  if (!logs || logs.length === 0)
    return <DevEmpty text={t('No console output captured for this run.')} />;
  return (
    <div className="m-rd__console">
      {logs.map((l, i) => (
        <div key={i} className={`m-rd__line is-${l.level}`}>
          <span className="m-rd__at">
            {t('{{n}}s', { n: (l.time / 1000).toFixed(2) })}
          </span>
          <span className="m-rd__msg">{l.text}</span>
        </div>
      ))}
    </div>
  );
}

/** Step screenshots: a selector picks the step, the carousel arrows move between that
 *  step's screenshots (spilling into the next/previous step at the ends). Opens on the
 *  failed step. With `fill` (expand modal) the image letterboxes into the fixed stage
 *  and a step filmstrip rides the bottom. */
function ScreenshotsView({
  run,
  onExpand,
  fill,
}: {
  run: RunData;
  onExpand?: () => void;
  fill?: boolean;
}) {
  const { t } = useTranslation();
  const shotSteps = run.steps
    .map((step, i) => ({ step, i }))
    .filter(({ step }) => hasShot(step));
  const failedPos = shotSteps.findIndex((s) => s.step.status === 'failed');
  const [stepPos, setStepPos] = useState(failedPos >= 0 ? failedPos : 0);
  const [shotIdx, setShotIdx] = useState(0);

  if (run.status === 'running')
    return (
      <DevEmpty
        text={t('Run in progress. Screenshots appear as it finishes.')}
      />
    );
  if (shotSteps.length === 0)
    return <DevEmpty text={t('No screenshots captured for this run.')} />;

  const cur = shotSteps[Math.min(stepPos, shotSteps.length - 1)];
  const curStep = run.steps[cur.i];
  const failed = curStep.status === 'failed';
  const shots = curStep.screenshots ?? [];
  const shotCount = Math.max(1, shots.length);
  const safeShot = Math.min(shotIdx, shotCount - 1);

  const pickStep = (pos: number) => {
    setStepPos(pos);
    setShotIdx(0);
  };
  const stepShots = (pos: number) =>
    Math.max(1, run.steps[shotSteps[pos].i].screenshots?.length ?? 0);
  const nextShot = () => {
    if (safeShot < shotCount - 1) return setShotIdx(safeShot + 1);
    pickStep(stepPos < shotSteps.length - 1 ? stepPos + 1 : 0);
  };
  const prevShot = () => {
    if (safeShot > 0) return setShotIdx(safeShot - 1);
    const prevPos = stepPos > 0 ? stepPos - 1 : shotSteps.length - 1;
    setStepPos(prevPos);
    setShotIdx(stepShots(prevPos) - 1);
  };
  const canNavigate = shotSteps.length > 1 || shotCount > 1;
  const activePos = Math.min(stepPos, shotSteps.length - 1);

  return (
    <div className={`m-rd__shotview${fill ? ' is-fill' : ''}`}>
      <SimpleSelect
        ariaLabel={t('Step')}
        value={String(activePos)}
        onChange={(v) => v != null && pickStep(Number(v))}
        className="m-rd__stepsel"
        options={shotSteps.map((st, pos) => ({
          value: String(pos),
          label: `${st.step.status === 'failed' ? '✕ ' : ''}${t('Step')} ${st.i + 1} · ${st.step.step}`,
        }))}
      />
      {/* the picture is the expand control: the thing you want larger is the picture */}
      <div
        className={`m-rd__frame${failed ? ' is-fail' : ''}${onExpand ? ' is-clickable' : ''}`}
        onClick={onExpand}
        role={onExpand ? 'button' : undefined}
        aria-label={onExpand ? t('Expand screenshot') : undefined}
      >
        {failed && <span className="m-rd__badge is-fail">{t('Failed')}</span>}
        {shots[safeShot] ? (
          <RunShot
            key={`${run.key}-${shots[safeShot]}`}
            runId={run.key}
            name={shots[safeShot]}
          />
        ) : (
          <span className="m-rd__placeholder">
            <ImageIcon size={20} aria-hidden="true" />
            {failed ? t('Screenshot at failure') : `${t('Step')} ${cur.i + 1}`}
          </span>
        )}
        {shotCount > 1 && (
          <span className="m-rd__badge is-count">
            {t('Screenshot {{n}} of {{total}}', {
              n: safeShot + 1,
              total: shotCount,
            })}
          </span>
        )}
        {canNavigate && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevShot();
              }}
              aria-label={t('Previous')}
              className="m-rd__nav is-prev"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextShot();
              }}
              aria-label={t('Next')}
              className="m-rd__nav is-next"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {/* filmstrip (expanded only) — one thumb per step, the failed one in red */}
      {fill && shotSteps.length > 1 && (
        <div className="m-rd__filmstrip">
          {shotSteps.map((st, pos) => (
            <Tooltip
              key={st.i}
              title={`${t('Step')} ${st.i + 1} · ${st.step.step}`}
            >
              <button
                type="button"
                onClick={() => pickStep(pos)}
                aria-label={`${t('Step')} ${st.i + 1}`}
                aria-pressed={pos === activePos}
                className={`m-rd__thumb${pos === activePos ? ' is-on' : ''}${st.step.status === 'failed' ? ' is-fail' : ''}`}
              >
                {st.i + 1}
              </button>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}

type DevTab = 'screenshots' | 'network' | 'console';

/** One execution of a test. Read-only: outcome, meta line, the step list (the failed
 *  step shows its error inline), and a tabbed DevTools block. */
function RunDrawer({ run, open, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [devTab, setDevTab] = useState<DevTab>('screenshots');
  const [expanded, setExpanded] = useState(false);
  const [modalTab, setModalTab] = useState<DevTab>('screenshots');
  const activityRef = useRef<HTMLDivElement>(null);
  const triggerMut = useTriggerRun();
  // the detail response carries no network of its own — it comes from the streamed HAR
  const { data: harText } = useRunHar(run?.key, run?.status !== 'running');
  const network = useMemo(
    () => (harText ? harToNetworkRequests(harText) : []),
    [harText],
  );
  const downloadHar = () => {
    if (!harText) return;
    const url = URL.createObjectURL(
      new Blob([harText], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'network.har';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // revoke after the click has been dispatched, or the download can be cancelled
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  // a per-step "View …" link selects the tab and scrolls the Activity panel into view
  const jumpToActivity = (tab: DevTab) => {
    setDevTab(tab);
    window.setTimeout(
      () =>
        activityRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        }),
      0,
    );
  };

  if (!run) return null;

  const openExpanded = (tab: DevTab) => {
    setModalTab(tab);
    setExpanded(true);
  };

  const running = run.status === 'running';
  const failed = run.status === 'failed';
  const total = run.steps.length;

  const ResIcon = RESOLUTION_ICON[run.resolution ?? 'desktop'];
  const consoleErrors = (run.console ?? []).filter(
    (l) => l.level === 'error',
  ).length;
  const netErrors = network.filter(isNetError).length;

  const rerun = () => {
    if (!run.testId) return;
    triggerMut.mutate(run.testId, {
      onSuccess: () =>
        toast.success(`${run.testName}: ${t('rerun started, see Runs')}`),
      onError: () => toast.error(t('Failed to start run')),
    });
  };

  // the runner says nothing while it works, so a running run draws every step alike
  const markOf = (step: TestStep): StepMarkStatus =>
    running || step.status === 'pending' || step.status === 'running'
      ? 'unknown'
      : step.status;

  const renderStep = (step: TestStep, idx: number) => {
    const status = markOf(step);
    const stepFailed = status === 'failed';
    return (
      <li
        key={idx}
        className={`m-rd__step is-${status}`}
        style={{ '--i': idx } as CSSProperties}
      >
        <StepMark status={status} />
        <div className="m-rd__step-body">
          <span className="m-rd__step-text">
            {step.step}
            {status === 'skipped' && (
              <span className="m-rd__skipped"> ({t('skipped')})</span>
            )}
          </span>
          {/* per-step network counts from results.json; disabled when no HAR was
              captured (nothing to open) */}
          {(step.networkRequests || step.failedRequests) && (
            <Tooltip
              title={
                network.length
                  ? undefined
                  : t('No network capture available for this run.')
              }
            >
              <span className="inline-flex">
                <button
                  type="button"
                  disabled={!network.length}
                  onClick={() => jumpToActivity('network')}
                  className="m-rd__reqs"
                >
                  <Network size={11} aria-hidden="true" />
                  {t('{{count}} requests', {
                    count: step.networkRequests ?? 0,
                  })}
                  {/* a failed request only fails the STEP when the step itself did */}
                  {!!step.failedRequests && (
                    <span className={stepFailed ? 'is-fail' : 'is-warn'}>
                      · {t('{{n}} failed', { n: step.failedRequests })}
                    </span>
                  )}
                </button>
              </span>
            </Tooltip>
          )}
          {stepFailed && (
            <>
              {/* the step error often repeats the result summary — only when it adds */}
              {run.error && run.error !== run.summary && (
                <p className="m-rd__error">{run.error}</p>
              )}
              <span className="m-rd__jumps">
                <button
                  type="button"
                  onClick={() => jumpToActivity('screenshots')}
                >
                  <ImageIcon size={12} aria-hidden="true" />{' '}
                  {t('View screenshot')}
                </button>
                <button type="button" onClick={() => jumpToActivity('console')}>
                  <Terminal size={12} aria-hidden="true" /> {t('View console')}
                </button>
                <button type="button" onClick={() => jumpToActivity('network')}>
                  <Network size={12} aria-hidden="true" /> {t('View network')}
                </button>
              </span>
            </>
          )}
        </div>
        {hasShot(step) && !running && (
          <button
            type="button"
            className="m-rd__shots"
            aria-label={t('View screenshots')}
            onClick={() => jumpToActivity('screenshots')}
          >
            {step.screenshots?.length} <Images size={12} aria-hidden="true" />
          </button>
        )}
      </li>
    );
  };

  const devOptions: SegmentedOption<DevTab>[] = [
    {
      value: 'screenshots',
      label: (
        <span className="m-rd__tab">
          <Images size={13} /> {t('Screenshots')}
        </span>
      ),
    },
    {
      value: 'network',
      label: (
        <span className="m-rd__tab">
          <Network size={13} /> {t('Network')}
          {netErrors > 0 && <em>{netErrors}</em>}
        </span>
      ),
    },
    {
      value: 'console',
      label: (
        <span className="m-rd__tab">
          <Terminal size={13} /> {t('Console')}
          {consoleErrors > 0 && <em>{consoleErrors}</em>}
        </span>
      ),
    },
  ];

  // the panels hold per-run selection state, so key them by the run; the HAR arrives
  // asynchronously, hence the request count in the network key too
  const shotsKey = `shots-${run.key}`;
  const netKey = `net-${run.key}-${network.length}`;
  const summary = resultSummary(run.summary);

  return (
    <EntityDrawer
      size="wide"
      open={open}
      onClose={onClose}
      title={run.testName}
      eyebrow={`${t('Run')} · ${running ? t('Running') : failed ? t('Failed') : t('Passed')}`}
      meta={
        <>
          <Tooltip title={formatDateTimeDefault(run.date)}>
            <span>
              <Clock3 size={13} aria-hidden="true" />
              {relativeTime(t, run.date)}
            </span>
          </Tooltip>
          <span>
            <Timer size={13} aria-hidden="true" />
            {running ? (
              <LiveDuration start={run.date} />
            ) : run.duration ? (
              formatDuration(run.duration)
            ) : (
              '—'
            )}
          </span>
          {run.envName && (
            <span>
              <Server size={13} aria-hidden="true" />
              {run.envName}
            </span>
          )}
          <span>
            <ResIcon size={13} aria-hidden="true" />
            {resolutionLabel(t, run.resolution)}
          </span>
          {/* region is null until the runner backfills it — hide rather than guess */}
          {run.region && (
            <span>
              <CountryFlagIcon
                countryCode={regionCountry(run.region)}
                style={{ width: 14, borderRadius: 2 }}
              />
              {regionLabel(run.region)}
            </span>
          )}
          {run.version != null && (
            <span>{t('v{{n}}', { n: run.version })}</span>
          )}
          {run.tags && run.tags.length > 0 && (
            <Tooltip title={run.tags.join(', ')}>
              <span>
                <TagIcon size={13} aria-hidden="true" />
                {t('{{count}} tags', { count: run.tags.length })}
              </span>
            </Tooltip>
          )}
        </>
      }
      headerActions={
        running ? undefined : (
          <Button disabled={triggerMut.isPending} onClick={rerun}>
            <RotateCw size={13} />
            {t('Rerun')}
          </Button>
        )
      }
      footer={
        <DrawerFooter
          left={
            <span className="m-rd__foot">
              {running
                ? t('A run cannot be paused or stopped once it has started.')
                : failed
                  ? run.failedStep != null
                    ? t('Failed at step {{n}} of {{total}}.', {
                        n: run.failedStep + 1,
                        total,
                      })
                    : t('Failed.')
                  : t('All {{count}} steps passed.', { count: total })}
            </span>
          }
          right={<Button onClick={onClose}>{t('Close')}</Button>}
        />
      }
    >
      {(summary || (failed && run.failedStep == null && run.error)) && (
        <Section title={t('Result')}>
          {summary && <p className="m-rd__summary">{summary}</p>}
          {/* error/timeout runs may fail without a specific step — the reason goes here */}
          {failed && run.failedStep == null && run.error && (
            <p className="m-rd__error">{run.error}</p>
          )}
        </Section>
      )}

      <Section
        title={
          <>
            {t('Steps')} <span className="m-dsec__count">{total}</span>
          </>
        }
        action={getRunResult(run.status, t)}
      >
        {/* bounded like the test drawer — Activity stays reachable on long runs */}
        <ol
          className={`m-rd__steps${running ? ' is-live' : ''}`}
          style={{ maxHeight: '46vh', overflowY: 'auto' }}
        >
          {run.steps.map(renderStep)}
        </ol>
      </Section>

      <div ref={activityRef} />
      <Section
        title={t('Activity')}
        action={
          <IconButton
            icon={<Maximize2 size={14} />}
            label={t('Expand activity')}
            variant="ghost"
            onClick={() => openExpanded(devTab)}
          />
        }
      >
        <Segmented
          block
          ariaLabel={t('Activity')}
          value={devTab}
          options={devOptions}
          onChange={(v) => setDevTab(v as DevTab)}
        />
        <div className="m-rd__panel">
          {devTab === 'screenshots' && (
            <ScreenshotsView
              key={shotsKey}
              run={run}
              onExpand={() => openExpanded('screenshots')}
            />
          )}
          {devTab === 'network' && (
            <NetworkPanel
              key={netKey}
              reqs={network}
              startedAt={run.date}
              onDownload={harText ? downloadHar : undefined}
            />
          )}
          {devTab === 'console' && <ConsoleView logs={run.console} />}
        </div>
      </Section>

      <Modal
        width={920}
        open={expanded}
        onCancel={() => setExpanded(false)}
        footer={null}
        title={
          <>
            <span className="m-rdmodal__eyebrow">{t('Run activity')}</span>
            {run.testName}
          </>
        }
      >
        <div className="m-rdmodal__body">
          <Segmented
            block
            ariaLabel={t('Activity')}
            value={modalTab}
            options={devOptions}
            onChange={(v) => setModalTab(v as DevTab)}
          />
          {/* fixed stage — every tab renders inside the same height, so switching tabs
              never resizes the modal */}
          <div className="m-rdmodal__stage">
            {modalTab === 'screenshots' && (
              <ScreenshotsView key={`${shotsKey}-modal`} run={run} fill />
            )}
            {modalTab === 'network' && (
              <NetworkPanel
                key={`${netKey}-modal`}
                reqs={network}
                startedAt={run.date}
                fillHeight
                onDownload={harText ? downloadHar : undefined}
              />
            )}
            {modalTab === 'console' && <ConsoleView logs={run.console} />}
          </div>
        </div>
      </Modal>
    </EntityDrawer>
  );
}

type StepMarkStatus = 'passed' | 'failed' | 'skipped' | 'unknown';

/** One ring for every step; the outcome is drawn inside it. */
function StepMark({ status }: { status: StepMarkStatus }) {
  const { t } = useTranslation();
  const label = {
    passed: t('Passed'),
    failed: t('Failed'),
    skipped: t('Skipped'),
    unknown: t('Not reached yet'),
  }[status];
  return (
    <svg
      className={`m-rd__mark is-${status}`}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      role="img"
      aria-label={label}
    >
      <circle className="m-rd__ring" cx="7" cy="7" r="6" strokeWidth="1.5" />
      {status === 'passed' && (
        <path
          className="m-rd__in"
          d="M4.4 7.2 6.2 9 9.6 5.3"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {status === 'failed' && (
        <path
          className="m-rd__in"
          d="M5 5 9 9M9 5 5 9"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
      {status === 'skipped' && (
        <path
          className="m-rd__in"
          d="M4.6 7h4.8"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/** Live elapsed counter for an in-flight run. */
function LiveDuration({ start }: { start: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{formatDuration(Math.max(0, now - start))}</>;
}

export default RunDrawer;
