import { Button, Space, Tag } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type FilterItem from 'App/mstore/types/filterItem';

import { getIconForFilter } from 'Shared/Filters/FilterModal';

import type { SavedSegment } from '../api';

/* Read-only view of a segment's query for hover cards. Each condition reuses
   the same chip FilterItem renders in the search bar (icon + "Category • Name"),
   so the two surfaces can't drift apart; values follow as tags. */

function ConditionChip({ f }: { f: FilterItem }) {
  const categoryPart = f.subCategory || f.category;
  const namePart = f.displayName || f.name;
  return (
    <Button
      type="default"
      size="small"
      style={{ maxWidth: '20rem', flexShrink: 0, pointerEvents: 'none' }}
    >
      <Space size={4} align="center">
        <span className="text-gray-600 shrink-0">
          {getIconForFilter(f as any)}
        </span>
        {categoryPart && (
          <span className="text-neutral-500/90 capitalize truncate">
            {categoryPart}
          </span>
        )}
        {categoryPart && namePart && (
          <span className="text-neutral-400">•</span>
        )}
        <span className="text-black truncate">{namePart}</span>
      </Space>
    </Button>
  );
}

function SegmentConditions({ segment }: { segment: SavedSegment }) {
  const { t } = useTranslation();
  const filters = segment.filters;
  const events = filters.filter((f) => f.isEvent);
  const rest = filters.filter((f) => !f.isEvent);

  const section = (label: string) => (
    <div className="text-[11px] font-medium uppercase tracking-wider mt-1 first:mt-0 color-gray-medium">
      {label}
    </div>
  );

  const row = (f: FilterItem, idx?: number) => {
    const vals = (f.value ?? []).filter((v) => v !== '' && v != null);
    return (
      <div
        key={`${f.name}-${idx ?? 'f'}`}
        className="flex items-center gap-2 flex-wrap"
      >
        {idx != null && (
          <span className="shrink-0 w-6 h-6 text-xs flex items-center justify-center rounded-full bg-gray-lightest text-gray-600 font-medium">
            {idx + 1}
          </span>
        )}
        <ConditionChip f={f} />
        {vals.length > 0 && f.operator && (
          <span className="text-xs color-gray-medium">{f.operator}</span>
        )}
        {vals.map((v) => (
          <Tag key={v} className="m-0!">
            {v}
          </Tag>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2" style={{ maxWidth: 340 }}>
      {filters.length ? (
        <>
          {events.length > 0 && section(t('Events — in order'))}
          {events.map((f, i) => row(f, i))}
          {rest.length > 0 && section(t('Filters'))}
          {rest.map((f) => row(f))}
        </>
      ) : (
        <div className="text-sm color-gray-medium">
          {t('Matches all traffic')}
        </div>
      )}
      {!segment.mine && segment.createdBy && (
        <div className="flex items-center justify-end border-t mt-1 pt-3 text-xs color-gray-medium">
          <span>
            {t('by')} {segment.createdBy}
          </span>
        </div>
      )}
    </div>
  );
}

export default SegmentConditions;
