import React from 'react';
import { Icon } from 'UI';
import { Popover } from 'antd';

interface Props {
  payload: any;
}

function NodeButton(props: Props) {
  const { payload } = props;
  const [show, setShow] = React.useState(false);

  const toggleMenu = (e: React.MouseEvent) => {
    setShow(!show);
  };

  return (
    <div className='relative'>
      <Popover content={
        <div className='bg-white rounded w-fit mt-1 text-xs'>
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
          <div className='border-b py-1 px-2 flex items-center'>
            <div className='w-6 shrink-0'>
              <Icon name='clock-history' size={16} />
            </div>
            <div className='ml-1 font-medium'>
              Average time from previous step <span>{payload.avgTimeFromPrevious}</span>
            </div>
          </div>
        </div>
      } title={<div className='text-sm'>Title</div>}>
        <div
          className='copy-popover select-none rounded shadow'
          style={{
            backgroundColor: 'white',
            padding: '3px 6px',
            width: 'fit-content',
            fontSize: '12px'
          }}
          onClick={toggleMenu}
        >
          {payload.name} <span style={{ fontWeight: 'bold' }}>{Math.round(payload.value) + '%'}</span>
          {/*{' '} <span style={{}}>{payload.avgTimeFromPrevious}</span>*/}
        </div>
      </Popover>
    </div>
  );
}

export default NodeButton;
