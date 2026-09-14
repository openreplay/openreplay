import React from 'react';

import { flagUrl } from 'Shared/flagAssets';

interface CountryFlagProps {
  countryCode: string;
  style?: React.CSSProperties;
}

const CountryFlagIcon: React.FC<CountryFlagProps> = ({
  countryCode,
  style,
}) => {
  const url = flagUrl(countryCode);

  return url ? (
    <img src={url} alt={countryCode} style={style} loading="lazy" />
  ) : (
    <div className="text-xs bg-gray-bg px-1 rounded-sm color-white">N/A</div>
  );
};

export default CountryFlagIcon;
