import { Checkbox, Collapse, Empty, Skeleton, Typography } from 'antd';
import { ChevronRight } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useTests } from '../queries';
import Environments from './Environments';
import TestCaseContent from './TestCaseContent';
import { getStatusTag } from './shared/utils';

function SettingsTab() {
  const { t } = useTranslation();
  const { data, isPending } = useTests();
  const tests = data?.items ?? [];

  const testCaseItems = tests.map((test) => ({
    key: test.testId,
    label: (
      <div className="flex items-center gap-2">
        <span className="font-medium">{test.name}</span>
        {getStatusTag(test.status, t)}
      </div>
    ),
    children: <TestCaseContent test={test} />,
    showArrow: true,
  }));

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="max-w-lg">
        <Environments />
      </div>

      <div className="flex flex-col gap-2">
        <Typography.Text strong>{t('Test Cases')}</Typography.Text>
        <Typography.Text type="secondary" className="text-sm!">
          {t(
            'Kai automatically generates test cases based on your application. Review and approve suggested tests, or create your own custom test scenarios.',
          )}
        </Typography.Text>
        {isPending ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : tests.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('No test cases yet.')}
          />
        ) : (
          <Collapse
            expandIcon={({ isActive }) => (
              <ChevronRight
                size={14}
                className="transition-transform"
                style={{ transform: isActive ? 'rotate(90deg)' : undefined }}
              />
            )}
            items={testCaseItems}
            className="border rounded-lg"
          />
        )}
      </div>

      <div className="flex flex-col gap-2 max-w-lg">
        <Typography.Text type="secondary" className="text-sm!">
          {t(
            'You will receive a weekly summary of all test runs to your email.',
          )}
        </Typography.Text>
        <Checkbox>{t('Notify immediately on failures')}</Checkbox>
      </div>
    </div>
  );
}

export default SettingsTab;
