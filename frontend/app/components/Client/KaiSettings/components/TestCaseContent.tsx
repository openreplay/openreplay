import { Button, Input, Select, Typography } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TestCase, TestStatus } from './shared/types';

const FREQUENCY_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: '2weeks', label: '2 Weeks' },
  { value: 'month', label: 'Month' },
];

interface ActionButton {
  label: string;
  onClick: () => void;
  type?: 'primary' | 'default';
  danger?: boolean;
}

function TestCaseContent({ tc }: { tc: TestCase }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tc.steps.join('\n'));
  const [frequency, setFrequency] = useState('week');
  const [status, setStatus] = useState<TestStatus>(tc.status);

  const handleSave = () => {
    console.log('save', tc.key, draft.split('\n'));
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(tc.steps.join('\n'));
    setEditing(false);
  };

  const actionButtons: Record<TestStatus, ActionButton[]> = {
    pending: [
      {
        label: t('Approve'),
        onClick: () => {
          console.log('approve', tc.key);
          setStatus('approved');
        },
        type: 'primary',
      },
      {
        label: t('Deny'),
        onClick: () => console.log('deny', tc.key),
        danger: true,
      },
      {
        label: t('Edit'),
        onClick: () => setEditing(true),
      },
    ],
    approved: [
      {
        label: t('Pause'),
        onClick: () => {
          console.log('pause', tc.key);
          setStatus('paused');
        },
      },
      {
        label: t('Edit'),
        onClick: () => setEditing(true),
      },
    ],
    paused: [
      {
        label: t('Resume'),
        onClick: () => {
          console.log('resume', tc.key);
          setStatus('approved');
        },
        type: 'primary',
      },
      {
        label: t('Edit'),
        onClick: () => setEditing(true),
      },
      {
        label: t('Delete'),
        onClick: () => console.log('delete', tc.key),
        danger: true,
      },
    ],
  };

  if (editing) {
    return (
      <div className="px-4 pb-4 flex flex-col gap-2">
        <Typography.Text type="secondary" className="text-sm!">
          {t('Enter test steps (one per line):')}
        </Typography.Text>
        <Input.TextArea
          rows={6}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t(
            '1. Navigate to login page\n2. Enter credentials\n3. Click submit button\n4. Verify redirect to dashboard',
          )}
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
      <div className="flex flex-col gap-1">
        <Typography.Text type="secondary" className="text-sm!">
          {t('Test Steps:')}
        </Typography.Text>
        <ol className="ml-4 text-sm">
          {tc.steps.map((step, idx) => (
            <li key={idx} className="mb-1">
              {step}
            </li>
          ))}
        </ol>
      </div>

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
            disabled={status !== 'approved'}
          />
        </div>
        <div className="flex gap-2">
          {actionButtons[status].map((btn, idx) => (
            <Button
              key={idx}
              size="small"
              type={btn.type}
              danger={btn.danger}
              onClick={btn.onClick}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TestCaseContent;
