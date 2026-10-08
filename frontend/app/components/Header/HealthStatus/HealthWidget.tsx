import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { OpenReplayMark } from '@/ui/brand/OpenReplayMark';
import { StatTile } from '@/ui/data/StatTile';
import { CircleAlert, CircleCheck, RefreshCcw } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import type { HealthResponse } from './HealthReport';
import './health.css';

function HealthWidget({
  healthResponse,
  getHealth,
  isLoading,
  lastAsked,
  setShowModal,
  isError,
}: {
  healthResponse: HealthResponse;
  getHealth: () => void;
  isLoading: boolean;
  lastAsked: string | null;
  setShowModal: (visible: boolean) => void;
  isError?: boolean;
}) {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const ok = !isError && healthResponse?.overallHealth;
  // the popover mounts this on open, so "now" is the moment it was opened
  const [openedAt] = React.useState(Date.now);
  const minutes = lastAsked
    ? Math.max(0, Math.round((openedAt - parseInt(lastAsked, 10)) / 60000))
    : 0;
  const failing = Object.values(healthResponse?.healthMap ?? {}).filter(
    (s) => !s.healthOk,
  );
  const details = healthResponse?.details;

  return (
    <div className="m-health__widget">
      <div className="m-health__widget-head">
        <span className={`m-health__title ${ok ? 'is-ok' : 'is-bad'}`}>
          <span className="inline-flex items-center gap-2">
            {ok ? <CircleCheck size={14} /> : <CircleAlert size={14} />}
            {ok ? t('All systems operational') : t('Service disruption')}
          </span>
        </span>
        <IconButton
          icon={
            <RefreshCcw size={13} className={isLoading ? 'animate-spin' : ''} />
          }
          label={t('Recheck')}
          variant="ghost"
          disabled={isLoading}
          onClick={getHealth}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-content-muted">
        <OpenReplayMark variant="plain" size={12} />
        <span className="m-mono">{userStore.account.versionNumber}</span>
        <span className="ml-auto">
          {t('Checked {{n}} min ago', { n: minutes })}
        </span>
      </div>
      {isError && (
        <p className="text-xs text-content-danger">
          {t('Error getting service health status')}
        </p>
      )}
      {details && (
        <div className="m-health__stats">
          <StatTile
            value={(details.numberOfSessionsCaptured ?? 0).toLocaleString()}
            label={t('Sessions captured')}
          />
          <StatTile
            value={(details.numberOfEventCaptured ?? 0).toLocaleString()}
            label={t('Events captured')}
          />
        </div>
      )}
      {!isError && failing.length > 0 && (
        <div className="flex flex-col gap-2 text-xs">
          <span className="text-content-muted">
            {t('Issues found with:')}{' '}
            <span className="text-content-primary">
              {failing.map((s) => s.name).join(', ')}
            </span>
          </span>
        </div>
      )}
      <Button onClick={() => setShowModal(true)}>
        {t('Installation status')}
      </Button>
    </div>
  );
}

export default observer(HealthWidget);
