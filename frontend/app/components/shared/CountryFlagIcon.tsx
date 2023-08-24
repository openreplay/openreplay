import React from 'react';
import { hasFlag } from 'country-flag-icons';
import * as Flags from 'country-flag-icons/react/3x2';

interface CountryFlagProps {
  countryCode: string;
  style?: React.CSSProperties;
}

const CountryFlagIcon: React.FC<CountryFlagProps> = ({ countryCode, style }) => {
  if (!hasFlag(countryCode)) {
    return <p>Flag not available</p>;
  }

  const FlagComponent = Flags[countryCode as keyof typeof Flags];
  if (!FlagComponent) {
    return <p>Error rendering flag</p>;
  }

  return <FlagComponent style={style} />;
};

export default CountryFlagIcon;
