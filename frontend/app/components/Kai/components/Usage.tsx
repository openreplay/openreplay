import React from 'react';
import { kaiStore } from '../KaiStore';
import { observer } from 'mobx-react-lite';
import { Progress, Tooltip } from 'antd';

function Usage() {
  const usage = kaiStore.usage;

  if (usage.total === 0) {
    return null;
  }

  const roundPercent = Math.round((usage.used / usage.total) * 100);
  return (
    <div>
      <Tooltip title={`Daily response limit (${usage.used}/${usage.total})`}>
        <Progress
          percent={roundPercent}
          strokeColor={
            roundPercent < 99 ? 'var(--color-main)' : 'var(--color-red)'
          }
          showInfo={false}
          type="circle"
          size={24}
        />
      </Tooltip>
    </div>
  );
}

export default observer(Usage);
