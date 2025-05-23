import React from 'react';
import { kaiStore } from '../KaiStore';
import { observer } from 'mobx-react-lite';
import { Progress, Tooltip } from 'antd';
const getUsageColor = (percent: number) => {
  return 'disabled-text';
};

function Usage() {
  const usage = kaiStore.usage;

  if (usage.total === 0) {
    return null;
  }
  return (
    <div>
      <Tooltip title={`Daily response limit (${usage.used}/${usage.total})`}>
        <Progress
          percent={usage.percent}
          strokeColor={usage.percent < 99 ? 'var(--color-main)' : 'var(--color-red)'}
          showInfo={false}
          type="circle"
          size={24}
        />
      </Tooltip>
    </div>
  );
}

export default observer(Usage);
