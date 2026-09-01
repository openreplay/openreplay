import { Tag, Tooltip } from 'antd';
import { AlertTriangle, X } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function CriticalControl({
  critical,
  mine,
  by,
  onOpen,
  onRemove,
}: {
  critical: boolean;
  /** one of MY descriptions matched */
  mine?: boolean;
  /** who wrote the matching description, when it isn't mine */
  by?: string;
  onOpen?: () => void;
  /** mark not-critical for the current user — the trailing ✕ */
  onRemove?: () => void;
}) {
  const { t } = useTranslation();

  if (!critical) {
    if (!onOpen) return null;
    return (
      <Tooltip title={t('Describe what’s critical')}>
        <Tag
          bordered
          onClick={onOpen}
          className="crit-tag cursor-pointer m-0 color-gray-medium"
        >
          <span className="inline-flex items-center gap-1">
            <AlertTriangle size={12} strokeWidth={2} style={{ fill: 'none' }} />
            <span>{t('Mark critical')}</span>
          </span>
        </Tag>
      </Tooltip>
    );
  }

  const label = (
    <span
      className={`inline-flex items-center gap-1${onOpen ? ' cursor-pointer' : ''}`}
      onClick={onOpen}
    >
      <AlertTriangle size={12} strokeWidth={2} style={{ fill: 'none' }} />
      <span>{mine ? t('Critical for me') : t('Critical')}</span>
    </span>
  );

  return (
    <Tag color="red" bordered className="crit-tag m-0">
      <span className="inline-flex items-center gap-1">
        {/* label region — explains the match, opens the dialog */}
        {onOpen ? (
          <Tooltip
            title={
              mine
                ? t('Matches your description')
                : t('Matches {{name}}’s description', {
                    name: by ?? t('a teammate'),
                  })
            }
          >
            {label}
          </Tooltip>
        ) : (
          label
        )}
        {/* cross region — its own hover + action, no overlap with the label */}
        {onRemove && (
          <Tooltip title={t('Not critical for me')}>
            <span
              aria-label={t('Not critical for me')}
              className="inline-flex items-center cursor-pointer"
              style={{ marginLeft: 2, opacity: 0.65 }}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X size={12} />
            </span>
          </Tooltip>
        )}
      </span>
    </Tag>
  );
}
