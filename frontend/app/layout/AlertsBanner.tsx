import { Button } from 'antd';
import { TriangleAlert } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';

const levelToBg: Record<string, string> = {
  alert: 'bg-red-light',
  error: 'bg-red-light',
  warning: 'bg-yellow',
  warn: 'bg-yellow',
  info: 'bg-light-blue-bg',
  success: 'bg-green-light',
};

function AlertsBanner() {
  const { userStore } = useStore();
  const alerts = userStore.account?.alerts;
  if (!alerts?.length) return null;

  return (
    <>
      {alerts.map((alert, idx) => {
        const bgClass =
          levelToBg[alert.level?.toLowerCase() ?? ''] ?? levelToBg.info;
        return (
          <div
            key={idx}
            className={`px-4 py-2 flex items-center justify-center gap-3 w-full ${bgClass}`}
          >
            <TriangleAlert className="text-red" size={16} strokeWidth={2} />
            <div className="font-bold">{alert.text}</div>
            {alert.button && alert.url ? (
              <Button
                size="small"
                type="primary"
                onClick={() =>
                  window.open(alert.url, '_blank', 'noopener,noreferrer')
                }
              >
                {alert.button}
              </Button>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export default observer(AlertsBanner);
