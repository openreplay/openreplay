import { Angry, ArrowDownUp, Mouse, MousePointerClick, Unlink } from 'lucide-react';
import React from 'react';



import ExCard from './ExCard';


function ExampleCount() {
  return <ExCard title={'Sessions by'}>
    <Frustrations />
  </ExCard>;
}

function Frustrations() {
  const rows = [
    {
      label: 'Rage Clicks',
      progress: 25,
      value: 100,
      icon: <Angry size={12} strokeWidth={1} />,
    },
    {
      label: 'Dead Clicks',
      progress: 75,
      value: 75,
      icon: <MousePointerClick size={12} strokeWidth={1} />,
    },
    {
      label: '4XX Pages',
      progress: 50,
      value: 50,
      icon: <Unlink size={12} strokeWidth={1} />,
    },
    {
      label: 'Mouse Trashing',
      progress: 10,
      value: 25,
      icon: <Mouse size={12} strokeWidth={1} />,
    },
    {
      label: 'Excessive Scrolling',
      progress: 10,
      value: 10,
      icon: <ArrowDownUp size={12} strokeWidth={1} />,
    },
  ];

  return (
    <div className={'flex gap-2 flex-col'}>
      {rows.map((r) => (
        <div
          className={
            'flex items-center gap-2 border-b border-dotted last:border-0 py-2 first:pt-0 last:pb-0'
          }
        >
          <Circle badgeType={0}>{r.icon}</Circle>
          <div>{r.label}</div>
          <div style={{ marginLeft: 'auto', marginRight: 20, display: 'flex' }}>
            <div
              style={{
                height: 2,
                width: 140 * (0.01 * r.progress),
                background: '#394EFF',
              }}
              className={'rounded-l'}
            />
            <div
              style={{
                height: 2,
                width: 140-(140 * (0.01 * r.progress)),
                background: '#E2E4F6',
              }}
              className={'rounded-r'}
            />
          </div>
          <div className={'min-w-8'}>{r.value}</div>
        </div>
      ))}
    </div>
  );
}

function Errors() {
  const rows = [
    {
      label: 'HTTP response status code (404 Not Found)',
      value: 500,
      progress: 90,
      icon: <div className={'text-red text-xs'}>4XX</div>,
    },
    {
      label: 'Cross-origin request blocked',
      value: 300,
      progress: 60,
      icon: <div className={'text-red text-xs'}>CROS</div>,
    },
    {
      label: 'Reference error',
      value: 200,
      progress: 40,
      icon: <div className={'text-red text-xs'}>RE</div>,
    },
    {
      label: 'Unhandled Promise Rejection',
      value: 50,
      progress: 20,
      icon: <div className={'text-red text-xs'}>NULL</div>,
    },
    {
      label: 'Failed Network Request',
      value: 10,
      progress: 5,
      icon: <div className={'text-red text-xs'}>XHR</div>,
    },
  ];
}

function Circle({
  children,
  badgeType,
}: {
  children: React.ReactNode;
  badgeType: 0 | 1 | 2;
}) {
  const colors = {
    0: '#FFFBE6',
    1: '#FFF1F0',
    2: '#EBF4F5',
  };

  return (
    <div
      className={'p-2 rounded-full'}
      style={{ background: colors[badgeType] }}
    >
      {children}
    </div>
  );
}


export default ExampleCount