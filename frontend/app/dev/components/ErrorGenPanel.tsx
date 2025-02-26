import React, { useState } from 'react';
import { Popover, Button } from 'antd';
import { BugOutlined } from '@ant-design/icons';
import CrashReactAppButton from './CrashReactAppButton';
import EventErrorButton from './EventErrorButton';
import MemoryCrushButton from './MemoryCrushButton';
import PromiseErrorButton from './PromiseErrorButton';
import EvalErrorBtn from './EvalErrorBtn';
import InternalErrorButton from './InternalErrorButton';
import { options } from '../console';

export default function ErrorGenPanel() {
  if (window.env.PRODUCTION && !options.enableCrash) return null;
  return (
    <Popover
      content={(
        <div className="flex flex-col gap-3">
          <CrashReactAppButton />
          <EventErrorButton />
          <MemoryCrushButton />
          <PromiseErrorButton />
          <EvalErrorBtn />
          <InternalErrorButton />
        </div>
      )}
      placement="topRight"
    >
      <Button danger type="primary" className="ml-3" icon={<BugOutlined />} />
    </Popover>
  );
}
