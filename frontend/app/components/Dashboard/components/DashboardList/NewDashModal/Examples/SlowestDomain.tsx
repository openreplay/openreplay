import { LinkOutlined } from '@ant-design/icons';
import React from 'react';

import { Circle } from './Count';
import ExCard from './ExCard';

// TODO - delete this
function SlowestDomain(props: any) {
  const rows = [
    {
      label: 'kroger.com',
      value: '28,162 ms',
      progress: 97,
      icon: <LinkOutlined size={12} />,
    },
    {
      label: 'instacart.com',
      value: '3,165 ms',
      progress: 60,
      icon: <LinkOutlined size={12} />,
    },
    {
      label: 'gifs.eco.br',
      value: '1,503 ms',
      progress: 40,
      icon: <LinkOutlined size={12} />,
    },
    {
      label: 'cdn.byintera.com',
      value: '512 ms',
      progress: 10,
      icon: <LinkOutlined size={12} />,
    },
    {
      label: 'analytics.twitter.com',
      value: '110 ms',
      progress: 5,
      icon: <LinkOutlined size={12} />,
    },
  ];

  const lineWidth = 240;

  return (
    <ExCard {...props}>
      <div className="flex gap-1 flex-col">
        {rows.map((r) => (
          <div className="flex items-center gap-2 border-b border-dotted last:border-0 py-2 first:pt-0 last:pb-0">
            <Circle badgeType={2}>{r.icon}</Circle>
            <div className="ml-2 flex flex-col gap-0">
              <div>{r.label}</div>
              <div style={{ display: 'flex' }}>
                <div
                  style={{
                    height: 2,
                    width: lineWidth * (0.01 * r.progress),
                    background: '#394EFF',
                  }}
                  className="rounded-l"
                />
                <div
                  style={{
                    height: 2,
                    width: lineWidth - lineWidth * (0.01 * r.progress),
                    background: '#E2E4F6',
                  }}
                  className="rounded-r"
                />
              </div>
            </div>
            <div className="min-w-8 ml-auto">{r.value}</div>
          </div>
        ))}
      </div>
    </ExCard>
  );
}

export default SlowestDomain;
