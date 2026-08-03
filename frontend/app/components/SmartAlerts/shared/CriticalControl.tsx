import { Tag, Tooltip } from 'antd';
import { AlertTriangle, X } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const critContent = (text: string, withClose = false) => (
  <span className="inline-flex items-center gap-1">
    <AlertTriangle size={12} strokeWidth={2} style={{ fill: 'none' }} />
    <span>{text}</span>
    {withClose && <X size={12} style={{ marginLeft: 2, opacity: 0.65 }} />}
  </span>
);

/* The critical flag on the detail page (antd Tag). Criticality is derived now
   (§14): the chip reports state and OPENS the shared CriticalDialog — which
   explains which description matched and whose, lets you add your own, and holds
   the "not critical for me" step. It sets nothing itself. Without `onOpen` it's
   a static red tag. */
export default function CriticalControl({
  critical,
  mine,
  by,
  onOpen,
}: {
  critical: boolean;
  /** one of MY descriptions matched */
  mine?: boolean;
  /** who wrote the matching description, when it isn't mine */
  by?: string;
  onOpen?: () => void;
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

  const tag = (
    <Tag
      color="red"
      bordered
      onClick={onOpen}
      className={`crit-tag m-0${onOpen ? ' cursor-pointer' : ''}`}
    >
      {critContent(
        mine ? t('Critical for me') : t('Critical'),
        Boolean(onOpen),
      )}
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
