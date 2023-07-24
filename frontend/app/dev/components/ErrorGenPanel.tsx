import React, { useState } from 'react';
import CrashReactAppButton from './CrashReactAppButton';
import EventErrorButton from './EventErrorButton';
import MemoryCrushButton from './MemoryCrushButton';
import PromiseErrorButton from './PromiseErrorButton';
import EvalErrorBtn from './EvalErrorBtn';
import InternalErrorButton from './InternalErrorButton';
import { options } from '../console';
import UserMenu from 'Components/Header/UserMenu/UserMenu';
import { Popover, Button } from 'antd';

export default function ErrorGenPanel() {
  if (window.env.PRODUCTION && !options.enableCrash) return null;
  return (
    <Popover content={
      <div className='flex flex-col gap-3'>
        <CrashReactAppButton />
        <EventErrorButton />
        <MemoryCrushButton />
        <PromiseErrorButton />
        <EvalErrorBtn />
        <InternalErrorButton />
      </div>
    }>
      <Button danger type="primary" className="ml-3">Show buttons</Button>
    </Popover>
  );
}