import { Button } from '@/ui/actions/button';
import { Loader } from '@/ui/feedback/Loader';
import React from 'react';
import { useTranslation } from 'react-i18next';

/** The app's loader in the chart's height; past four seconds, one more line
 *  and the faster way where sampling exists. No bar: a query's progress is
 *  not something we can know. */
function ChartLoading({
  height = 240,
  slow,
  onSample,
}: {
  height?: number;
  slow?: boolean;
  onSample?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 p-5"
      style={{ minHeight: height }}
    >
      <Loader loading style={{}} />
      {slow ? (
        <div className="m-step-in flex flex-col items-center gap-2">
          <p className="text-xs text-content-muted">
            {t('A long window takes longer.')}
          </p>
          {onSample ? (
            <Button variant="subtle" size="sm" onClick={onSample}>
              {t('Use sample data')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default ChartLoading;
