import { Chip } from '@/ui/data/Chip';
import { Tooltip } from '@/ui/overlays/tooltip';
import { Globe, Split } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface OriginBadgeProps {
  segmentName?: string;
}

export function OriginBadge({ segmentName }: OriginBadgeProps) {
  const { t } = useTranslation();
  const title = segmentName
    ? t('Found in segment: {{name}}', { name: segmentName })
    : t('Found in full traffic');
  return (
    <Tooltip title={title} delay={200}>
      <span aria-label={title} style={{ display: 'inline-flex', flex: 'none' }}>
        <Chip iconOnly tone={segmentName ? 'info' : 'neutral'}>
          {segmentName ? (
            <Split size={11} aria-hidden="true" />
          ) : (
            <Globe size={11} aria-hidden="true" />
          )}
        </Chip>
      </span>
    </Tooltip>
  );
}
