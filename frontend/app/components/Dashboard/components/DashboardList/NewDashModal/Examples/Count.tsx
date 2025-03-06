import { Segmented } from 'antd';
import {
  Angry,
  ArrowDownUp,
  Mouse,
  MousePointerClick,
  Unlink,
} from 'lucide-react';
import React from 'react';

import ExCard from './ExCard';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

const TYPES = (t: TFunction) => ({
  Frustrations: t('frustrations'),
  Errors: t('errors'),
  Users: t('users'),
});

function ExampleCount(props: any) {
  const { t } = useTranslation();
  const [type, setType] = React.useState(TYPES(t).Frustrations);

  const el = {
    [TYPES(t).Frustrations]: <Frustrations />,
    [TYPES(t).Errors]: <Errors />,
    [TYPES(t).Users]: <Users />,
  };
  return (
    <ExCard
      {...props}
      title={
        <div className="flex items-center gap-2">
          <div>{props.title}</div>
          <div className="font-normal">
            <Segmented
              options={[
                { label: t('Frustrations'), value: '0' },
                { label: t('Errors'), value: '1' },
                { label: t('Users'), value: '2' },
              ]}
              size="small"
              onChange={(v) => setType(v)}
            />
          </div>
        </div>
      }
    >
      {el[type]}
    </ExCard>
  );
}

export function Frustrations() {
  const { t } = useTranslation();
  const rows = [
    {
      label: t('Rage Clicks'),
      progress: 25,
      value: 100,
      icon: <Angry size={12} strokeWidth={1} />,
    },
    {
      label: t('Dead Clicks'),
      progress: 75,
      value: 75,
      icon: <MousePointerClick size={12} strokeWidth={1} />,
    },
    {
      label: t('4XX Pages'),
      progress: 50,
      value: 50,
      icon: <Unlink size={12} strokeWidth={1} />,
    },
    {
      label: t('Mouse Trashing'),
      progress: 10,
      value: 25,
      icon: <Mouse size={12} strokeWidth={1} />,
    },
    {
      label: t('Excessive Scrolling'),
      progress: 10,
      value: 10,
      icon: <ArrowDownUp size={12} strokeWidth={1} />,
    },
  ];

  const lineWidth = 140;
  return (
    <div className="flex gap-1 flex-col">
      {rows.map((r) => (
        <div className="flex items-center gap-2 border-b border-dotted py-2 last:border-0 first:pt-0 last:pb-0">
          <Circle badgeType={0}>{r.icon}</Circle>
          <div>{r.label}</div>
          <div style={{ marginLeft: 'auto', marginRight: 20, display: 'flex' }}>
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
          <div className="min-w-8">{r.value}</div>
        </div>
      ))}
    </div>
  );
}

export function Errors() {
  const { t } = useTranslation();
  const rows = [
    {
      label: t('HTTP response status code (404 Not Found)'),
      value: 500,
      progress: 90,
      icon: <div className="text-red text-xs">{t('4XX')}</div>,
    },
    {
      label: t('Cross-origin request blocked'),
      value: 300,
      progress: 60,
      icon: <div className="text-red text-xs">{t('CROS')}</div>,
    },
    {
      label: t('Reference error'),
      value: 200,
      progress: 40,
      icon: <div className="text-red text-xs">{t('RE')}</div>,
    },
    {
      label: 'Unhandled Promise Rejection',
      value: 50,
      progress: 20,
      icon: <div className="text-red text-xs">{t('NULL')}</div>,
    },
    {
      label: 'Failed Network Request',
      value: 10,
      progress: 5,
      icon: <div className="text-red text-xs">{t('XHR')}</div>,
    },
  ];

  const lineWidth = 270;
  return (
    <div className="flex gap-1 flex-col">
      {rows.map((r) => (
        <div className="flex items-center gap-2 border-b border-dotted last:border-0 py-2 first:pt-0 last:pb-0">
          <Circle badgeType={1}>{r.icon}</Circle>
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
  );
}

export function Users() {
  const rows = [
    {
      label: 'pedro@mycompany.com',
      value: '9.5K',
    },
    {
      label: 'mauricio@mycompany.com',
      value: '2.5K',
    },
    {
      label: 'alex@mycompany.com',
      value: '405',
    },
    {
      label: 'jose@mycompany.com',
      value: '150',
    },
    {
      label: 'maria@mycompany.com',
      value: '123',
    },
  ];

  return (
    <div className="flex gap-1 flex-col">
      {rows.map((r) => (
        <div className="flex items-center gap-2 border-b border-dotted py-2 last:border-0 first:pt-0 last:pb-0">
          <Circle badgeType={2}>{r.label[0].toUpperCase()}</Circle>
          <div className="ml-2">
            <div>{r.label}</div>
          </div>
          <div className="min-w-8 ml-auto">{r.value}</div>
        </div>
      ))}
    </div>
  );
}

export function Circle({
  children,
  badgeType,
}: {
  children: React.ReactNode;
  badgeType: 0 | 1 | 2 | 3;
}) {
  const colors = {
    // frustrations
    0: '#FFFBE6',
    // errors
    1: '#FFF1F0',
    // users and domains
    2: '#EBF4F5',
    // sessions by url
    3: '#E2E4F6',
  };

  return (
    <div
      className="w-8 h-8 flex items-center justify-center rounded-full"
      style={{ background: colors[badgeType] }}
    >
      {children}
    </div>
  );
}

export default ExampleCount;
