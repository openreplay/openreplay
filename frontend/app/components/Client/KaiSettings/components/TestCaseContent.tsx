import { Alert, Button, Input, Select, Typography } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const FREQUENCY_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: '2weeks', label: '2 Weeks' },
  { value: 'month', label: 'Month' },
];

export interface TestCase {
  key: string;
  title: string;
  description: string;
}

function TestCaseContent({ tc }: { tc: TestCase }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tc.description);
  const [frequency, setFrequency] = useState('week');

  const handleSave = () => {
    console.log('save', tc.key, draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(tc.description);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="px-4 pb-4 flex flex-col gap-2">
        <Input.TextArea
          rows={4}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2">
          <Button type="primary" size="small" onClick={handleSave}>
            {t('Save')}
          </Button>
          <Button size="small" onClick={handleCancel}>
            {t('Cancel')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 flex flex-col gap-3">
      <Alert
        type="info"
        description={<span className="text-sm">{tc.description}</span>}
        showIcon={false}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Typography.Text type="secondary" className="text-sm!">
            {t('Run every')}
          </Typography.Text>
          <Select
            size="small"
            value={frequency}
            onChange={setFrequency}
            options={FREQUENCY_OPTIONS}
            style={{ width: 100 }}
          />
        </div>
        <Button size="small" onClick={() => setEditing(true)}>
          {t('Edit')}
        </Button>
      </div>
    </div>
  );
}

export default TestCaseContent;
