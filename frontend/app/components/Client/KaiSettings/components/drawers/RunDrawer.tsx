import { Button, Tooltip, message } from 'antd';
import {
  CheckCircle2,
  Image as ImageIcon,
  Loader,
  Minus,
  Network,
  Pause,
  RotateCw,
  XCircle,
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTimeDefault } from 'App/date';

import { RunData, TestStep } from '../shared/types';
import { formatDuration, relativeTime } from '../shared/utils';
import { EntityDrawer, MetaGrid, Section, TagChips } from './EntityDrawer';

interface Props {
  run: RunData | null;
  open: boolean;
  onClose: () => void;
}

/** One execution of a test. Read-only history: outcome, per-step screenshots, and the
 *  failure detail (which step, the error, the network trace). */
function RunDrawer({ run, open, onClose }: Props) {
  const { t } = useTranslation();
  if (!run) return null;

  const running = run.status === 'running';
  const failed = run.status === 'failed';
  const total = run.steps.length;
  const doneCount = run.steps.filter(
    (s) => s.status === 'passed' || s.status === 'failed',
  ).length;
  const currentIdx = run.steps.findIndex((s) => s.status === 'running');

  const rerun = () =>
    message.success(`${run.testName} — ${t('rerun started, see Runs')}`);
  const pause = () => message.info(`${run.testName} — ${t('run paused')}`);

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
        className="flex items-start gap-3 py-2.5 border-b last:border-b-0"
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
        {skipped || pending ? (
          <div className="w-32 h-20 rounded border border-dashed flex items-center justify-center text-xs text-disabled-text shrink-0">
            {t('Not run')}
          </div>
        ) : (
          <div
            className={`w-32 h-20 rounded border flex flex-col items-center justify-center gap-0.5 text-disabled-text bg-gray-lightest shrink-0 ${
              stepFailed ? 'border-red-light' : ''
            }`}
          >
            <ImageIcon size={16} />
            <span className="text-xs">
              {stepFailed ? t('At failure') : `${t('Step')} ${idx + 1}`}
            </span>
          </div>
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

  return (
    <EntityDrawer
      type="run"
      open={open}
      onClose={onClose}
      title={run.testName}
      eyebrow={running ? 'Run · in progress' : 'Run'}
      statusLine={
        <Tooltip title={formatDateTimeDefault(run.date)}>
          <span className="text-xs text-disabled-text">
            {relativeTime(run.date)}
          </span>
        </Tooltip>
      }
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

      <Section title={t('Details')}>
        <MetaGrid
          items={[
            { label: t('Environment'), value: run.envName ?? '—' },
            { label: t('Started'), value: formatDateTimeDefault(run.date) },
            {
              label: t('Duration'),
              value: run.duration ? formatDuration(run.duration) : t('Running…'),
            },
            { label: t('Tags'), value: <TagChips tags={run.tags} /> },
          ]}
        />
      </Section>

      <Section title={`${t('Steps')} · ${doneCount}/${total}`}>
        <div className="flex flex-col">
          {run.steps.map((step, idx) => renderStep(step, idx))}
        </div>
      </Section>
    </EntityDrawer>
  );
}

export default RunDrawer;
