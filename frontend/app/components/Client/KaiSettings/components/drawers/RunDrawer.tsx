import { Button, Modal, Segmented, Tooltip, message } from 'antd';
import {
  CheckCircle2,
  ChevronDown,
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
  Terminal,
  Timer,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDateTimeDefault } from 'App/date';

import CountryFlagIcon from 'Shared/CountryFlagIcon';

import { ConsoleLog, NetworkRequest, RunData, TestStep } from '../shared/types';
import {
  RESOLUTION_ICON,
  RowTags,
  formatDuration,
  regionCountry,
  regionLabel,
  relativeTime,
  resolutionLabel,
} from '../shared/utils';
import { EntityDrawer, Section } from './EntityDrawer';

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

/** Network requests captured during the run — same columns as the session network
 *  panel (status / method / name / type / time), failures tinted red. */
function NetworkView({ reqs }: { reqs?: NetworkRequest[] }) {
  const { t } = useTranslation();
  if (!reqs || reqs.length === 0)
    return <DevEmpty text={t('No network activity captured for this run.')} />;
  return (
    <div className="border rounded-lg overflow-hidden text-xs">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-lightest border-b text-disabled-text font-medium uppercase tracking-wide">
        <span className="w-9 shrink-0">{t('Status')}</span>
        <span className="w-12 shrink-0">{t('Method')}</span>
        <span className="flex-1 min-w-0">{t('Name')}</span>
        <span className="w-14 shrink-0">{t('Type')}</span>
        <span className="w-12 shrink-0 text-right">{t('Time')}</span>
      </div>
      {reqs.map((r, i) => {
        const errored = isNetError(r);
        return (
          <div
            key={i}
            className={`flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0 ${
              errored ? 'bg-red-lightest' : ''
            }`}
          >
            <span
              className={`w-9 shrink-0 font-medium ${
                errored ? 'text-red' : 'text-green-dark'
              }`}
            >
              {r.status === 0 ? t('ERR') : r.status}
            </span>
            <span className="w-12 shrink-0 text-disabled-text">{r.method}</span>
            <Tooltip title={r.url}>
              <span className="flex-1 min-w-0 truncate">{r.name}</span>
            </Tooltip>
            <span className="w-14 shrink-0 text-disabled-text truncate">
              {r.type}
            </span>
            <span className="w-12 shrink-0 text-right text-disabled-text">
              {r.duration ? `${Math.round(r.duration)}ms` : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Step screenshots — a big preview with prev/next and a thumbnail strip. Opens on the
 *  failed step by default. When `onExpand` is set the preview is click-to-enlarge. */
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
  const failedPos =
    run.failedStep != null
      ? shotSteps.findIndex((s) => s.i === run.failedStep)
      : -1;
  const [idx, setIdx] = useState(failedPos >= 0 ? failedPos : 0);

  if (run.status === 'running')
    return (
      <DevEmpty
        text={t('Run in progress — screenshots appear as it finishes.')}
      />
    );
  if (shotSteps.length === 0)
    return <DevEmpty text={t('No screenshots captured for this run.')} />;

  const cur = shotSteps[Math.min(idx, shotSteps.length - 1)];
  const curStep = run.steps[cur.i];
  const failed = curStep.status === 'failed';
  const prev = () =>
    setIdx((i) => (i - 1 + shotSteps.length) % shotSteps.length);
  const next = () => setIdx((i) => (i + 1) % shotSteps.length);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium truncate">
          {t('Step')} {cur.i + 1} · {curStep.step}
        </span>
        <span className="text-xs text-disabled-text shrink-0">
          {shotSteps.indexOf(cur) + 1}/{shotSteps.length}
        </span>
      </div>
      <div
        className={`group relative w-full rounded-lg border bg-gray-lightest flex items-center justify-center ${
          failed ? 'border-red-light' : ''
        } ${onExpand ? 'cursor-zoom-in' : ''}`}
        style={{ aspectRatio: '16 / 10' }}
        onClick={onExpand}
        role={onExpand ? 'button' : undefined}
        aria-label={onExpand ? t('Expand screenshot') : undefined}
      >
        <div className="flex flex-col items-center gap-1 text-disabled-text">
          <ImageIcon size={36} />
          <span className="text-xs">
            {failed
              ? t('Screenshot at failure')
              : `${t('Step')} ${cur.i + 1} ${t('screenshot')}`}
          </span>
        </div>
        {onExpand && (
          <span className="absolute top-2 right-2 w-7 h-7 rounded bg-white/90 border shadow-sm flex items-center justify-center text-gray-dark opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 size={14} />
          </span>
        )}
        {shotSteps.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
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
                next();
              }}
              aria-label={t('Next')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-sm border flex items-center justify-center hover:bg-gray-lightest"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {shotSteps.map((s, pos) => (
          <button
            key={s.i}
            type="button"
            onClick={() => setIdx(pos)}
            className={`shrink-0 w-16 h-11 rounded border flex items-center justify-center text-xs bg-gray-lightest transition ${
              s === cur
                ? 'ring-2 ring-inset ring-active-blue-border text-black'
                : 'text-disabled-text'
            } ${run.steps[s.i].status === 'failed' ? 'border-red-light' : ''}`}
          >
            {s.i + 1}
          </button>
        ))}
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
  const [more, setMore] = useState(false);
  const [devTab, setDevTab] = useState<DevTab>('screenshots');
  const [expanded, setExpanded] = useState(false);
  const [modalTab, setModalTab] = useState<DevTab>('screenshots');

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
                  onClick={() => setDevTab('console')}
                  className="text-main hover:underline flex items-center gap-1"
                >
                  <Terminal size={12} /> {t('View console')}
                </button>
                <button
                  type="button"
                  onClick={() => setDevTab('network')}
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
  const banner = (
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
          {run.duration && (
            <span className="font-normal text-disabled-text">
              {' '}
              · {formatDuration(run.duration)}
            </span>
          )}
        </span>
      ) : (
        <span>
          {t('Passed')} · {total} {t('steps')}
          {run.duration && (
            <span className="font-normal text-disabled-text">
              {' '}
              · {formatDuration(run.duration)}
            </span>
          )}
        </span>
      )}
    </div>
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

      {/* compact meta — duration / when / environment up front; the rest behind "More" */}
      <div className="px-5 py-3 border-b">
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-sm">
          <Tooltip title={formatDateTimeDefault(run.date)}>
            <span className="flex items-center gap-1.5 text-disabled-text">
              <Clock size={14} /> {relativeTime(run.date)}
            </span>
          </Tooltip>
          <span className="flex items-center gap-1.5 text-disabled-text">
            <Timer size={14} />{' '}
            {run.duration ? formatDuration(run.duration) : t('Running…')}
          </span>
          <span className="flex items-center gap-1.5 text-disabled-text">
            <Server size={14} /> {run.envName ?? '—'}
          </span>
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            className="ml-auto text-xs text-disabled-text hover:text-black flex items-center gap-1"
          >
            {more ? t('Less') : t('More')}
            <ChevronDown
              size={13}
              className={`transition-transform ${more ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
        {more && (
          <div className="mt-2 pt-2 border-t flex items-center gap-x-4 gap-y-1.5 flex-wrap text-sm text-disabled-text">
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
            <RowTags tags={run.tags} />
          </div>
        )}
      </div>

      <Section title={t('Steps')}>
        <div className="flex flex-col">
          {run.steps.map((step, idx) => renderStep(step, idx))}
        </div>
      </Section>

      {/* DevTools — the same things you'd check on a session: screenshots, network,
          console. One tab at a time so the drawer stays readable; expand for room. */}
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
          {devTab === 'network' && <NetworkView reqs={run.network} />}
          {devTab === 'console' && <ConsoleView logs={run.console} />}
        </div>
      </Section>

      {/* Expanded view — same three tabs, with room for the screenshot + network table */}
      <Modal
        open={expanded}
        onCancel={() => setExpanded(false)}
        footer={null}
        title={null}
        width={920}
        centered
      >
        <div className="flex flex-col gap-3 pt-2">
          <Segmented
            block
            size="small"
            value={modalTab}
            onChange={(v) => setModalTab(v as DevTab)}
            options={devOptions}
          />
          <div>
            {modalTab === 'screenshots' && <ScreenshotsView run={run} />}
            {modalTab === 'network' && <NetworkView reqs={run.network} />}
            {modalTab === 'console' && <ConsoleView logs={run.console} />}
          </div>
        </div>
      </Modal>
    </EntityDrawer>
  );
}

export default RunDrawer;
