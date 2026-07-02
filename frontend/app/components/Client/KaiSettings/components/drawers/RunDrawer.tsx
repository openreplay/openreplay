import { Button, Modal, Segmented, Select, Tooltip, message } from 'antd';
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
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDateTimeDefault } from 'App/date';

import CountryFlagIcon from 'Shared/CountryFlagIcon';

import { ConsoleLog, NetworkRequest, RunData, TestStep } from '../shared/types';
import {
  RESOLUTION_ICON,
  formatDuration,
  regionCountry,
  regionLabel,
  relativeTime,
  resolutionLabel,
} from '../shared/utils';
import { EntityDrawer, Section } from './EntityDrawer';
import NetworkPanel from './NetworkPanel';

interface Props {
  run: RunData | null;
  open: boolean;
  onClose: () => void;
}

// A step is worth a screenshot once it has actually executed.
const hasShot = (s: TestStep) => s.status === 'passed' || s.status === 'failed';

const isNetError = (r: NetworkRequest) => r.status === 0 || r.status >= 400;

function DevEmpty({ text }: { text: string }) {
  return (
    <div className="text-sm text-disabled-text text-center py-8 border rounded-lg">
      {text}
    </div>
  );
}

/** Console output captured during the run — mirrors the session console: level icon +
 *  monospace message, time on the right, error rows tinted. */
function ConsoleView({ logs }: { logs?: ConsoleLog[] }) {
  const { t } = useTranslation();
  if (!logs || logs.length === 0)
    return <DevEmpty text={t('No console output captured for this run.')} />;
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

/** Step screenshots. A step can capture several screenshots, so a Step Selector picks
 *  the step and the carousel arrows move between that step's screenshots. Opens on the
 *  failed step. When `onExpand` is set the preview is click-to-enlarge. */
function ScreenshotsView({
  run,
  onExpand,
}: {
  run: RunData;
  onExpand?: () => void;
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
        text={t('Run in progress — screenshots appear as it finishes.')}
      />
    );
  if (shotSteps.length === 0)
    return <DevEmpty text={t('No screenshots captured for this run.')} />;

  const cur = shotSteps[Math.min(stepPos, shotSteps.length - 1)];
  const curStep = run.steps[cur.i];
  const failed = curStep.status === 'failed';
  const shotCount = Math.max(1, curStep.shots ?? 1);
  const safeShot = Math.min(shotIdx, shotCount - 1);

  const pickStep = (pos: number) => {
    setStepPos(pos);
    setShotIdx(0);
  };
  const prevShot = () => setShotIdx((safeShot - 1 + shotCount) % shotCount);
  const nextShot = () => setShotIdx((safeShot + 1) % shotCount);

  return (
    <div className="flex flex-col gap-2">
      {/* Step selector — pick the step; the carousel below holds that step's screenshots */}
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

      {/* Carousel — arrows move between the selected step's screenshots */}
      <div
        className={`group relative w-full rounded-lg border bg-gray-lightest flex items-center justify-center ${
          failed ? 'border-red' : ''
        } ${onExpand ? 'cursor-zoom-in' : ''}`}
        style={{ aspectRatio: '16 / 10' }}
        onClick={onExpand}
        role={onExpand ? 'button' : undefined}
        aria-label={onExpand ? t('Expand screenshot') : undefined}
      >
        {/* floating "Failed" label, top-right — same tint/icon as the result tags */}
        {failed && (
          <span
            className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs font-medium rounded px-1.5 py-0.5"
            style={{
              background: 'rgba(204, 0, 0, 0.1)',
              color: 'var(--color-red)',
            }}
          >
            <XCircle size={12} /> {t('Failed')}
          </span>
        )}
        <div className="flex flex-col items-center gap-1 text-disabled-text">
          <ImageIcon size={36} />
          <span className="text-xs">
            {failed
              ? t('Screenshot at failure')
              : `${t('Step')} ${cur.i + 1} · ${t('screenshot')} ${safeShot + 1}`}
          </span>
        </div>
        {/* explicit image counter, bottom-right — clearly about screenshots, not steps */}
        <span
          className="absolute bottom-2 right-2 text-xs font-medium rounded px-1.5 py-0.5 bg-white/90 border text-gray-dark"
          style={{ borderColor: 'var(--color-gray-light)' }}
        >
          {t('Screenshot')} {safeShot + 1} {t('of')} {shotCount}
        </span>
        {onExpand && (
          <span className="absolute bottom-2 left-2 w-7 h-7 rounded bg-white/90 border shadow-sm flex items-center justify-center text-gray-dark opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 size={14} />
          </span>
        )}
        {shotCount > 1 && (
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
    </div>
  );
}

type DevTab = 'screenshots' | 'network' | 'console';

/** One execution of a test. Read-only: outcome, a compact meta line, the step list
 *  (failed step shows its error inline), and a tabbed DevTools block — screenshots,
 *  network and console — mirroring what a session shows. */
function RunDrawer({ run, open, onClose }: Props) {
  const { t } = useTranslation();
  const [devTab, setDevTab] = useState<DevTab>('screenshots');
  const [expanded, setExpanded] = useState(false);
  const [modalTab, setModalTab] = useState<DevTab>('screenshots');
  const activityRef = useRef<HTMLDivElement>(null);

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
  const netErrors = (run.network ?? []).filter(isNetError).length;

  const rerun = () =>
    message.success(`${run.testName} — ${t('rerun started, see Runs')}`);

  const renderStep = (step: TestStep, idx: number) => {
    // For a running run we can't know per-step status (we only know the run is
    // running), so every step shows a neutral marker until the run finishes.
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
          {stepFailed && run.error && (
            <div className="mt-1.5 flex flex-col gap-1.5 items-start">
              <div className="text-sm text-red">{run.error}</div>
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

  // Full-width outcome strip: subtle brand tint + coloured icon, dark high-contrast text.
  const bannerCfg = running
    ? {
        bg: 'rgba(97, 95, 255, 0.1)',
        color: 'var(--color-indigo)',
        Icon: Loader,
        spin: true,
      }
    : failed
      ? {
          bg: 'rgba(204, 0, 0, 0.08)',
          color: 'var(--color-red)',
          Icon: XCircle,
        }
      : {
          bg: 'rgba(66, 174, 94, 0.1)',
          color: 'var(--color-green-dark)',
          Icon: CheckCircle2,
        };
  const BannerIcon = bannerCfg.Icon;
  // Status strip + meta line, both always visible (Jul 1 review: run info shows
  // directly — nothing tucked behind a "More" toggle).
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
            {t('Failed at step')} {(run.failedStep ?? 0) + 1} {t('of')} {total}
          </span>
        ) : (
          <span>
            {t('Passed')} · {total} {t('steps')}
          </span>
        )}
      </div>
      <div className="px-5 py-3 border-b bg-white flex items-center gap-x-4 gap-y-1 flex-wrap text-sm text-disabled-text">
          <Tooltip title={formatDateTimeDefault(run.date)}>
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> {relativeTime(run.date)}
            </span>
          </Tooltip>
          <span className="flex items-center gap-1.5">
            <Timer size={14} />{' '}
            {run.duration ? formatDuration(run.duration) : t('Running…')}
          </span>
          <span className="flex items-center gap-1.5">
            <Server size={14} /> {run.envName ?? '—'}
          </span>
          <span className="flex items-center gap-1.5">
            <ResIcon size={14} /> {resolutionLabel(run.resolution)}
          </span>
          <span className="flex items-center gap-1.5">
            <CountryFlagIcon
              countryCode={regionCountry(run.region)}
              style={{ width: 16, borderRadius: 2 }}
            />{' '}
            {regionLabel(run.region)}
          </span>
          {run.tags && run.tags.length > 0 && (
            <Tooltip title={run.tags.join(', ')}>
              <span className="flex items-center gap-1.5 cursor-default">
                <TagIcon size={14} /> {run.tags.length}{' '}
                {run.tags.length === 1 ? t('tag') : t('tags')}
              </span>
            </Tooltip>
          )}
      </div>
    </>
  );

  // count chip shown on the Network / Console tab labels when there are failures
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

  return (
    <EntityDrawer
      type="run"
      open={open}
      onClose={onClose}
      title={run.testName}
      eyebrow="Run"
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

      <Section title={t('Steps')}>
        <div className="flex flex-col">
          {run.steps.map((step, idx) => renderStep(step, idx))}
        </div>
      </Section>

      {/* DevTools — the same things you'd check on a session: screenshots, network,
          console. One tab at a time so the drawer stays readable; expand for room. */}
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
              run={run}
              onExpand={() => openExpanded('screenshots')}
            />
          )}
          {devTab === 'network' && (
            <NetworkPanel reqs={run.network} startedAt={run.date} />
          )}
          {devTab === 'console' && <ConsoleView logs={run.console} />}
        </div>
      </Section>

      {/* Expanded view — same three tabs, with room for the screenshot + network table */}
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
          <div>
            {modalTab === 'screenshots' && <ScreenshotsView run={run} />}
            {modalTab === 'network' && (
              <NetworkPanel reqs={run.network} startedAt={run.date} />
            )}
            {modalTab === 'console' && <ConsoleView logs={run.console} />}
          </div>
        </div>
      </Modal>
    </EntityDrawer>
  );
}

export default RunDrawer;
