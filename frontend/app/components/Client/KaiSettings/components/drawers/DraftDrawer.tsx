import { Button, Popconfirm } from 'antd';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TestCase } from '../shared/types';
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

/** A draft: the agent's proposal. Review → approve into a live test, or dismiss.
 *  Nothing here is real yet, so settings are shown as "what it will do once approved". */
function DraftDrawer({ test, open, onClose, onChange, onRemove }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<TestCase | null>(test);

  useEffect(() => {
    setDraft(test);
  }, [test]);

  if (!draft) return null;

  const isProd = draft.envName === 'Production';
  const settings: RunSettings = {
    envName: draft.envName,
    resolution: draft.resolution,
    region: draft.region,
    schedule: draft.schedule,
  };
  const patch = (p: Partial<TestCase>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  const approve = () => {
    onChange({ ...draft, status: 'active' });
    onClose();
  };
  const saveDraft = () => {
    onChange(draft);
    onClose();
  };
  const dismiss = () => {
    onRemove(draft.key);
    onClose();
  };

  const approveBtn = isProd ? (
    <Popconfirm
      title={`${t('Run against')} ${draft.envName}?`}
      description={t('This test will run against Production on a schedule.')}
      okText={t('Approve & schedule')}
      cancelText={t('Cancel')}
      onConfirm={approve}
    >
      <Button type="primary" size="small">
        {t('Approve')}
      </Button>
    </Popconfirm>
  ) : (
    <Button type="primary" size="small" onClick={approve}>
      {t('Approve')}
    </Button>
  );

  return (
    <EntityDrawer
      type="draft"
      open={open}
      onClose={onClose}
      title={draft.title}
      headerActions={
        <div className="flex items-center gap-2">
          {approveBtn}
          <Button size="small" onClick={saveDraft}>
            {t('Save draft')}
          </Button>
          <Button size="small" type="text" danger onClick={dismiss}>
            {t('Dismiss')}
          </Button>
        </div>
      }
    >
      <EditableSteps
        steps={draft.steps}
        alternatives={draft.alternatives}
        onStepsChange={(steps) => patch({ steps })}
      />

      <Section title={t('Will run against')}>
        <RunSettingsFields value={settings} onChange={patch} />
      </Section>

      <Section title={t('Tags')}>
        <Field label={t('Up to 3')}>
          <TagEditor value={draft.tags} onChange={(tags) => patch({ tags })} />
        </Field>
      </Section>
    </EntityDrawer>
  );
}

export default DraftDrawer;
