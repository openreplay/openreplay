import { Button, Popconfirm, Tooltip, message } from 'antd';
import {
  CheckCircle2,
  Pause,
  Play,
  Trash2,
  XCircle,
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTimeDefault } from 'App/date';

import { MOCK_RUNS } from '../shared/mockData';
import { TestCase } from '../shared/types';
import {
  formatDuration,
  getStatusTag,
  regionLabel,
  relativeTime,
  resolutionLabel,
  scheduleLabel,
} from '../shared/utils';
import EditableSteps from './EditableSteps';
import { EntityDrawer, Field, Section, TagEditor } from './EntityDrawer';
import RunSettingsFields, { RunSettings } from './RunSettingsFields';

interface Props {
  test: TestCase | null;
  open: boolean;
  onClose: () => void;
  onChange: (updated: TestCase) => void;
  onRemove: (key: string) => void;
}

/** A live, approved test. Edits persist immediately; the drawer is its control panel. */
function TestDrawer({ test, open, onClose, onChange, onRemove }: Props) {
  const { t } = useTranslation();
  if (!test) return null;

  const paused = test.status === 'paused';
  const settings: RunSettings = {
    envName: test.envName,
    resolution: test.resolution,
    region: test.region,
    schedule: test.schedule,
  };

  // run settings persist live; flipping the schedule on/off pauses/resumes the test
  const patch = (p: Partial<RunSettings>) => {
    const next: TestCase = { ...test, ...p };
    if ('schedule' in p) next.status = p.schedule ? 'active' : 'paused';
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

  // this test's recent executions, newest first
  const recentRuns = MOCK_RUNS.filter((r) => r.testName === test.title).slice(
    0,
    5,
  );

  return (
    <EntityDrawer
      type="test"
      open={open}
      onClose={onClose}
      title={test.title}
      eyebrow={paused ? 'Test · Paused' : 'Test'}
      statusLine={
        <div className="flex items-center gap-2 text-xs">
          {getStatusTag(test.status, t, 'm-0!')}
          {test.recent && (
            <span className="flex items-center gap-1">
              {test.recent.slice(-5).map((r, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    r === 'passed' ? 'bg-green' : 'bg-red'
                  }`}
                />
              ))}
            </span>
          )}
          <span className="text-disabled-text">
            {t('last run')} {relativeTime(test.lastRunAt)}
          </span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          <Popconfirm
            title={t('Delete this test?')}
            okText={t('Delete')}
            okButtonProps={{ danger: true }}
            cancelText={t('Cancel')}
            onConfirm={remove}
          >
            <Button type="text" danger icon={<Trash2 size={15} />}>
              {t('Delete')}
            </Button>
          </Popconfirm>
          <div className="flex gap-2">
            <Button
              icon={paused ? <Play size={14} /> : <Pause size={14} />}
              onClick={togglePause}
            >
              {paused ? t('Resume') : t('Pause')}
            </Button>
            <Button type="primary" icon={<Play size={14} />} onClick={runNow}>
              {t('Run now')}
            </Button>
          </div>
        </div>
      }
    >
      <EditableSteps
        steps={test.steps}
        onStepsChange={(steps) => onChange({ ...test, steps })}
      />

      <Section title={t('Run settings')}>
        <RunSettingsFields value={settings} onChange={patch} />
        <div className="mt-3 text-xs text-disabled-text">
          {scheduleLabel(test.schedule)} · {resolutionLabel(test.resolution)} ·{' '}
          {regionLabel(test.region)}
        </div>
      </Section>

      <Section title={t('Tags')}>
        <Field label={t('Up to 3')}>
          <TagEditor
            value={test.tags}
            onChange={(tags) => onChange({ ...test, tags })}
          />
        </Field>
      </Section>

      <Section title={t('Recent runs')}>
        {recentRuns.length === 0 ? (
          <span className="text-sm text-disabled-text">
            {t('No runs yet.')}
          </span>
        ) : (
          <div className="flex flex-col">
            {recentRuns.map((run) => {
              const failed = run.status === 'failed';
              const running = run.status === 'running';
              return (
                <div
                  key={run.key}
                  className="flex items-center gap-2.5 py-1.5 text-sm border-b last:border-b-0"
                >
                  {running ? (
                    <Play size={14} className="text-indigo shrink-0" />
                  ) : failed ? (
                    <XCircle size={14} className="text-red shrink-0" />
                  ) : (
                    <CheckCircle2 size={14} className="text-green shrink-0" />
                  )}
                  <span className={failed ? 'text-red' : ''}>
                    {running
                      ? t('Running…')
                      : failed
                        ? t('Failed')
                        : t('Passed')}
                  </span>
                  <span className="grow" />
                  <span className="text-disabled-text text-xs">
                    {run.duration ? formatDuration(run.duration) : '—'}
                  </span>
                  <Tooltip title={formatDateTimeDefault(run.date)}>
                    <span className="text-disabled-text text-xs w-16 text-end">
                      {relativeTime(run.date)}
                    </span>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </EntityDrawer>
  );
}

export default TestDrawer;
