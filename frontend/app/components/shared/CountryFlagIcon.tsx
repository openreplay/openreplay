import React from 'react';
import { useTranslation } from 'react-i18next';

import { flagUrl } from 'Shared/flagAssets';

interface CountryFlagProps {
  countryCode: string;
  style?: React.CSSProperties;
}

const CountryFlagIcon: React.FC<CountryFlagProps> = ({
  countryCode,
  style,
}) => {
  const { t } = useTranslation();
  const url = flagUrl(countryCode);

  return url ? (
    <img src={url} alt={countryCode} style={style} loading="lazy" />
  ) : (
    <div className="text-xs bg-surface-sunken px-1 rounded-sm text-content-muted">
      {t('N/A')}
    </div>
  );
};

export default CountryFlagIcon;
