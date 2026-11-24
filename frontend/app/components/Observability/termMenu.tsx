import type { MenuItem } from '@/ui/actions/dropdown-menu';
import type { TFunction } from 'i18next';
import { CircleMinus, ListFilter } from 'lucide-react';
import React from 'react';

/** Filter by / Exclude one key-value pair (or undo either), then a divider. */
export function termMenuItems(
  t: TFunction,
  pair: string,
  state: 'in' | 'out' | undefined,
  toggle: (operator: 'is' | 'isNot', on: boolean) => void,
  canExclude = true,
): MenuItem[] {
  const offer = (text: string) => (
    <span className="m-logs__menu-pair">
      {text} <b>{pair}</b>
    </span>
  );
  return [
    {
      key: 'in',
      icon: <ListFilter size={14} />,
      label: state === 'in' ? t('Remove filter') : offer(t('Filter by')),
      onClick: () => toggle('is', state !== 'in'),
    },
    ...(canExclude
      ? [
          {
            key: 'out',
            icon: <CircleMinus size={14} />,
            label: state === 'out' ? t('Stop excluding') : offer(t('Exclude')),
            onClick: () => toggle('isNot', state !== 'out'),
          },
        ]
      : []),
    { key: 'd', type: 'divider' },
  ];
}
