import { Checkbox, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import Environments from './Environments';

function SettingsTab() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-8 p-4 max-w-2xl">
      <Environments />

      <div className="flex flex-col gap-2">
        <Typography.Text strong>{t('Notifications')}</Typography.Text>
        <Typography.Text type="secondary" className="text-sm!">
          {t('You will receive a weekly summary of all test runs to your email.')}
        </Typography.Text>
        <Checkbox>{t('Notify immediately on failures')}</Checkbox>
      </div>
    </div>
  );
}

export default SettingsTab;
