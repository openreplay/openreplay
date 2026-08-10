import { Tag, Tooltip } from 'antd';
import { AlertTriangle, X } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const critContent = (text: string, close?: React.ReactNode) => (
  <span className="inline-flex items-center gap-1">
    <AlertTriangle size={12} strokeWidth={2} style={{ fill: 'none' }} />
    <span>{text}</span>
    {close}
  </span>
);

/* The critical flag on the detail page (antd Tag). The tag body reports state
   and opens the shared CriticalDialog (see why / describe); the trailing ✕ is a
   direct "not critical for me". Without `onOpen` it's a static red tag. */
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
          {critContent(t('Mark critical'))}
        </Tag>
      </Tooltip>
    );
  }

  // stopPropagation so clicking ✕ doesn't also open the tag's CriticalDialog
  const closeBtn = onRemove ? (
    <Tooltip title={t('Not critical for me')}>
      <span
        role="button"
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
  ) : null;

  const tag = (
    <Tag
      color="red"
      bordered
      onClick={onOpen}
      className={`crit-tag m-0${onOpen ? ' cursor-pointer' : ''}`}
    >
      {critContent(mine ? t('Critical for me') : t('Critical'), closeBtn)}
    </Tag>
  );

  if (!onOpen) return tag;

  return (
    <Tooltip
      title={
        mine
          ? t('Matches your description')
          : t('Matches {{name}}’s description', { name: by ?? t('a teammate') })
      }
    >
      {tag}
    </Tooltip>
  );
}
