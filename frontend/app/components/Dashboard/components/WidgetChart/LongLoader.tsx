import React from 'react';
import { Progress, Button } from 'antd';
import { Icon } from 'UI';

function LongLoader({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex flex-col gap-2 items-center justify-center" style={{ height: 240 }}>
      <div className="font-semibold flex gap-2 items-center">
        <Icon name="info-circle" size={16} />
        <div>Processing data...</div>
      </div>
      <div style={{ width: 180 }}>
        <Progress
          percent={40}
          strokeColor={{
            '0%': '#394EFF',
            '100%': '#394EFF',
          }}
          status="active"
          showInfo={false}
        />
      </div>
      <div>
        This is taking longer than expected.
      </div>
      <div>
        Use sample data to speed up query and get a faster response.
      </div>
      <Button onClick={onClick}>
        Use Sample Data
      </Button>
    </div>
  );
}

export default LongLoader;
