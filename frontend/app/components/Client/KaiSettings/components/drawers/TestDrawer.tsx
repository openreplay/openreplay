import { Button, Popconfirm, Tooltip, message } from 'antd';
import { CheckCircle2, Pause, Play, Trash2, XCircle } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { TestCase } from '../shared/types';
import { getStatusTag, relativeTime } from '../shared/utils';
import EditableSteps from './EditableSteps';
import { EntityDrawer, Section, TagEditor } from './EntityDrawer';
import RunSettingsFields, { RunSettings } from './RunSettingsFields';

interface Props {
  test: TestCase | null;
  open: boolean;
  onClose: () => void;
  onChange: (updated: TestCase) => void;
  onRemove: (key: string) => void;
}

/** A live, approved test. Single-column control panel; the row's actions live in the
 *  header (Run now / Pause / Delete) next to the close icon. Edits persist live. */
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

  // the outcome of the most recent run, surfaced at the top
  const lastOutcome = test.recent?.[test.recent.length - 1];

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
          {lastOutcome && (
            <span className="flex items-center gap-1">
              {lastOutcome === 'passed' ? (
                <CheckCircle2 size={13} className="text-green" />
              ) : (
                <XCircle size={13} className="text-red" />
              )}
              <span
                className={
                  lastOutcome === 'passed' ? 'text-green-dark' : 'text-red'
                }
              >
                {lastOutcome === 'passed' ? t('Passed') : t('Failed')}
              </span>
            </span>
          )}
          <span className="text-disabled-text">
            · {t('last run')} {relativeTime(test.lastRunAt)}
          </span>
        </div>
      }
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            type="primary"
            size="small"
            icon={<Play size={13} />}
            onClick={runNow}
          >
            {t('Run now')}
          </Button>
          <Button
            size="small"
            icon={paused ? <Play size={13} /> : <Pause size={13} />}
            onClick={togglePause}
          >
            {paused ? t('Resume') : t('Pause')}
          </Button>
          <Popconfirm
            title={t('Delete this test?')}
            okText={t('Delete')}
            okButtonProps={{ danger: true }}
            cancelText={t('Cancel')}
            onConfirm={remove}
          >
            <Tooltip title={t('Delete')}>
              <Button
                type="text"
                size="small"
                danger
                aria-label={t('Delete')}
                icon={<Trash2 size={15} />}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      }
    >
      <EditableSteps
        steps={test.steps}
        onStepsChange={(steps) => onChange({ ...test, steps })}
      />

      <Section title={t('Run settings')}>
        <RunSettingsFields value={settings} onChange={patch} />
      </Section>

      <Section title={t('Tags')}>
        <TagEditor
          value={test.tags}
          onChange={(tags) => onChange({ ...test, tags })}
        />
        <div className="mt-1.5 text-xs text-disabled-text">
          {t('Up to 3 tags')}
        </div>
      </Section>
    </EntityDrawer>
  );
}

export default TestDrawer;
