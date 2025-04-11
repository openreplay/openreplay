import React from 'react';
import { client as settingsPath, CLIENT_TABS } from 'App/routes';
import { Icon } from 'UI';
import { LoadingOutlined } from '@ant-design/icons';
import { useHistory } from 'react-router-dom';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

export function LoadingFetch({ provider }: { provider: string }) {
  const { t } = useTranslation();
  return (
    <div className="w-full h-full flex items-center justify-center flex-col gap-2">
      <LoadingOutlined size={32} />
      <div>
        {t('Fetching logs from')}
        {provider}
        ...
      </div>
    </div>
  );
}

export function FailedFetch({
  provider,
  onRetry,
}: {
  provider: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const history = useHistory();
  const intPath = settingsPath(CLIENT_TABS.INTEGRATIONS);
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
      <div className="flex items-center gap-1 font-medium">
        <Icon name="exclamation-circle" size={14} />
        <span>
          {t('Failed to fetch logs from')}
          {provider}.{' '}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button type="text" size="small" onClick={onRetry}>
          {t('Retry')}
        </Button>

        <Button type="text" size="small" onClick={() => history.push(intPath)}>
          {t('Check Configuration')}
        </Button>
      </div>
    </div>
  );
}
