import React from 'react';
import { Tooltip } from 'antd';

function TabTag({ tabNum }: { tabNum?: React.ReactNode }) {
  return (

    <Tooltip title="@Nikita show tab title here..." placement='left'>
    <div className={'bg-gray-light rounded-full min-w-5 min-h-5 w-5 h-5 flex items-center justify-center text-xs cursor-default'}>
      {tabNum}
    </div>
    </Tooltip>
  )
}

export default TabTag