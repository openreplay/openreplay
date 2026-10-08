import { Button } from '@/ui/actions/button';
import { TriangleAlert } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';

import './banners.css';

const levelTone: Record<string, string> = {
  alert: 'danger',
  error: 'danger',
  warning: 'warning',
  warn: 'warning',
  info: 'info',
  success: 'success',
};

function AlertsBanner() {
  const { userStore } = useStore();
  const alerts = userStore.account?.alerts;
  if (!alerts?.length) return null;

  return (
    <>
      {alerts.map((alert, idx) => (
        <div
          key={idx}
          className={`m-banner m-banner--${levelTone[alert.level?.toLowerCase() ?? ''] ?? 'info'}`}
          role="status"
        >
          <TriangleAlert size={15} aria-hidden="true" />
          <span className="m-banner__text font-medium">{alert.text}</span>
          {alert.button && alert.url ? (
            <span className="m-banner__actions">
              <Button
                variant="primary"
                onClick={() =>
                  window.open(alert.url, '_blank', 'noopener,noreferrer')
                }
              >
                {alert.button}
              </Button>
            </span>
          ) : null}
        </div>
      ))}
    </>
  );
}

export default observer(AlertsBanner);
