import { Button } from '@/ui/actions/button';
import { Icon } from '@/ui/icons/Icon';
import React from 'react';
import { useTranslation } from 'react-i18next';

function LongLoader({
  onClick,
  withSampling,
}: {
  onClick: () => void;
  withSampling?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-col gap-2 items-center justify-center"
      style={{ height: 240 }}
    >
      <div className="font-semibold flex gap-2 items-center">
        <Icon name="info-circle" size={16} />
        <div>{t('Processing data...')}</div>
      </div>
      <div style={{ width: 180 }}>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--m-surface-sunken)]">
          <div className="m-skeleton h-full w-2/5 rounded-full bg-[var(--m-content-accent)]" />
        </div>
      </div>
      <div>{t('This is taking longer than expected.')}</div>
      {withSampling ? (
        <>
          <div>
            {t('Use sample data to speed up query and get a faster response.')}
          </div>
          <Button onClick={onClick}>{t('Use Sample Data')}</Button>
        </>
      ) : null}
    </div>
  );
}

export default LongLoader;
