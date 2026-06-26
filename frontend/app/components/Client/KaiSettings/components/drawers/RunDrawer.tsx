import { Button, Modal, Tooltip, message } from 'antd';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  Images,
  Loader,
  Minus,
  Network,
  Pause,
  RotateCw,
  Server,
  Timer,
  XCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTimeDefault } from 'App/date';

import { RunData, TestStep } from '../shared/types';
import {
  RESOLUTION_ICON,
  formatDuration,
  regionFlag,
  regionLabel,
  relativeTime,
  resolutionLabel,
} from '../shared/utils';
import { EntityDrawer, Section, TagChips } from './EntityDrawer';

interface Props {
  run: RunData | null;
  open: boolean;
  onClose: () => void;
}

// A step is worth a screenshot once it has actually executed.
const hasShot = (s: TestStep) =>
  s.status === 'passed' || s.status === 'failed' || s.status === 'running';

/** One execution of a test. Read-only history: outcome, a compact meta line, and the
 *  per-step list — screenshots live in a carousel so the failure is what you see first. */
function RunDrawer({ run, open, onClose }: Props) {
  const { t } = useTranslation();
  const [more, setMore] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [shotIdx, setShotIdx] = useState(0);

  if (!run) return null;

  const running = run.status === 'running';
  const failed = run.status === 'failed';
  const total = run.steps.length;
  const doneCount = run.steps.filter(
    (s) => s.status === 'passed' || s.status === 'failed',
  ).length;
  const currentIdx = run.steps.findIndex((s) => s.status === 'running');

  // steps that carry a screenshot, paired with their original index
  const shotSteps = run.steps
    .map((step, i) => ({ step, i }))
    .filter(({ step }) => hasShot(step));

  const ResIcon = RESOLUTION_ICON[run.resolution ?? 'desktop'];

  const rerun = () =>
    message.success(`${run.testName} — ${t('rerun started, see Runs')}`);
  const pause = () => message.info(`${run.testName} — ${t('run paused')}`);

  const openCarouselAt = (stepIndex: number) => {
    const pos = shotSteps.findIndex((s) => s.i === stepIndex);
    setShotIdx(pos < 0 ? 0 : pos);
    setCarouselOpen(true);
  };
  const openCarousel = () => {
    const start =
      failed && run.failedStep != null
        ? shotSteps.findIndex((s) => s.i === run.failedStep)
        : 0;
    setShotIdx(start < 0 ? 0 : start);
    setCarouselOpen(true);
  };
  const prevShot = () =>
    setShotIdx((i) => (i - 1 + shotSteps.length) % shotSteps.length);
  const nextShot = () => setShotIdx((i) => (i + 1) % shotSteps.length);

  const renderStep = (step: TestStep, idx: number) => {
    const stepFailed = step.status === 'failed';
    const skipped = step.status === 'skipped';
    const isRunning = step.status === 'running';
    const pending = step.status === 'pending';

    const icon = stepFailed ? (
      <XCircle size={15} className="text-red" />
    ) : skipped ? (
      <Minus size={15} className="text-disabled-text" />
    ) : isRunning ? (
      <Loader size={15} className="text-indigo animate-spin" />
    ) : pending ? (
      <span className="block w-[15px] h-[15px] rounded-full border border-gray-light" />
    ) : (
      <CheckCircle2 size={15} className="text-green" />
    );

    return (
      <div
        key={idx}
        className="group flex items-start gap-3 py-2.5 border-b last:border-b-0"
      >
        <span className="pt-0.5 shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm ${stepFailed ? 'text-red font-medium' : ''} ${
              skipped || pending ? 'text-disabled-text' : ''
            } ${isRunning ? 'text-indigo font-medium' : ''}`}
          >
            {idx + 1}. {step.step}
            {skipped && <span className="ml-2 text-xs">({t('skipped')})</span>}
            {isRunning && (
              <span className="ml-2 text-xs">({t('running')})</span>
            )}
            {pending && <span className="ml-2 text-xs">({t('pending')})</span>}
          </div>
          {stepFailed && run.error && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="bg-red-lightest rounded p-2 text-sm">
                <span className="text-red font-medium">{t('Error')}: </span>
                <span className="text-red">{run.error}</span>
              </div>
              <div className="border border-dashed rounded p-2 flex items-center gap-2 text-xs text-disabled-text w-fit">
                <Network size={14} />
                {t('Network trace — coming soon')}
              </div>
            </div>
          )}
        </div>

        {/* Screenshots: only the failure shows inline; the rest sit one tap away so
            passed steps don't drown the list in unreadable thumbnails. */}
        {skipped || pending ? (
          <span className="text-xs text-disabled-text shrink-0 self-center">
            {t('Not run')}
          </span>
        ) : stepFailed ? (
          <button
            type="button"
            onClick={() => openCarouselAt(idx)}
            className="w-40 h-24 rounded border border-red-light bg-gray-lightest flex flex-col items-center justify-center gap-0.5 text-disabled-text shrink-0 hover:ring-2 hover:ring-red-light transition"
          >
            <ImageIcon size={18} />
            <span className="text-xs">{t('At failure')}</span>
          </button>
        ) : (
          <Tooltip title={t('View screenshot')}>
            <Button
              type="text"
              size="small"
              icon={<ImageIcon size={15} />}
              aria-label={t('View screenshot')}
              onClick={() => openCarouselAt(idx)}
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center"
            />
          </Tooltip>
        )}
      </div>
    );
  };

  // outcome banner — distinct from the test's own state, so a passed run never
  // looks like an active test
  const banner = running ? (
    <div className="rounded-lg bg-indigo-lightest p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-indigo font-medium">
        <Loader size={16} className="animate-spin" />
        {t('Running')} · {t('step')} {currentIdx + 1} {t('of')} {total}
      </div>
      <div className="h-1.5 rounded-full bg-white/70 overflow-hidden">
        <div
          className="h-full bg-indigo rounded-full transition-all"
          style={{ width: `${(doneCount / total) * 100}%` }}
        />
      </div>
    </div>
  ) : failed ? (
    <div className="rounded-lg bg-red-lightest p-3 flex items-center gap-2 text-sm text-red font-medium">
      <XCircle size={16} />
      {t('Failed at step')} {(run.failedStep ?? 0) + 1} {t('of')} {total}
      {run.duration && (
        <span className="font-normal">· {formatDuration(run.duration)}</span>
      )}
    </div>
  ) : (
    <div className="rounded-lg bg-green-light p-3 flex items-center gap-2 text-sm text-green-dark font-medium">
      <CheckCircle2 size={16} />
      {t('Passed')} · {total} {t('steps')}
      {run.duration && (
        <span className="font-normal">· {formatDuration(run.duration)}</span>
      )}
    </div>
  );

  const current = shotSteps[shotIdx];
  const currentStep = current ? run.steps[current.i] : null;

  return (
    <EntityDrawer
      type="run"
      open={open}
      onClose={onClose}
      title={run.testName}
      eyebrow={running ? 'Run · in progress' : 'Run'}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t('Close')}</Button>
          {running ? (
            <Button type="primary" icon={<Pause size={14} />} onClick={pause}>
              {t('Pause')}
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<RotateCw size={14} />}
              onClick={rerun}
            >
              {t('Rerun')}
            </Button>
          )}
        </div>
      }
    >
      <div className="px-5 py-4 border-b">{banner}</div>

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
              <span>{regionFlag(run.region)}</span> {regionLabel(run.region)}
            </span>
            <span>
              {t('Started')} {formatDateTimeDefault(run.date)}
            </span>
            <TagChips tags={run.tags} />
          </div>
        )}
      </div>

      <Section
        title={`${t('Steps')} · ${doneCount}/${total}`}
        action={
          <Button
            type="text"
            size="small"
            icon={<Images size={14} />}
            onClick={openCarousel}
            disabled={shotSteps.length === 0}
          >
            {t('View screenshots')}
          </Button>
        }
      >
        <div className="flex flex-col">
          {run.steps.map((step, idx) => renderStep(step, idx))}
        </div>
      </Section>

      <Modal
        open={carouselOpen}
        onCancel={() => setCarouselOpen(false)}
        footer={null}
        title={null}
        width={760}
        centered
      >
        {currentStep && current && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 pr-6">
              <div className="text-sm font-medium flex items-center gap-2 min-w-0">
                {currentStep.status === 'failed' ? (
                  <XCircle size={16} className="text-red shrink-0" />
                ) : currentStep.status === 'running' ? (
                  <Loader size={16} className="text-indigo animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 size={16} className="text-green shrink-0" />
                )}
                <span className="truncate">
                  {t('Step')} {current.i + 1} {t('of')} {total} ·{' '}
                  {currentStep.step}
                </span>
              </div>
              <span className="text-xs text-disabled-text shrink-0">
                {shotIdx + 1}/{shotSteps.length}
              </span>
            </div>

            <div
              className={`relative w-full rounded-lg border bg-gray-lightest flex items-center justify-center ${
                currentStep.status === 'failed' ? 'border-red-light' : ''
              }`}
              style={{ aspectRatio: '16 / 10' }}
            >
              <div className="flex flex-col items-center gap-1 text-disabled-text">
                <ImageIcon size={40} />
                <span className="text-sm">
                  {currentStep.status === 'failed'
                    ? t('Screenshot at failure')
                    : `${t('Step')} ${current.i + 1} ${t('screenshot')}`}
                </span>
              </div>
              {shotSteps.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevShot}
                    aria-label={t('Previous')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-sm border flex items-center justify-center hover:bg-gray-lightest"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={nextShot}
                    aria-label={t('Next')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-sm border flex items-center justify-center hover:bg-gray-lightest"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>

            {currentStep.status === 'failed' && run.error && (
              <div className="bg-red-lightest rounded p-2 text-sm">
                <span className="text-red font-medium">{t('Error')}: </span>
                <span className="text-red">{run.error}</span>
              </div>
            )}

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {shotSteps.map((s, pos) => (
                <button
                  key={s.i}
                  type="button"
                  onClick={() => setShotIdx(pos)}
                  className={`shrink-0 w-20 h-14 rounded border flex items-center justify-center text-xs bg-gray-lightest transition ${
                    pos === shotIdx
                      ? 'ring-2 ring-active-blue-border border-active-blue-border text-black'
                      : 'text-disabled-text'
                  } ${run.steps[s.i].status === 'failed' ? 'border-red-light' : ''}`}
                >
                  {s.i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </EntityDrawer>
  );
}

export default RunDrawer;
