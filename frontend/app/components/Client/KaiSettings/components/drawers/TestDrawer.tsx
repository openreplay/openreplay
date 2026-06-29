import { Button, Popconfirm, message } from 'antd';
import { Pause, Play, Trash2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { TestCase } from '../shared/types';
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
    envNames: test.envNames,
    resolutions: test.resolutions,
    regions: test.regions,
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

  return (
    <EntityDrawer
      type="test"
      open={open}
      onClose={onClose}
      title={test.title}
      eyebrow="Test"
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
        </div>
      }
      footer={
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
