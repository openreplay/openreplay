import { Tooltip } from '@/ui/overlays/tooltip';
import { EyeOff } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const DM_DOCS =
  'https://docs.openreplay.com/en/product-analytics/data-management/';

export const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
});

export function HiddenMark() {
  const { t } = useTranslation();
  return (
    <Tooltip title={t('Hidden from search and analytics')} delay={300}>
      <span className="inline-flex">
        <EyeOff size={13} aria-hidden="true" className="m-dmg__hidden-icon" />
      </span>
    </Tooltip>
  );
}
