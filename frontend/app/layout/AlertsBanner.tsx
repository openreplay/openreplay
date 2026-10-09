import { Notice, type NoticeKind } from '@/ui/feedback/Notice';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';

const levelKind: Record<string, NoticeKind> = {
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
        <Notice
          key={idx}
          kind={levelKind[alert.level?.toLowerCase() ?? ''] ?? 'info'}
          action={
            alert.button && alert.url ? (
              <a href={alert.url} target="_blank" rel="noopener noreferrer">
                {alert.button}
              </a>
            ) : undefined
          }
        >
          {alert.text}
        </Notice>
      ))}
    </>
  );
}

export default observer(AlertsBanner);
