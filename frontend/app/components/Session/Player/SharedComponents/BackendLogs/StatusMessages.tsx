import React from 'react';
import { client as settingsPath, CLIENT_TABS } from 'App/routes';
import { Icon } from 'UI';
import { LoadingOutlined } from '@ant-design/icons';
import { useHistory } from 'react-router-dom';
import { Button } from 'antd';

export function LoadingFetch({ provider }: { provider: string }) {
  return (
    <div
      className={
        'w-full h-full flex items-center justify-center flex-col gap-2'
      }
    >
      <LoadingOutlined style={{ fontSize: 32 }} />
      <div>Fetching logs from {provider}...</div>
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
  const history = useHistory();
  const intPath = settingsPath(CLIENT_TABS.INTEGRATIONS);
  return (
    <div
      className={
        'w-full h-full flex flex-col items-center justify-center gap-2'
      }
    >
      <Icon name={'exclamation-circle'} size={32} />
      <div className={'flex items-center gap-1'}>
        <span>Failed to fetch logs from {provider}. </span>
        <div className={'link'} onClick={onRetry}>
          Retry
        </div>
      </div>
      <div className={'link'} onClick={() => history.push(intPath)}>
        Check Configuration
      </div>
    </div>
  );
}
