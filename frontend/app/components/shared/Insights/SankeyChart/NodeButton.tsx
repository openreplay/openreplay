import React from 'react';
import { Icon } from 'UI';
import { Popover } from 'antd';

interface Props {
  payload: any;
}

function NodeButton(props: Props) {
  const { payload } = props;

  return (
    <div className='relative'>
      <Popover
        content={<div className='bg-white rounded mt-1 text-xs'>
          <div className='border-b py-1 px-2 flex items-center'>
            <div className='w-6 shrink-0'>
              <Icon name='link-45deg' size={18} />
            </div>
            <div className='ml-1'>{payload.name}</div>
          </div>
          <div className='border-b py-1 px-2 flex items-center'>
            <div className='w-6 shrink-0'>
              <Icon name='arrow-right-short' size={18} color='green' />
            </div>
            <div className='ml-1 font-medium'>Continuing {Math.round(payload.value)}%</div>
          </div>
          {payload.avgTimeFromPrevious && (
            <div className='border-b py-1 px-2 flex items-center'>
              <div className='w-6 shrink-0'>
                <Icon name='clock-history' size={16} />
              </div>

              <div className='ml-1 font-medium'>
                Average time from previous step <span>{payload.avgTimeFromPrevious}</span>
              </div>
            </div>
          )}
        </div>}>
        <div
          className='flex items-center copy-popover select-none rounded shadow'
          style={{
            backgroundColor: 'white',
            padding: '3px 6px',
            // width: 'fit-content',
            fontSize: '12px'
          }}
        >
          <div style={{
            maxWidth: '120px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginRight: '5px'
          }}>{payload.name}</div>
          <span style={{ fontWeight: 'bold' }}>{Math.round(payload.value) + '%'}</span>
        </div>
      </Popover>
    </div>
  );
}

export default NodeButton;
