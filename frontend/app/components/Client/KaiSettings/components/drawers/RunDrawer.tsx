import { Button, Modal, Segmented, Select, Tooltip } from 'antd';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  Images,
  Info,
  Loader,
  Maximize2,
  Minus,
  Network,
  RotateCw,
  Server,
  Tag as TagIcon,
  Terminal,
  Timer,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { formatDateTimeDefault } from 'App/date';

import CountryFlagIcon from 'Shared/CountryFlagIcon';

import { getRunScreenshot } from '../../api';
import { useProjectId, useRunHar, useTriggerRun } from '../../queries';
import { harToNetworkRequests } from '../shared/adapters';
import { ConsoleLog, NetworkRequest, RunData, TestStep } from '../shared/types';
import {
  RESOLUTION_ICON,
  TINT,
  TINT_BORDER,
  TINT_SOFT,
  VersionLabel,
  formatDuration,
  regionCountry,
  regionLabel,
  relativeTime,
  resolutionLabel,
  resultSummary,
} from '../shared/utils';
import { EntityDrawer, Section } from './EntityDrawer';
import NetworkPanel from './NetworkPanel';

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
    return (
      <img
        src={url}
        alt={t('Run screenshot')}
        className="max-w-full max-h-full object-contain"
      />
    );
  return (
    <div className="flex flex-col items-center gap-1 text-disabled-text">
      <ImageIcon size={36} />
      <span className="text-xs">
        {failed ? t('Screenshot unavailable') : `${t('Loading')}…`}
      </span>
    </div>
  );
}

function DevEmpty({ text, fill }: { text: string; fill?: boolean }) {
  return (
    <div
      className={`text-sm text-disabled-text text-center border rounded-lg ${
        fill ? 'h-full flex items-center justify-center' : 'py-8'
      }`}
    >
      {text}
    </div>
  );
}

/** Console output captured during the run — mirrors the session console. */
function ConsoleView({ logs, fill }: { logs?: ConsoleLog[]; fill?: boolean }) {
  const { t } = useTranslation();
  if (!logs || logs.length === 0)
    return (
      <DevEmpty
        fill={fill}
        text={t('No console output captured for this run.')}
      />
    );
  return (
    <div className="border rounded-lg overflow-hidden font-mono text-xs">
      {logs.map((l, i) => {
        const cfg =
          l.level === 'error'
            ? { color: 'text-red', bg: 'bg-red-lightest', Icon: XCircle }
            : l.level === 'warn'
              ? { color: 'text-orange-dark', bg: '', Icon: TriangleAlert }
              : { color: 'text-gray-dark', bg: '', Icon: Info };
        const LevelIcon = cfg.Icon;
        return (
          <div
            key={i}
            className={`flex items-start gap-2 px-3 py-1.5 border-b border-neutral-950/5 last:border-b-0 ${cfg.bg}`}
          >
            <LevelIcon size={13} className={`mt-0.5 shrink-0 ${cfg.color}`} />
            <span
              className={`flex-1 whitespace-pre-wrap break-words ${cfg.color}`}
            >
              {l.text}
            </span>
            <span className="text-disabled-text shrink-0">
              {`${(l.time / 1000).toFixed(2)}s`}
            </span>
          </div>
        );
      })}
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
        fill={fill}
        text={t('Run in progress — screenshots appear as it finishes.')}
      />
    );
  if (shotSteps.length === 0)
    return (
      <DevEmpty fill={fill} text={t('No screenshots captured for this run.')} />
    );

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

  return (
    <div className={`flex flex-col gap-2 ${fill ? 'h-full min-h-0' : ''}`}>
      <Select
        size="small"
        value={stepPos}
        onChange={pickStep}
        className="w-full"
        options={shotSteps.map((s, pos) => ({
          value: pos,
          label: (
            <span className="flex items-center gap-1.5 min-w-0">
              {s.step.status === 'failed' && (
                <span
                  className="shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--color-red)' }}
                />
              )}
              <span className="truncate">
                {t('Step')} {s.i + 1} · {s.step.step}
              </span>
            </span>
          ),
        }))}
      />

      {/* in the fixed modal stage the image letterboxes into the remaining height
          instead of the aspect-ratio box driving the layout */}
      <div
        className={`group relative w-full rounded-lg border bg-gray-lightest flex items-center justify-center ${
          failed ? 'border-red' : ''
        } ${onExpand ? 'cursor-zoom-in' : ''} ${fill ? 'flex-1 min-h-0' : ''}`}
        style={fill ? undefined : { aspectRatio: '16 / 10' }}
        onClick={onExpand}
        role={onExpand ? 'button' : undefined}
        aria-label={onExpand ? t('Expand screenshot') : undefined}
      >
        {failed && (
          <span
            className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs font-medium rounded px-1.5 py-0.5"
            style={{ background: TINT.red, color: 'var(--color-red)' }}
          >
            <XCircle size={12} /> {t('Failed')}
          </span>
        )}
        {shots[safeShot] ? (
          <RunShot
            key={`${run.key}-${shots[safeShot]}`}
            runId={run.key}
            name={shots[safeShot]}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-disabled-text">
            <ImageIcon size={36} />
            <span className="text-xs">
              {failed
                ? t('Screenshot at failure')
                : `${t('Step')} ${cur.i + 1}`}
            </span>
          </div>
        )}
        {shotCount > 1 && (
          <span
            className="absolute bottom-2 right-2 text-xs font-medium rounded px-1.5 py-0.5 bg-white/90 border text-gray-dark"
            style={{ borderColor: 'var(--color-gray-light)' }}
          >
            {t('Screenshot {{n}} of {{total}}', {
              n: safeShot + 1,
              total: shotCount,
            })}
          </span>
        )}
        {onExpand && (
          <span className="absolute bottom-2 left-2 w-7 h-7 rounded bg-white/90 border shadow-sm flex items-center justify-center text-gray-dark opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 size={14} />
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
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-sm border flex items-center justify-center hover:bg-gray-lightest"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextShot();
              }}
              aria-label={t('Next')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-sm border flex items-center justify-center hover:bg-gray-lightest"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* filmstrip (modal only) — one thumb per step, the failed one tinted red */}
      {fill && shotSteps.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto py-0.5 shrink-0">
          {shotSteps.map((s, pos) => {
            const active = pos === Math.min(stepPos, shotSteps.length - 1);
            const isFailed = s.step.status === 'failed';
            return (
              <Tooltip
                key={s.i}
                title={`${t('Step')} ${s.i + 1} · ${s.step.step}`}
              >
                <button
                  type="button"
                  onClick={() => pickStep(pos)}
                  aria-label={`${t('Step')} ${s.i + 1}`}
                  className="shrink-0 w-[72px] h-[45px] rounded border flex items-center justify-center text-xs font-medium transition outline-none focus:outline-none"
                  style={{
                    background: isFailed
                      ? TINT_SOFT.red
                      : active
                        ? 'var(--color-active-blue)'
                        : 'var(--color-gray-lightest)',
                    color: isFailed
                      ? 'var(--color-red)'
                      : active
                        ? 'var(--color-teal)'
                        : 'var(--color-gray-dark)',
                    borderColor: active
                      ? isFailed
                        ? 'var(--color-red)'
                        : 'var(--color-teal)'
                      : isFailed
                        ? TINT_BORDER.red
                        : 'var(--color-gray-light)',
                  }}
                >
                  {isFailed ? <XCircle size={13} /> : s.i + 1}
                </button>
              </Tooltip>
            );
          })}
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
        toast.success(`${run.testName} — ${t('rerun started, see Runs')}`),
      onError: () => toast.error(t('Failed to start run')),
    });
  };

  const renderStep = (step: TestStep, idx: number) => {
    // for a running run we only know the run is in flight, so every step shows a
    // neutral marker until it finishes
    const status = running ? 'unknown' : step.status;
    const stepFailed = status === 'failed';
    const skipped = status === 'skipped';
    const pending = status === 'pending';
    const notRun = skipped || pending;

    const icon =
      status === 'unknown' || pending ? (
        <span className="block w-[14px] h-[14px] rounded-full border border-gray-light" />
      ) : stepFailed ? (
        <XCircle size={15} className="text-red" />
      ) : skipped ? (
        <Minus size={15} className="text-disabled-text" />
      ) : (
        <CheckCircle2 size={15} className="text-green" />
      );

    return (
      <div
        key={idx}
        className="flex items-start gap-2.5 rounded px-1 -mx-1 py-1.5"
      >
        <span className="w-5 h-6 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div
            className={`text-[15px] leading-6 break-words ${
              notRun ? 'text-disabled-text' : ''
            }`}
          >
            {step.step}
            {skipped && <span className="ml-2 text-xs">({t('skipped')})</span>}
          </div>
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
              <span className="inline-flex mt-0.5">
                <button
                  type="button"
                  disabled={!network.length}
                  onClick={() => jumpToActivity('network')}
                  className={`flex items-center gap-1.5 text-xs text-disabled-text transition-colors ${
                    network.length
                      ? 'hover:text-main'
                      : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  <Network size={11} className="shrink-0" />
                  <span>
                    {t('{{count}} requests', {
                      count: step.networkRequests ?? 0,
                    })}
                  </span>
                  {/* a failed request only means the STEP failed when the step itself
                      did; on a passed step it's a warning, not a failure */}
                  {!!step.failedRequests && (
                    <span
                      className={stepFailed ? 'text-red' : 'text-orange-dark'}
                    >
                      · {t('{{n}} failed', { n: step.failedRequests })}
                    </span>
                  )}
                </button>
              </span>
            </Tooltip>
          )}
          {stepFailed && (
            <div className="mt-1.5 flex flex-col gap-1.5 items-start">
              {/* the step error often repeats the result summary — only show it when it
                  adds something */}
              {run.error && run.error !== run.summary && (
                <div className="text-sm text-red">{run.error}</div>
              )}
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => jumpToActivity('screenshots')}
                  className="text-main hover:underline flex items-center gap-1"
                >
                  <ImageIcon size={12} /> {t('View screenshot')}
                </button>
                <button
                  type="button"
                  onClick={() => jumpToActivity('console')}
                  className="text-main hover:underline flex items-center gap-1"
                >
                  <Terminal size={12} /> {t('View console')}
                </button>
                <button
                  type="button"
                  onClick={() => jumpToActivity('network')}
                  className="text-main hover:underline flex items-center gap-1"
                >
                  <Network size={12} /> {t('View network')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const bannerCfg = running
    ? {
        bg: TINT.indigo,
        color: 'var(--color-indigo)',
        Icon: Loader,
        spin: true,
      }
    : failed
      ? { bg: TINT.red, color: 'var(--color-red)', Icon: XCircle }
      : {
          bg: TINT.green,
          color: 'var(--color-green-dark)',
          Icon: CheckCircle2,
        };
  const BannerIcon = bannerCfg.Icon;
  const banner = (
    <>
      <div
        className="px-5 py-3 border-b flex items-center gap-2 text-sm font-medium text-gray-darkest"
        style={{ background: bannerCfg.bg }}
      >
        <BannerIcon
          size={16}
          className={`shrink-0 ${bannerCfg.spin ? 'animate-spin' : ''}`}
          style={{ color: bannerCfg.color }}
        />
        {running ? (
          <span>{t('Running')}</span>
        ) : failed ? (
          <span>
            {run.failedStep != null
              ? t('Failed at step {{n}} of {{total}}', {
                  n: run.failedStep + 1,
                  total,
                })
              : t('Failed')}
          </span>
        ) : (
          <span>
            {t('Passed')} · {t('{{count}} steps', { count: total })}
          </span>
        )}
      </div>
      {/* error/timeout runs may fail without a specific step — show the reason here */}
      {failed && run.failedStep == null && run.error && (
        <div className="px-5 py-3 border-b bg-white text-sm text-red">
          {run.error}
        </div>
      )}
      <div className="px-5 py-3 border-b bg-white flex items-center gap-x-4 gap-y-1 flex-wrap text-sm text-disabled-text">
        <Tooltip title={formatDateTimeDefault(run.date)}>
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> {relativeTime(t, run.date)}
          </span>
        </Tooltip>
        <span className="flex items-center gap-1.5">
          <Timer size={14} />{' '}
          {run.duration ? formatDuration(run.duration) : `${t('Running')}…`}
        </span>
        <span className="flex items-center gap-1.5">
          <Server size={14} /> {run.envName ?? '—'}
        </span>
        <span className="flex items-center gap-1.5">
          <ResIcon size={14} /> {resolutionLabel(t, run.resolution)}
        </span>
        {/* region is null until the runner backfills the column — hide rather than show
            a misleading default flag */}
        {run.region && (
          <span className="flex items-center gap-1.5">
            <CountryFlagIcon
              countryCode={regionCountry(run.region)}
              style={{ width: 16, borderRadius: 2 }}
            />{' '}
            {regionLabel(run.region)}
          </span>
        )}
        {run.tags && run.tags.length > 0 && (
          <Tooltip title={run.tags.join(', ')}>
            <span className="flex items-center gap-1.5 cursor-default">
              <TagIcon size={14} />{' '}
              {t('{{count}} tags', { count: run.tags.length })}
            </span>
          </Tooltip>
        )}
      </div>
    </>
  );

  const tabCount = (n: number) =>
    n > 0 ? <span className="ml-1.5 text-red font-medium">{n}</span> : null;

  // shared by the inline tabs and the expanded modal so they stay in lockstep
  const devOptions = [
    {
      value: 'screenshots',
      label: (
        <span className="flex items-center justify-center gap-1.5 py-0.5">
          <Images size={14} /> {t('Screenshots')}
        </span>
      ),
    },
    {
      value: 'network',
      label: (
        <span className="flex items-center justify-center gap-1.5 py-0.5">
          <Network size={14} /> {t('Network')}
          {tabCount(netErrors)}
        </span>
      ),
    },
    {
      value: 'console',
      label: (
        <span className="flex items-center justify-center gap-1.5 py-0.5">
          <Terminal size={14} /> {t('Console')}
          {tabCount(consoleErrors)}
        </span>
      ),
    },
  ];

  // the panels hold per-run selection state, so key them by the run; the HAR arrives
  // asynchronously, hence the request count in the network key too
  const shotsKey = `shots-${run.key}`;
  const netKey = `net-${run.key}-${network.length}`;

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={run.testName}
      eyebrow={t('Run')}
      headerActions={
        !running ? (
          <Button
            type="primary"
            size="small"
            icon={<RotateCw size={13} />}
            onClick={rerun}
          >
            {t('Rerun')}
          </Button>
        ) : undefined
      }
    >
      {banner}

      {resultSummary(run.summary) && (
        <div className="px-5 py-3 border-b bg-white">
          <div className="text-xs font-medium uppercase tracking-wide text-disabled-text mb-1">
            {t('Result')}
          </div>
          <div className="text-sm text-gray-darkest whitespace-pre-line">
            {resultSummary(run.summary)}
          </div>
        </div>
      )}

      <Section
        title={
          <span className="flex items-center gap-1.5">
            {t('Steps')}
            <span className="text-gray-medium font-normal">·</span>
            {total}
            <VersionLabel version={run.version} always />
          </span>
        }
      >
        {/* bounded like the test drawer — Activity stays reachable on long runs */}
        <div className="flex flex-col max-h-[50vh] overflow-y-auto overscroll-contain pr-1">
          {run.steps.map((step, idx) => renderStep(step, idx))}
        </div>
      </Section>

      <div ref={activityRef} />
      <Section
        title={t('Activity')}
        action={
          <Tooltip title={t('Expand')}>
            <Button
              type="text"
              size="small"
              icon={<Maximize2 size={15} />}
              aria-label={t('Expand')}
              onClick={() => openExpanded(devTab)}
            />
          </Tooltip>
        }
      >
        <Segmented
          block
          size="small"
          value={devTab}
          onChange={(v) => setDevTab(v as DevTab)}
          options={devOptions}
        />
        <div className="mt-3">
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
        open={expanded}
        onCancel={() => setExpanded(false)}
        footer={null}
        title={
          <div className="flex flex-col gap-0.5 pr-6">
            <span className="text-xs font-medium uppercase tracking-wide text-disabled-text">
              {t('Run activity')}
            </span>
            <span className="text-base font-semibold text-black leading-tight">
              {run.testName}
            </span>
          </div>
        }
        width={920}
        centered
      >
        <div className="flex flex-col gap-3 pt-1">
          <Segmented
            block
            size="small"
            value={modalTab}
            onChange={(v) => setModalTab(v as DevTab)}
            options={devOptions}
          />
          {/* fixed stage — every tab renders inside the same height, so switching tabs
              never resizes the modal */}
          <div className="h-[60vh] min-h-[420px]">
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
            {modalTab === 'console' && (
              <div className="h-full overflow-y-auto">
                <ConsoleView logs={run.console} fill />
              </div>
            )}
          </div>
        </div>
      </Modal>
    </EntityDrawer>
  );
}

export default RunDrawer;
