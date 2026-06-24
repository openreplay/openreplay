import { Button, Input, Select, Typography } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useDeleteTest, useEnvironments, useUpdateTest } from '../queries';
import { Test, TestStatus } from './shared/types';
import {
  FREQUENCY_OPTIONS,
  Frequency,
  cronToFrequency,
  frequencyToCron,
  stepsToLines,
} from './shared/utils';

interface ActionButton {
  label: string;
  onClick: () => void;
  type?: 'primary' | 'default';
  danger?: boolean;
  loading?: boolean;
}

// Steps are stored without numbering; the editor renders them as a numbered
// list and re-numbers on each line break (see handleStepsKeyDown).
const numberSteps = (lines: string[]) =>
  lines.map((line, i) => `${i + 1}. ${line}`).join('\n');

const stripNumber = (line: string) => line.replace(/^\s*\d+[.)]\s*/, '');

function TestCaseContent({ test }: { test: Test }) {
  const { t } = useTranslation();
  const updateTest = useUpdateTest();
  const deleteTest = useDeleteTest();
  const { data: envData } = useEnvironments();

  const envOptions = (envData?.items ?? []).map((env) => ({
    value: env.environmentId,
    label: env.name,
  }));

  const stepLines = stepsToLines(test.steps);
  const initialSteps = stepLines.length ? numberSteps(stepLines) : '1. ';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialSteps);
  const [expectedDraft, setExpectedDraft] = useState(test.expectedResult ?? '');
  const [frequency, setFrequency] = useState<Frequency>(
    cronToFrequency(test.cron),
  );
  const [environment, setEnvironment] = useState(test.environments?.[0]);
  const status = test.status;

  const patch = (
    body: Parameters<typeof updateTest.mutate>[0]['body'],
    onSuccess?: () => void,
  ) =>
    updateTest.mutate(
      { testId: test.testId, body },
      {
        onSuccess,
        onError: () => toast.error(t('Failed to update test')),
      },
    );

  const handleSaveSteps = () => {
    const steps = draft
      .split('\n')
      .map(stripNumber)
      .map((line) => line.trim())
      .filter((line) => line !== '');
    patch({ steps, expectedResult: expectedDraft.trim() }, () =>
      setEditing(false),
    );
  };

  const handleCancel = () => {
    setDraft(initialSteps);
    setExpectedDraft(test.expectedResult ?? '');
    setEditing(false);
  };

  // Auto-number the next step on Enter, keeping the list sequential.
  const handleStepsKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart, selectionEnd, value } = el;
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);
    const nextNumber = before.split('\n').length + 1;
    const insert = `\n${nextNumber}. `;
    setDraft(before + insert + after);
    const caret = before.length + insert.length;
    requestAnimationFrame(() => {
      el.selectionStart = caret;
      el.selectionEnd = caret;
    });
  };

  const handleFrequency = (freq: Frequency) => {
    setFrequency(freq);
    patch({ cron: frequencyToCron(freq, test.cron) });
  };

  const handleEnvironment = (envId: string) => {
    setEnvironment(envId);
    patch({ environments: [envId] });
  };

  const actionButtons: Record<TestStatus, ActionButton[]> = {
    pending: [
      {
        label: t('Approve'),
        onClick: () => patch({ status: 'approved' }),
        type: 'primary',
        loading: updateTest.isPending,
      },
      {
        label: t('Deny'),
        onClick: () => patch({ status: 'rejected' }),
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
        onClick: () => patch({ status: 'paused' }),
      },
      {
        label: t('Edit'),
        onClick: () => setEditing(true),
      },
    ],
    rejected: [
      {
        label: t('Approve'),
        onClick: () => patch({ status: 'approved' }),
        type: 'primary',
      },
      {
        label: t('Delete'),
        onClick: () =>
          deleteTest.mutate(test.testId, {
            onError: () => toast.error(t('Failed to delete test')),
          }),
        danger: true,
        loading: deleteTest.isPending,
      },
    ],
    paused: [
      {
        label: t('Resume'),
        onClick: () => patch({ status: 'approved' }),
        type: 'primary',
      },
      {
        label: t('Edit'),
        onClick: () => setEditing(true),
      },
      {
        label: t('Delete'),
        onClick: () =>
          deleteTest.mutate(test.testId, {
            onError: () => toast.error(t('Failed to delete test')),
          }),
        danger: true,
        loading: deleteTest.isPending,
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
          onKeyDown={handleStepsKeyDown}
          placeholder={t(
            '1. Navigate to login page\n2. Enter credentials\n3. Click submit button\n4. Verify redirect to dashboard',
          )}
          autoFocus
        />
        <Typography.Text type="secondary" className="text-sm!">
          {t('Expected result:')}
        </Typography.Text>
        <Input.TextArea
          rows={2}
          value={expectedDraft}
          onChange={(e) => setExpectedDraft(e.target.value)}
          placeholder={t('e.g. The dashboard loads with the user logged in')}
        />
        <div className="flex gap-2">
          <Button
            type="primary"
            size="small"
            onClick={handleSaveSteps}
            loading={updateTest.isPending}
          >
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
      {test.scenario && (
        <Typography.Text type="secondary" className="text-sm!">
          {test.scenario}
        </Typography.Text>
      )}
      <div className="flex flex-col gap-1">
        <Typography.Text type="secondary" className="text-sm!">
          {t('Test Steps:')}
        </Typography.Text>
        <ol className="ml-4 text-sm list-decimal">
          {stepLines.map((step, idx) => (
            <li key={idx} className="mb-1">
              {step}
            </li>
          ))}
        </ol>
      </div>

      {test.expectedResult && (
        <div className="flex flex-col gap-1">
          <Typography.Text type="secondary" className="text-sm!">
            {t('Expected result:')}
          </Typography.Text>
          <Typography.Text className="text-sm!">
            {test.expectedResult}
          </Typography.Text>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Typography.Text type="secondary" className="text-sm!">
              {t('Run every')}
            </Typography.Text>
            <Select
              size="small"
              value={frequency}
              onChange={handleFrequency}
              options={FREQUENCY_OPTIONS}
              style={{ width: 100 }}
              disabled={status !== 'approved'}
            />
          </div>
          <div className="flex items-center gap-2">
            <Typography.Text type="secondary" className="text-sm!">
              {t('Environment')}
            </Typography.Text>
            <Select
              size="small"
              value={environment}
              onChange={handleEnvironment}
              options={envOptions}
              style={{ width: 140 }}
              disabled={status !== 'approved'}
              placeholder={t('Select environment')}
            />
          </div>
        </div>
        <div className="flex gap-2">
          {actionButtons[status].map((btn, idx) => (
            <Button
              key={idx}
              size="small"
              type={btn.type}
              danger={btn.danger}
              loading={btn.loading}
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
