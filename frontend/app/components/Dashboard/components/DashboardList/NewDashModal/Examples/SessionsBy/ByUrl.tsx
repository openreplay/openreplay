import { LinkOutlined } from '@ant-design/icons';
import { Segmented } from 'antd';
import React from 'react';

import { Circle } from '../Count';
import ExCard from '../ExCard';
import ByComponent from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/Component';

function ByUrl(props: any) {
  const [mode, setMode] = React.useState(0);
  const rows = [
    {
      label: '/category/womens/dresses',
      ptitle: 'Dresses',
      value: '500',
      progress: 75,
      icon: <LinkOutlined size={12} />,
    },
    {
      label: '/search?q=summer+dresses',
      ptitle: 'Search: summer dresses',
      value: '306',
      progress: 60,
      icon: <LinkOutlined size={12} />,
    },
    {
      label: '/account/orders',
      ptitle: 'Account: Orders',
      value: '198',
      progress: 30,
      icon: <LinkOutlined size={12} />,
    },
    {
      label: '/checkout/confirmation',
      ptitle: 'Checkout: Confirmation',
      value: '47',
      progress: 15,
      icon: <LinkOutlined size={12} />,
    },
    {
      label: '/checkout/payment',
      ptitle: 'Checkout: Payment',
      value: '5',
      progress: 5,
      icon: <LinkOutlined size={12} />,
    },
  ];

  const lineWidth = 240;
  return (
    <ByComponent
      {...props}
      rows={rows}
      lineWidth={lineWidth}
    />
    // <ExCard
    //     {...props}
    //   title={
    //     <div className={'flex gap-2 items-center'}>
    //       <div>{props.title}</div>
    //       <div className={'font-normal'}><Segmented
    //         options={[
    //           { label: 'URL', value: '0' },
    //           { label: 'Page Title', value: '1' },
    //         ]}
    //         onChange={(v) => setMode(Number(v))}
    //         size='small'
    //       />
    //       </div>
    //     </div>
    //   }
    // >
    //   <div className={'flex gap-1 flex-col'}>
    //     {rows.map((r) => (
    //       <div
    //         className={
    //           'flex items-center gap-2 border-b border-dotted last:border-0 py-2 first:pt-0 last:pb-0'
    //         }
    //       >
    //         <Circle badgeType={1}>{r.icon}</Circle>
    //         <div className={'ml-2 flex flex-col gap-0'}>
    //           <div>{mode === 0 ? r.label : r.ptitle}</div>
    //           <div style={{ display: 'flex' }}>
    //             <div
    //               style={{
    //                 height: 2,
    //                 width: lineWidth * (0.01 * r.progress),
    //                 background: '#394EFF',
    //               }}
    //               className={'rounded-l'}
    //             />
    //             <div
    //               style={{
    //                 height: 2,
    //                 width: lineWidth - lineWidth * (0.01 * r.progress),
    //                 background: '#E2E4F6',
    //               }}
    //               className={'rounded-r'}
    //             />
    //           </div>
    //         </div>
    //         <div className={'min-w-8 ml-auto'}>{r.value}</div>
    //       </div>
    //     ))}
    //   </div>
    // </ExCard>
  );
}

export default ByUrl;
