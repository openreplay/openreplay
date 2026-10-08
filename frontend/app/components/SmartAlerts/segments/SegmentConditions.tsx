import { Chip } from '@/ui/data/Chip';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type FilterItem from 'App/mstore/types/filterItem';

import type { SavedSegment } from '../api';
import './segment-chip.css';

/* Read-only view of a segment's query, for hover cards. */
function SegmentConditions({ segment }: { segment: SavedSegment }) {
  const { t } = useTranslation();
  const events = segment.filters.filter((f) => f.isEvent);
  const rest = segment.filters.filter((f) => !f.isEvent);

  const row = (f: FilterItem, idx?: number) => {
    const vals = (f.value ?? []).filter((v) => v !== '' && v != null);
    const category = f.subCategory || f.category;
    return (
      <div key={`${f.name}-${idx ?? 'f'}`} className="m-segcond__row">
        {idx != null && <span className="m-segcond__n">{idx + 1}</span>}
        <Chip kind="tag">
          {category ? `${category} · ` : ''}
          {f.displayName || f.name}
        </Chip>
        {vals.length > 0 && f.operator && (
          <span className="m-segcond__op">{f.operator}</span>
        )}
        {vals.map((v) => (
          <Chip key={v} tone="neutral">
            {v}
          </Chip>
        ))}
      </div>
    );
  };

  return (
    <div className="m-segcond">
      {segment.filters.length ? (
        <>
          {events.length > 0 && (
            <p className="m-segcond__section">{t('Events, in order')}</p>
          )}
          {events.map((f, i) => row(f, i))}
          {rest.length > 0 && (
            <p className="m-segcond__section">{t('Filters')}</p>
          )}
          {rest.map((f) => row(f))}
        </>
      ) : (
        <p className="m-segcond__op">{t('Matches all traffic')}</p>
      )}
      {!segment.mine && segment.createdBy && (
        <p className="m-segcond__by">
          {t('by {{name}}', { name: segment.createdBy })}
        </p>
      )}
    </div>
  );
}

export default SegmentConditions;
