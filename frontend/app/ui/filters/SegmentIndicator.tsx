import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { ChevronsDownUp, ChevronsUpDown, Split } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import './segment-indicator.css';

export interface SegmentIndicatorProps {
  name: string;
  /** the segment's rules as one sentence */
  rules: string;
  count: number;
  /** the rules on the page no longer match the saved segment */
  edited: boolean;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onClear: () => void;
  /** given when the rules were edited and the segment is yours */
  onSaveChanges?: () => void;
  saving?: boolean;
  /** the filter, shown under the strip when expanded */
  children: ReactNode;
}

/** A search that is a saved segment, folded into one strip. The body stays
    mounted while folded, so the filter keeps its own state. */
export function SegmentIndicator({
  name,
  rules,
  count,
  edited,
  expanded,
  onToggle,
  onEdit,
  onClear,
  onSaveChanges,
  saving,
  children,
}: SegmentIndicatorProps) {
  const { t } = useTranslation();
  return (
    <section
      className={`m-segind${expanded ? ' is-open' : ''}${edited ? ' is-edited' : ''}`}
      aria-label={t('Segment: {{name}}', { name })}
    >
      <div className="m-segind__bar">
        <Split size={15} className="m-segind__mark" aria-hidden="true" />
        <span className="m-segind__chip m-truncate" title={name}>
          {name}
        </span>
        {edited && <span className="m-segind__edited">{t('Edited')}</span>}
        <span className="m-segind__rules m-truncate">{rules}</span>
        <span className="m-segind__count">
          {count === 1
            ? t('1 session')
            : t('{{n}} sessions', { n: count.toLocaleString() })}
        </span>
        <span className="m-segind__actions">
          {edited && onSaveChanges && (
            <Button variant="primary" loading={saving} onClick={onSaveChanges}>
              {t('Save changes')}
            </Button>
          )}
          <Button variant="subtle" onClick={onClear}>
            {t('Clear')}
          </Button>
          <Button onClick={onEdit}>{t('Edit')}</Button>
          <IconButton
            icon={
              expanded ? (
                <ChevronsDownUp size={14} />
              ) : (
                <ChevronsUpDown size={14} />
              )
            }
            label={expanded ? t('Hide the rules') : t('Show the rules')}
            variant="ghost"
            onClick={onToggle}
            aria-expanded={expanded}
          />
        </span>
      </div>
      <div className="m-segind__fold" aria-hidden={!expanded} inert={!expanded}>
        <div className="m-segind__body">{children}</div>
      </div>
    </section>
  );
}
