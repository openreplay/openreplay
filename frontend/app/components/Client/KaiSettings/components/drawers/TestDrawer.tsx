import { Button, Popconfirm, message } from 'antd';
import { Pause, Play, Trash2 } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { TestCase } from '../shared/types';
import { isScheduled } from '../shared/utils';
import EditableSteps from './EditableSteps';
import { EntityDrawer, Section, TagEditor } from './EntityDrawer';
import RunSettingsFields, { RunSettings } from './RunSettingsFields';

interface Props {
  test: TestCase | null;
  open: boolean;
  /** open scrolled to the run settings / schedule (from the "Schedule" action) */
  focusSchedule?: boolean;
  onClose: () => void;
  onChange: (updated: TestCase) => void;
  onRemove: (key: string) => void;
}

/** A live, approved test. Single-column control panel; the row's actions live in the
 *  header (Run now / Pause) next to the close icon, Delete sits in the footer danger
 *  zone. Edits persist live. Statuses: approved (no schedule) · active (scheduled) ·
 *  paused. Adding a schedule activates the test; clearing it returns to approved. */
function TestDrawer({
  test,
  open,
  focusSchedule,
  onClose,
  onChange,
  onRemove,
}: Props) {
  const { t } = useTranslation();
  const settingsRef = useRef<HTMLDivElement>(null);

  // jump to the schedule when opened via the Schedule action
  useEffect(() => {
    if (open && focusSchedule && settingsRef.current) {
      const el = settingsRef.current;
      const id = window.setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('kai-flash');
        window.setTimeout(() => el.classList.remove('kai-flash'), 1200);
      }, 250);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open, focusSchedule]);

  if (!test) return null;

  const paused = test.status === 'paused';
  const settings: RunSettings = {
    envNames: test.envNames,
    resolutions: test.resolutions,
    regions: test.regions,
    schedule: test.schedule,
  };

  // run settings persist live; a schedule activates the test, clearing it drops it back
  // to approved. (Pause/Resume is a separate, explicit control below.)
  const patch = (p: Partial<RunSettings>) => {
    const next: TestCase = { ...test, ...p };
    if ('schedule' in p) next.status = isScheduled(p.schedule) ? 'active' : 'approved';
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
      onTitleChange={(title) => onChange({ ...test, title })}
      eyebrow={`${t('Test')} · ${
        paused ? t('Paused') : test.status === 'approved' ? t('Approved') : t('Active')
      }`}
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
          {/* approved tests have no schedule to pause — they just run on demand */}
          {test.status !== 'approved' && (
            <Button
              size="small"
              icon={paused ? <Play size={13} /> : <Pause size={13} />}
              onClick={togglePause}
            >
              {paused ? t('Resume') : t('Pause')}
            </Button>
          )}
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

      <div ref={settingsRef}>
        <Section title={t('Run settings')}>
          {test.status === 'approved' && (
            <div className="-mt-1 mb-3 text-xs text-disabled-text">
              {t(
                'Not scheduled — this test runs manually until you set a schedule below.',
              )}
            </div>
          )}
          <RunSettingsFields value={settings} onChange={patch} />
        </Section>
      </div>

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
