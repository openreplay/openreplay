import { Button, Popconfirm } from 'antd';
import { Sparkles } from 'lucide-react';
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
  const [included, setIncluded] = useState<string[]>(test?.steps ?? []);

  useEffect(() => {
    setDraft(test);
    setIncluded(test?.steps ?? []);
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
    onChange({ ...draft, status: 'active', steps: included });
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
      <Button type="primary">{t('Approve')}</Button>
    </Popconfirm>
  ) : (
    <Button type="primary" onClick={approve}>
      {t('Approve')}
    </Button>
  );

  return (
    <EntityDrawer
      type="draft"
      open={open}
      onClose={onClose}
      title={draft.title}
      statusLine={
        <span className="text-xs text-disabled-text">
          {t('Not running yet — review and approve to start')}
        </span>
      }
      footer={
        <div className="flex items-center justify-between">
          <Button type="text" danger onClick={dismiss}>
            {t('Dismiss')}
          </Button>
          <div className="flex gap-2">
            <Button onClick={saveDraft}>{t('Save draft')}</Button>
            {approveBtn}
          </div>
        </div>
      }
    >
      {/* why this was drafted */}
      <div className="px-5 py-4 border-b">
        <div className="flex gap-2.5 rounded-lg bg-tealx-lightest p-3">
          <Sparkles size={16} className="text-tealx shrink-0 mt-0.5" />
          <p className="text-sm text-black/80 m-0">
            {t(
              'This test was drafted from real user sessions that completed this journey. Tune the steps below, then approve to start running it.',
            )}
          </p>
        </div>
      </div>

      <EditableSteps
        steps={draft.steps}
        alternatives={draft.alternatives}
        reviewable
        onIncludedChange={setIncluded}
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
