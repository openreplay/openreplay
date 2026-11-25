import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import {
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  Split,
  Trash2,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import './segment-indicator.css';

export interface SegmentIndicatorProps {
  name: string;
  /** the segment's rules as one sentence */
  rules: string;
  count: number;
  /** the count's own phrase, when it is not sessions */
  countText?: string;
  /** a saved Logs view reads as a view, not a segment */
  kind?: 'segment' | 'view';
  icon?: ReactNode;
  /** the rules on the page no longer match the saved segment */
  edited: boolean;
  expanded: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  /** asks first */
  onDelete?: () => void;
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
  countText,
  kind = 'segment',
  icon,
  edited,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onClear,
  onSaveChanges,
  saving,
  children,
}: SegmentIndicatorProps) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const view = kind === 'view';
  return (
    <section
      className={`m-segind${expanded ? ' is-open' : ''}${edited ? ' is-edited' : ''}`}
      aria-label={
        view ? t('View: {{name}}', { name }) : t('Segment: {{name}}', { name })
      }
    >
      <div className="m-segind__bar">
        <span className="m-segind__mark" aria-hidden="true">
          {icon ?? <Split size={15} />}
        </span>
        <span className="m-segind__chip m-truncate" title={name}>
          {name}
        </span>
        {edited && <span className="m-segind__edited">{t('Edited')}</span>}
        <span className="m-segind__rules m-truncate">{rules}</span>
        <span className="m-segind__count">
          {countText ??
            (count === 1
              ? t('1 session')
              : t('{{n}} sessions', {
                  n: count.toLocaleString(),
                  count: count,
                }))}
        </span>
        <span className="m-segind__actions">
          {edited && onSaveChanges && (
            <Button variant="primary" loading={saving} onClick={onSaveChanges}>
              {t('Save changes')}
            </Button>
          )}
          {!edited && (
            <Button disabled className="m-segind__saved">
              <Check size={13} aria-hidden="true" />
              {view ? t('View saved') : t('Segment saved')}
            </Button>
          )}
          <Button variant="subtle" onClick={onClear}>
            {t('Clear')}
          </Button>
          {onEdit && <Button onClick={onEdit}>{t('Edit')}</Button>}
          {onDelete && (
            <IconButton
              icon={<Trash2 size={14} />}
              label={view ? t('Delete this view') : t('Delete this segment')}
              variant="ghost"
              onClick={() => setConfirming(true)}
            />
          )}
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
      {onDelete && (
        <ConfirmDialog
          open={confirming}
          title={view ? t('Delete this view?') : t('Delete this segment?')}
          okText={t('Delete')}
          danger
          onOk={() => {
            setConfirming(false);
            onDelete();
          }}
          onCancel={() => setConfirming(false)}
        >
          {view
            ? t(
                '“{{name}}” goes. Only the saved filters go; no log is deleted.',
                {
                  name,
                },
              )
            : t(
                '“{{name}}” goes for everyone. Only the saved filters go; nothing they found is deleted.',
                { name },
              )}
        </ConfirmDialog>
      )}
    </section>
  );
}
