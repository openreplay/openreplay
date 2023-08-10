import React from 'react';
import { Icon } from 'UI';

interface Props {
  payload: any;
}
function NodeButton(props: Props) {
  const { payload } = props;
  const [show, setShow] = React.useState(false);

  const toggleMenu = (e: React.MouseEvent) => {
    console.log('p', payload);
    setShow(!show);
  };

  return (
    <div className="relative">
      <div
        className="copy-popover select-none rounded shadow"
        style={{
          backgroundColor: 'white',
          padding: '3px 6px',
          width: 'fit-content',
          fontSize: '12px',
        }}
        onClick={toggleMenu}
      >
        {payload.name} <span style={{ fontWeight: 'bold' }}>{payload.value + 'k'}</span>{' '}
        <span style={{}}>2s</span>
      </div>
      {show && (
        <div className="bg-white rounded w-fit mt-1 text-sm">
          <div className="border-b py-1 px-2 flex items-center">
            <div className="w-6 shrink-0">
              <Icon name="link-45deg" size={18} />
            </div>
            <div className="ml-1">{payload.name}</div>
          </div>
          <div className="border-b py-1 px-2 flex items-center">
            <div className="w-6 shrink-0">
              <Icon name="arrow-right-short" size={18} color="green" />
            </div>
            <div className="ml-1 font-medium">Continuing {payload.value}</div>
          </div>
          <div className="border-b py-1 px-2 flex items-center">
            <div className="w-6 shrink-0">
              <Icon name="clock-history" size={16} />
            </div>
            <div className="ml-1 font-medium">
              Average time from previous step <span>2s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NodeButton;
