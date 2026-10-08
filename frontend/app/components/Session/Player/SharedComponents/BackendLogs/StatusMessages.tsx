import { Button } from '@/ui/actions/button';
import { Icon } from '@/ui/icons/Icon';
import { LoaderCircle } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { CLIENT_TABS, client as settingsPath } from 'App/routes';
import { useHistory } from 'App/routing';

export function LoadingFetch({ provider }: { provider: string }) {
  const { t } = useTranslation();
  return (
    <div className="w-full h-full flex items-center justify-center flex-col gap-2">
      <LoaderCircle size={24} className="animate-spin text-content-muted" />
      <div>
        {t('Fetching logs from')}
        &nbsp;
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
        <Button variant="subtle" onClick={onRetry}>
          {t('Retry')}
        </Button>

        <Button variant="subtle" onClick={() => history.push(intPath)}>
          {t('Check Configuration')}
        </Button>
      </div>
    </div>
  );
}
