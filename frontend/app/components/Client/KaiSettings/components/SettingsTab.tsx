import { Checkbox, Collapse, Typography } from 'antd';
import { ChevronRight } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import Environments from './Environments';
import TestCaseContent from './TestCaseContent';
import { MOCK_TEST_CASES } from './shared/mockData';
import { getStatusTag } from './shared/utils';

function SettingsTab() {
  const { t } = useTranslation();

  const testCaseItems = MOCK_TEST_CASES.map((tc) => ({
    key: tc.key,
    label: (
      <div className="flex items-center gap-2">
        <span className="font-medium">{tc.title}</span>
        {getStatusTag(tc.status, t)}
      </div>
    ),
    children: <TestCaseContent tc={tc} />,
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
