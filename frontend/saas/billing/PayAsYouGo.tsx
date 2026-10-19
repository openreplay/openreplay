import { Button } from '@/ui/actions/button';
import { RangeSlider } from '@/ui/inputs/RangeSlider';
import { Calculator } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import './pay-as-you-go.css';

/** SaaS: the rate at the top of Set up billing. The estimate chooses nothing. */
export const PAYG_RATE = 5.95;
export const PAYG_RETENTION_DAYS = 30;
const PRICING_URL = 'https://openreplay.com/pricing';
const ESTIMATE_STOPS = [
  1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000,
] as const;
const usd = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function PayAsYouGo() {
  const { t } = useTranslation();
  const [estimating, setEstimating] = useState(false);
  const [stop, setStop] = useState(4);
  const sessions = ESTIMATE_STOPS[stop];
  const count = sessions.toLocaleString('en-US');
  return (
    <div className="m-payg">
      <div className="m-payg__rate">
        <span className="m-payg__price">{usd(PAYG_RATE)}</span>
        <span className="m-payg__unit">{t('per 1,000 sessions')}</span>
      </div>
      <p className="m-payg__terms">
        {t(
          'Pay only for the sessions captured. Every session is kept for {{days}} days.',
          { days: PAYG_RETENTION_DAYS },
        )}{' '}
        <a
          className="m-payg__link"
          href={PRICING_URL}
          target="_blank"
          rel="noreferrer"
        >
          {t('See pricing')}
        </a>
      </p>
      {estimating ? (
        <div className="m-payg__est">
          <div className="m-payg__est-head">
            <span className="m-payg__est-label">{t('Sessions a month')}</span>
            <span className="m-payg__est-sessions">{count}</span>
          </div>
          <RangeSlider
            value={stop}
            stops={ESTIMATE_STOPS.length}
            onChange={setStop}
            label={t('Sessions a month')}
            valueText={t('{{n}} sessions', { n: count })}
          />
          <div className="m-payg__est-total" aria-live="polite">
            <span>{t('Estimated cost')}</span>
            <span className="m-payg__est-cost">
              {t('{{cost}} a month', {
                cost: usd((sessions / 1_000) * PAYG_RATE),
              })}
            </span>
          </div>
        </div>
      ) : (
        <Button
          variant="subtle"
          size="sm"
          className="m-payg__open"
          onClick={() => setEstimating(true)}
        >
          <Calculator size={13} aria-hidden="true" />
          {t('Estimate my cost')}
        </Button>
      )}
    </div>
  );
}
