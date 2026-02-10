import { Button, Checkbox, Collapse, Input, Switch, Typography } from 'antd';
import { ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import TestCaseContent, { TestCase } from './TestCaseContent';

const MOCK_TEST_CASES: TestCase[] = [
  {
    key: 'tc-1',
    title: 'Login Flow',
    description:
      'Navigate to the login page, enter the provided credentials, and verify that the user is redirected to the dashboard. Check that the user avatar and name are displayed in the top-right corner. Ensure no console errors are thrown during the process.',
  },
  {
    key: 'tc-2',
    title: 'Checkout Flow',
    description:
      'Add a sample product to the cart from the product listing page. Navigate to the cart, verify the item count and total price. Proceed to checkout, fill in shipping details, and confirm the order. Verify the order confirmation page loads with correct order summary.',
  },
  {
    key: 'tc-3',
    title: 'Search & Filter',
    description:
      'Open the main search bar and type a product keyword. Verify that autocomplete suggestions appear within 500ms. Select a suggestion and verify that the results page shows relevant items. Apply a price filter and confirm the results update correctly.',
  },
];

function SettingsTab() {
  const { t } = useTranslation();
  const [withLogin, setWithLogin] = useState(false);

  const testCaseItems = MOCK_TEST_CASES.map((tc) => ({
    key: tc.key,
    label: <span className="font-medium">{tc.title}</span>,
    children: <TestCaseContent tc={tc} />,
    showArrow: true,
  }));

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-2 max-w-lg">
        <Typography.Text strong>{t('Critical Failure')}</Typography.Text>
        <Typography.Text type="secondary" className="text-sm!">
          {t('Describe the most critical issue that should stop the test run')}
        </Typography.Text>
        <Input.TextArea
          rows={3}
          placeholder={t(
            'e.g. Application crashes on login, payment form not rendering...',
          )}
        />
      </div>

      <div className="flex flex-col gap-3 max-w-lg">
        <div className="flex items-center gap-3">
          <Switch checked={withLogin} onChange={setWithLogin} />
          <Typography.Text strong>{t('Requires Login')}</Typography.Text>
        </div>

        {withLogin && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Typography.Text type="secondary" className="text-sm!">
                {t('Login')}
              </Typography.Text>
              <Input placeholder={t('Username or email')} />
            </div>
            <div className="flex flex-col gap-1">
              <Typography.Text type="secondary" className="text-sm!">
                {t('Password')}
              </Typography.Text>
              <Input.Password placeholder={t('Password')} />
            </div>
            <div className="flex items-center gap-4">
              <Button type="primary">{t('Save')}</Button>
              <div className="text-sm text-disabled-text">
                {t(
                  'The test agent will attempt to log in using the provided credentials before running the test cases.',
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Typography.Text strong>{t('Test Cases')}</Typography.Text>
        <Typography.Text type="secondary" className="text-sm!">
          {t(
            'Expand any test case to see the steps that testing agent will perform.',
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
